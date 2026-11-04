import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

const WORKBOOK_PROCESS_MEMORY_LIMIT = 512 * 1024 * 1024;
const MAX_WORKBOOK_RESULT_SIZE = 32 * 1024 * 1024;
const MAX_WORKBOOK_ERROR_SIZE = 16 * 1024;
const WORKBOOK_PARSE_TIMEOUT_MS = 60_000;
const MAX_CONCURRENT_WORKBOOK_PARSERS = 1;

let activeWorkbookParsers = 0;

export class WorkbookParserBusyError extends Error {
  constructor() {
    super("Workbook parsing is busy. Please try again later.");
    this.name = "WorkbookParserBusyError";
  }
}

export interface ParsedServiceMaintenanceWorksheet {
  sheetName?: string;
  sheetRef?: string;
  date1904: boolean;
  cells: Array<[string, unknown]>;
}

const WINDOWS_JOB_RUNNER = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$configJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__CONFIG__'))
$config = ConvertFrom-Json -InputObject $configJson
$jobSource = @'
using System;
using System.Runtime.InteropServices;

public static class WorkbookJob
{
    [StructLayout(LayoutKind.Sequential)]
    public struct BasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IoCounters
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct ExtendedLimitInformation
    {
        public BasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr job,
        int informationClass,
        ref ExtendedLimitInformation information,
        uint informationLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr handle);

    public static IntPtr CreateLimitedJob(ulong memoryLimit)
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) return IntPtr.Zero;

        ExtendedLimitInformation information = new ExtendedLimitInformation();
        // Enforce process and job memory ceilings and kill the parser when the job closes.
        information.BasicLimitInformation.LimitFlags = 0x2300;
        information.ProcessMemoryLimit = new UIntPtr(memoryLimit);
        information.JobMemoryLimit = new UIntPtr(memoryLimit);

        if (!SetInformationJobObject(
            job,
            9,
            ref information,
            (uint)Marshal.SizeOf(typeof(ExtendedLimitInformation))))
        {
            CloseHandle(job);
            return IntPtr.Zero;
        }
        return job;
    }
}
'@
Add-Type -TypeDefinition $jobSource
$payload = [Console]::In.ReadToEnd()
$job = [WorkbookJob]::CreateLimitedJob([UInt64]$config.memoryLimit)
if ($job -eq [IntPtr]::Zero) {
    throw "Unable to create a memory-limited workbook process"
}

$process = New-Object System.Diagnostics.Process
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $config.executable
$startInfo.Arguments = (($config.arguments | ForEach-Object { '"' + $_ + '"' }) -join ' ')
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardInput = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$process.StartInfo = $startInfo
try {
    if (-not $process.Start()) {
        throw "Unable to start the workbook parser"
    }
    if (-not [WorkbookJob]::AssignProcessToJobObject($job, $process.Handle)) {
        $process.Kill()
        throw "Unable to apply the workbook parser memory limit"
    }

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write($payload)
    $process.StandardInput.Close()
    $process.WaitForExit()
    [Console]::Out.Write($stdoutTask.GetAwaiter().GetResult())
    [Console]::Error.Write($stderrTask.GetAwaiter().GetResult())
    exit $process.ExitCode
}
finally {
    $process.Dispose()
    [WorkbookJob]::CloseHandle($job) | Out-Null
}
`;

function getWorkerArguments(): string[] {
  const isTypeScript = __filename.endsWith(".ts");
  const workerPath = path.resolve(
    __dirname,
    "..",
    "workers",
    `parseServiceMaintenanceWorkbook.${isTypeScript ? "ts" : "js"}`,
  );
  if (!existsSync(workerPath)) {
    throw new Error("Workbook parser worker is missing");
  }

  return [
    "--max-old-space-size=384",
    ...(isTypeScript ? ["-r", require.resolve("ts-node/register")] : []),
    workerPath,
  ];
}

export function parseServiceMaintenanceWorkbook(
  fileBuffer: Buffer,
): Promise<ParsedServiceMaintenanceWorksheet> {
  if (process.platform !== "win32") {
    return Promise.reject(
      new Error("Isolated workbook parsing is only configured for Windows"),
    );
  }

  const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
  const powershellPath = path.join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  if (!existsSync(powershellPath)) {
    return Promise.reject(new Error("Windows PowerShell is unavailable"));
  }

  if (activeWorkbookParsers >= MAX_CONCURRENT_WORKBOOK_PARSERS) {
    return Promise.reject(new WorkbookParserBusyError());
  }

  const config = Buffer.from(
    JSON.stringify({
      executable: process.execPath,
      arguments: getWorkerArguments(),
      memoryLimit: WORKBOOK_PROCESS_MEMORY_LIMIT,
    }),
    "utf8",
  ).toString("base64");
  const command = WINDOWS_JOB_RUNNER.replace("__CONFIG__", config);
  const encodedCommand = Buffer.from(command, "utf16le").toString("base64");
  activeWorkbookParsers += 1;

  try {
    const child = spawn(
      powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-OutputFormat",
        "Text",
        "-InputFormat",
        "Text",
        "-EncodedCommand",
        encodedCommand,
      ],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );

    return new Promise((resolve, reject) => {
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let stdoutSize = 0;
      let stderrSize = 0;
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;

      const finish = (
        error?: Error,
        worksheet?: ParsedServiceMaintenanceWorksheet,
      ) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        if (error) reject(error);
        else if (worksheet) resolve(worksheet);
        else reject(new Error("Workbook parser returned no worksheet data"));
      };

      try {
        timeout = setTimeout(() => {
          child.kill();
          finish(new Error("Workbook parsing exceeded the time limit"));
        }, WORKBOOK_PARSE_TIMEOUT_MS);

        child.once("close", (code, signal) => {
          activeWorkbookParsers -= 1;
          if (settled) return;
          if (code !== 0) {
            const detail = Buffer.concat(stderr).toString("utf8").trim();
            finish(
              new Error(
                detail ||
                  `Workbook parser exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
              ),
            );
            return;
          }

          try {
            finish(
              undefined,
              JSON.parse(
                Buffer.concat(stdout).toString("utf8"),
              ) as ParsedServiceMaintenanceWorksheet,
            );
          } catch {
            finish(new Error("Workbook parser returned invalid data"));
          }
        });

        child.stdout.on("data", (chunk: Buffer) => {
          stdoutSize += chunk.length;
          if (stdoutSize > MAX_WORKBOOK_RESULT_SIZE) {
            child.kill();
            finish(new Error("Parsed worksheet exceeds the supported size"));
            return;
          }
          stdout.push(chunk);
        });
        child.stderr.on("data", (chunk: Buffer) => {
          if (stderrSize >= MAX_WORKBOOK_ERROR_SIZE) return;
          const limitedChunk = chunk.subarray(
            0,
            MAX_WORKBOOK_ERROR_SIZE - stderrSize,
          );
          stderrSize += limitedChunk.length;
          stderr.push(limitedChunk);
        });
        child.once("error", (error) => finish(error));

        child.stdin.on("error", (error) => finish(error));
        child.stdin.end(fileBuffer.toString("base64"), "utf8");
      } catch (error) {
        child.kill();
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  } catch (error) {
    activeWorkbookParsers -= 1;
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

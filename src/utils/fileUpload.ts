import multer from "multer";
import fs from "fs";
import path from "path";
import { AppError } from "./errors";

const uploadPath = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });
export const imageUpload = multer({
  storage,
  fileFilter(_req, file, callback) {
    const supportedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!supportedImageTypes.includes(file.mimetype)) {
      callback(
        new AppError("Only JPEG, PNG, GIF, or WEBP images are allowed", 400),
      );
      return;
    }
    callback(null, true);
  },
});

/** Turns a stored upload path into an absolute public URL using `API_URL`. */
export function toPublicFileUrl(filePath?: string | null): string | null {
  if (filePath == null) {
    return null;
  }

  const value = String(filePath).trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const base = (process.env.API_URL || "").replace(/\/$/, "");
  const publicPath = value.startsWith("/") ? value : `/${value}`;
  return base ? `${base}${publicPath}` : publicPath;
}

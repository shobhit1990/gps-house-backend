import bcrypt from "bcrypt";
import { scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function isBcryptPasswordHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (isBcryptPasswordHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }

  return verifyScryptPassword(password, storedHash);
}

function verifyScryptPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, hash, extra] = storedHash.split(":");
  if (
    extra !== undefined ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !/^[a-f0-9]{128}$/i.test(hash)
  ) {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(timingSafeEqual(Buffer.from(hash, "hex"), derivedKey));
    });
  });
}

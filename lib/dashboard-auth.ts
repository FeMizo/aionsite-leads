import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getPrismaClient } from "@/lib/db";

const scrypt = promisify(scryptCallback);

export async function getDashboardCredential() {
  return getPrismaClient().dashboardCredential.findUnique({ where: { id: 1 } });
}

export async function hashDashboardPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyDashboardPassword(password: string, storedHash: string) {
  const [, salt, expectedHex] = storedHash.split("$");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

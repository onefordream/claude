export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  nonce?: string;
  values?: Record<string, string>;
} | null;

export function fail(error: string, fieldErrors?: Record<string, string>, values?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors, values };
}
export function done(message?: string): ActionState {
  return { ok: true, message, nonce: String(Date.now()) };
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}
export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

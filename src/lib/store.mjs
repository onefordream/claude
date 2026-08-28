// ============================================================================
// store.mjs — エントリー / お問い合わせ の永続化（依存パッケージなし）
//
// data/store/*.json をファイルベースの簡易データストアとして使用する。
// Node は単一スレッドのイベントループで動くため、同期 read-modify-write を
// ハンドラ内で完結させることで、この規模（最大160件程度）の同時アクセスに
// 対する競合を避けている。
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_DIR = path.resolve(__dirname, "../../data/store");
const ENTRIES_FILE = path.join(STORE_DIR, "entries.json");
const CONTACTS_FILE = path.join(STORE_DIR, "contacts.json");

function ensureFile(file, fallback) {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
}

function readJson(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureFile(file, []);
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// --- Entries -----------------------------------------------------------

export const CAPACITY = { pro: 40, amateur: 120 };
export const ENTRY_DEADLINE = "2026-11-30";

export function readEntries() {
  return readJson(ENTRIES_FILE, []);
}

export function getCapacityStatus() {
  const entries = readEntries();
  const result = {};
  for (const category of ["pro", "amateur"]) {
    const confirmed = entries.filter((e) => e.category === category && e.status === "confirmed").length;
    const waitlist = entries.filter((e) => e.category === category && e.status === "waitlist").length;
    const capacity = CAPACITY[category];
    result[category] = {
      capacity,
      confirmed,
      remaining: Math.max(capacity - confirmed, 0),
      waitlist,
      full: confirmed >= capacity,
    };
  }
  const deadlinePassed = new Date() > new Date(`${ENTRY_DEADLINE}T23:59:59+09:00`);
  result.deadline = ENTRY_DEADLINE;
  result.deadlinePassed = deadlinePassed;
  return result;
}

/**
 * @param {{category:"pro"|"amateur", name:string, kana:string, email:string,
 *   phone:string, companion:string, agreed:boolean}} input
 */
export function submitEntry(input) {
  const status = getCapacityStatus();
  const category = input.category;

  if (status.deadlinePassed && !status[category].full) {
    return { ok: false, reason: "closed" };
  }

  const willWaitlist = status[category].full;

  const entries = readEntries();
  const record = {
    id: crypto.randomUUID(),
    category,
    status: willWaitlist ? "waitlist" : "confirmed",
    name: input.name,
    kana: input.kana,
    email: input.email,
    phone: input.phone,
    companion: input.companion || "",
    agreed: true,
    createdAt: new Date().toISOString(),
  };
  entries.push(record);
  writeJson(ENTRIES_FILE, entries);

  return { ok: true, status: record.status, id: record.id };
}

// --- Contacts ------------------------------------------------------------

export function readContacts() {
  return readJson(CONTACTS_FILE, []);
}

export function submitContact(input) {
  const contacts = readJson(CONTACTS_FILE, []);
  const record = {
    id: crypto.randomUUID(),
    type: input.type,
    name: input.name,
    email: input.email,
    phone: input.phone || "",
    message: input.message,
    createdAt: new Date().toISOString(),
  };
  contacts.push(record);
  writeJson(CONTACTS_FILE, contacts);
  return { ok: true, id: record.id };
}

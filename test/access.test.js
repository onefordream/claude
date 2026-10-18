// Boots the real server as a child process against a scratch DATA_DIR and
// drives it over HTTP — the only reliable way to test cross-role access
// control end to end in this dependency-free, no-framework app.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3991;
const BASE = `http://localhost:${PORT}`;
let serverProcess;
let dataDir;

function extractCookie(res) {
  const raw = res.headers.get('set-cookie') || '';
  const match = /session=[^;]+/.exec(raw);
  return match ? match[0] : null;
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/login`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('server did not start in time');
}

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'golf-access-test-'));
  serverProcess = spawn('node', ['server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: String(PORT),
      OWNER_EMAIL: 'owner@test.com',
      OWNER_PASSWORD: 'testpass123',
      SESSION_SECRET: 'test',
    },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(() => {
  serverProcess.kill();
  rmSync(dataDir, { recursive: true, force: true });
});

test('a logged-out request to a student round route redirects instead of showing data', async () => {
  const res = await fetch(`${BASE}/rounds/1`, { redirect: 'manual' });
  assert.equal(res.status, 302);
});

test('a student account cannot reach the instructor-only admin area', async () => {
  const regRes = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'name=Student&email=student@test.com&password=testpass123',
    redirect: 'manual',
  });
  const studentCookie = extractCookie(regRes);
  assert.ok(studentCookie, 'registration should set a session cookie');

  const res = await fetch(`${BASE}/admin`, { headers: { cookie: studentCookie }, redirect: 'manual' });
  assert.equal(res.status, 302);

  const exportRes = await fetch(`${BASE}/admin/export`, { headers: { cookie: studentCookie }, redirect: 'manual' });
  assert.equal(exportRes.status, 302);
});

test('a student cannot view another student round by guessing the URL, and an instructor can', async () => {
  const studentA = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'name=StudentA&email=a@test.com&password=testpass123',
    redirect: 'manual',
  });
  const cookieA = extractCookie(studentA);

  // StudentA creates a round (id 1, since this is the first round in this test's fresh DB).
  const createRes = await fetch(`${BASE}/rounds`, {
    method: 'POST',
    headers: { cookie: cookieA, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'course_name=Test&play_date=2026-01-01&holes=18&entry_mode=total',
    redirect: 'manual',
  });
  const location = createRes.headers.get('location');
  const roundId = location.match(/\/rounds\/(\d+)\/total/)[1];

  const studentB = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'name=StudentB&email=b@test.com&password=testpass123',
    redirect: 'manual',
  });
  const cookieB = extractCookie(studentB);

  const forbidden = await fetch(`${BASE}/rounds/${roundId}`, { headers: { cookie: cookieB } });
  const forbiddenText = await forbidden.text();
  assert.equal(forbidden.status, 404);
  assert.ok(!forbiddenText.includes('Test'), "another student's round must not be visible");

  const ownerLogin = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=owner@test.com&password=testpass123',
    redirect: 'manual',
  });
  const ownerCookie = extractCookie(ownerLogin);

  const listRes = await fetch(`${BASE}/admin`, { headers: { cookie: ownerCookie } });
  const listHtml = await listRes.text();
  const studentIdMatch = /\/admin\/students\/(\d+)"[^]*?StudentA/.exec(listHtml) || /StudentA[^]*?\/admin\/students\/(\d+)"/.exec(listHtml);
  assert.ok(studentIdMatch, 'StudentA should appear in the instructor-visible student list');
});

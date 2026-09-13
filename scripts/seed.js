// Demo data seeder — creates a sample student with lesson/round history so the
// app can be tried out immediately. Safe to run multiple times (skips if the
// demo student already exists).
import { loadEnv } from '../src/lib/env.js';
loadEnv();

import { run, get } from '../src/db.js';
import { createUser, findUserByEmail } from '../src/auth.js';

const DEMO_EMAIL = 'demo.student@example.com';

function main() {
  let student = findUserByEmail(DEMO_EMAIL);
  if (!student) {
    const id = createUser({
      name: 'テスト太郎',
      email: DEMO_EMAIL,
      password: 'password123',
      role: 'student',
    });
    student = get(`SELECT * FROM users WHERE id = ?`, [id]);
    console.log(`[seed] demo student created: ${DEMO_EMAIL} / password123`);
  } else {
    console.log('[seed] demo student already exists, skipping user creation');
  }

  const existingRecords = get(`SELECT COUNT(*) AS c FROM lesson_records WHERE user_id = ?`, [student.id]).c;
  if (existingRecords === 0) {
    const records = [
      {
        date: daysAgo(21),
        content:
          'ドライバーのグリップを見直した。今までよりウィークグリップに近づけて、フェースが開きにくいようにコーチと確認しながら素振りを繰り返した。',
        notes: '最初は違和感があったが、後半は自然に握れるようになってきた。',
      },
      {
        date: daysAgo(14),
        content:
          'アイアンのダウンスイングで体重移動を意識。右足から左足への体重移動のタイミングが早すぎるとの指摘を受け、動画を見ながら修正した。',
        notes: '夕方になると疲れて右肩が開きやすい。',
      },
      {
        date: daysAgo(7),
        content: 'アプローチの距離感を練習。30ヤード、50ヤードの2種類の振り幅を体に覚えさせる反復練習をした。',
        notes: '',
      },
    ];
    for (const r of records) {
      run(`INSERT INTO lesson_records (user_id, record_date, content, notes) VALUES (?, ?, ?, ?)`, [
        student.id,
        r.date,
        r.content,
        r.notes || null,
      ]);
    }
    console.log(`[seed] created ${records.length} demo lesson records`);
  } else {
    console.log('[seed] demo student already has lesson records, skipping');
  }

  const existingRounds = get(`SELECT COUNT(*) AS c FROM round_records WHERE user_id = ?`, [student.id]).c;
  if (existingRounds === 0) {
    run(
      `INSERT INTO round_records (user_id, round_date, course_name, score, issues, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [student.id, daysAgo(10), '○○カントリークラブ', 98, 'ドライバーが左に引っかかることが多かった', '後半に集中力が切れた']
    );
    console.log('[seed] created 1 demo round record');
  } else {
    console.log('[seed] demo student already has round records, skipping');
  }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

main();

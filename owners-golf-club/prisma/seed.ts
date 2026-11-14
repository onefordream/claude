/**
 * seed: 管理者アカウントとサンプルデータを作成する。
 * 管理者のメール・パスワードは環境変数（SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD）から受け取る。
 * サンプルデータはすべて名称に「【サンプル】」を含み、isSample=true を付与する。
 * 実在のゴルフ場名・優待額・商品価格は使用しない。
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL と SEED_ADMIN_PASSWORD を設定してください");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD は12文字以上にしてください");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: "運営管理者", role: "ADMIN", status: "ACTIVE", emailVerifiedAt: new Date() },
    update: { passwordHash, role: "ADMIN" },
  });
  console.log(`admin: ${email}`);

  if (process.env.SEED_SAMPLE_DATA === "false") return;
  if ((await prisma.event.count({ where: { isSample: true } })) > 0) {
    console.log("sample data already exists, skipped");
    return;
  }

  const inDays = (d: number, h = 8) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    t.setHours(h, 0, 0, 0);
    return t;
  };

  await prisma.event.createMany({
    data: [
      { title: "【サンプル】関西 月例ラウンド", region: "KANSAI", venue: "【サンプル】関西エリアのゴルフ場（未確定）", startsAt: inDays(30), capacity: 12, feeNote: "未確定", withCaddie: true, published: true, isSample: true, description: "サンプルのイベントです。開催コース・参加費は未確定です。" },
      { title: "【サンプル】関東 月例ラウンド", region: "KANTO", venue: "【サンプル】関東エリアのゴルフ場（未確定）", startsAt: inDays(45), capacity: 12, feeNote: "未確定", withCaddie: true, published: true, isSample: true, description: "サンプルのイベントです。開催コース・参加費は未確定です。" },
    ],
  });

  await prisma.partnerCourse.createMany({
    data: [
      { type: "GOLF_COURSE", name: "【サンプル】提携ゴルフ場A", region: "KANSAI", prefecture: "（未確定）", description: "サンプルの提携ゴルフ場です。", benefit: "【未確定】", howToUse: "【未確定】", published: true, isSample: true, sortOrder: 1 },
      { type: "GOLF_COURSE", name: "【サンプル】提携ゴルフ場B", region: "KANTO", prefecture: "（未確定）", description: "サンプルの提携ゴルフ場です。", benefit: "【未確定】", howToUse: "【未確定】", published: true, isSample: true, sortOrder: 2 },
      { type: "MAKER", name: "【サンプル】提携メーカーA", region: "OTHER", description: "サンプルの提携メーカーです。", benefit: "【未確定】", howToUse: "【未確定】", published: true, isSample: true, sortOrder: 3 },
    ],
  });

  await prisma.product.createMany({
    data: [
      { name: "【サンプル】オリジナルゴルフボール", description: "サンプル商品です。価格は仮の値で、実在の価格ではありません。", price: 1000, stock: 50, published: true, isSample: true },
      { name: "【サンプル】オリジナルキャップ", description: "サンプル商品です。価格は仮の値で、実在の価格ではありません。", price: 1000, stock: 20, published: true, isSample: true },
    ],
  });

  await prisma.content.createMany({
    data: [
      { kind: "SEMINAR", title: "【サンプル】経営×AI 勉強会", description: "サンプルの勉強会です。内容・日程は未確定です。", scheduledAt: inDays(20, 19), location: "未確定", published: true, isSample: true },
      { kind: "ARCHIVE", title: "【サンプル】録画アーカイブ", description: "サンプルのアーカイブです。録画URLは未設定です。", published: true, isSample: true },
    ],
  });

  await prisma.notice.create({
    data: { title: "【サンプル】会員エリアを公開しました", body: "サンプルのお知らせです。", published: true, isSample: true },
  });

  console.log("sample data created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

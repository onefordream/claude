import { describe, expect, it } from "vitest";
import { levelForXp, levelProgress, LEVELS } from "@/lib/game/levels";
import { dayDiff, nextStreak, periodStartsUtc, dateInTz } from "@/lib/game/dates";
import { generateLogo, initialsFor, isValidLogo } from "@/lib/game/logo";
import { computeBadges } from "@/lib/game/badges";
import { EMPLOYEE_TEMPLATES, CAPABILITIES, STARTER_ROLES } from "@/lib/game/employees";
import fs from "node:fs";

describe("levels", () => {
  it("maps xp to level at thresholds", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(79)).toBe(1);
    expect(levelForXp(80)).toBe(2);
    expect(levelForXp(680)).toBe(5);
    expect(levelForXp(999999)).toBe(10);
  });
  it("reports progress to next level", () => {
    const p = levelProgress(40);
    expect(p.level).toBe(1);
    expect(p.ratio).toBeCloseTo(0.5);
    expect(p.toNext).toBe(40);
    expect(levelProgress(5000).nextTitle).toBeNull();
  });
  it("SQL level_for_xp uses the same thresholds as the app", () => {
    const sql = fs.readFileSync("supabase/migrations/0001_init.sql", "utf8");
    for (const l of LEVELS.slice(1)) expect(sql).toContain(`when p_xp >= ${l.xp} then ${l.level}`);
  });
});

describe("dates & streak", () => {
  it("computes day differences", () => {
    expect(dayDiff("2026-11-13", "2026-11-14")).toBe(1);
    expect(dayDiff("2026-12-31", "2027-01-01")).toBe(1);
  });
  it("updates streaks", () => {
    expect(nextStreak(null, "2026-11-13", 0)).toEqual({ streak: 1, isNewDay: true });
    expect(nextStreak("2026-11-12", "2026-11-13", 4)).toEqual({ streak: 5, isNewDay: true });
    expect(nextStreak("2026-11-10", "2026-11-13", 4)).toEqual({ streak: 1, isNewDay: true });
    expect(nextStreak("2026-11-13", "2026-11-13", 4)).toEqual({ streak: 4, isNewDay: false });
  });
  it("finds JST day start in UTC", () => {
    const now = new Date("2026-11-13T16:30:00Z"); // JST 2026-11-14 01:30
    expect(dateInTz("Asia/Tokyo", now)).toBe("2026-11-14");
    const p = periodStartsUtc("Asia/Tokyo", now);
    expect(p.dayStart).toBe("2026-11-13T15:00:00.000Z");
    expect(p.monthStart).toBe("2026-10-31T15:00:00.000Z");
  });
});

describe("logo", () => {
  it("is deterministic and valid", () => {
    const a = generateLogo("ミライクラフト");
    expect(generateLogo("ミライクラフト")).toEqual(a);
    expect(isValidLogo(a)).toBe(true);
    expect(isValidLogo({ ...a, primary: "red" })).toBe(false);
  });
  it("derives initials", () => {
    expect(initialsFor("Dream Start")).toBe("DS");
    expect(initialsFor("株式会社ミライ")).toBe("ミ");
    expect(initialsFor("NEXT1")).toBe("NE");
  });
});

describe("badges", () => {
  it("only awards badges backed by data", () => {
    const b = computeBadges({ level: 1, streak: 1, completedMissions: 0, artifacts: 0, meetings: 0 });
    expect(b.filter((x) => x.earned).map((x) => x.id)).toEqual(["founder"]);
    const c = computeBadges({ level: 5, streak: 7, completedMissions: 10, artifacts: 1, meetings: 1 });
    expect(c.every((x) => x.earned)).toBe(true);
  });
});

describe("employees", () => {
  it("has 3 starter roles with distinct capabilities", () => {
    expect(STARTER_ROLES).toEqual(["secretary", "planner", "marketer"]);
    for (const r of STARTER_ROLES) {
      const t = EMPLOYEE_TEMPLATES.find((x) => x.id === r)!;
      expect(t.isAvailable).toBe(true);
      expect(t.capabilities.length).toBe(3);
      for (const c of t.capabilities) expect(CAPABILITIES[c].role).toBe(r);
    }
  });
  it("matches template ids seeded in SQL", () => {
    const sql = fs.readFileSync("supabase/migrations/0001_init.sql", "utf8");
    for (const t of EMPLOYEE_TEMPLATES) expect(sql).toContain(`('${t.id}','${t.role}','${t.defaultName}'`);
  });
});

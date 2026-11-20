// 弾道シミュレーション（空気抵抗 + マグヌス揚力 + スピン減衰）
// 単位: m, s, rad。表示用にヤード変換関数あり。
const MASS = 0.04593;       // kg
const DIAM = 0.04267;       // m
const R = DIAM / 2;
const AREA = Math.PI * R * R;
const RHO = 1.204;          // kg/m^3（20℃・海抜0m）
const G = 9.81;

export const M_TO_YD = 1.09361;
export const BALL_DIAMETER_M = DIAM;

function coeffs(v, omega) {
  const S = (R * omega) / Math.max(v, 1); // スピン比
  // 係数はPGAツアー平均（Dr/3W/7I/PW）のキャリーに合わせて調整済み
  const cd = 0.22 + 0.2 * S;
  const cl = Math.min(0.25, 1.6 * S);
  return { cd, cl };
}

/**
 * @param {number} speed  ボール初速 m/s
 * @param {number} launchDeg 打ち出し角（度）
 * @param {number} spinRpm バックスピン rpm
 * @returns {{carry:number, apex:number, flight:number, landAngle:number, path:Array<[number,number]>}}
 */
export function simulate(speed, launchDeg, spinRpm) {
  const dt = 0.005;
  let x = 0, y = 0;
  const a = (launchDeg * Math.PI) / 180;
  let vx = speed * Math.cos(a), vy = speed * Math.sin(a);
  let omega = (spinRpm * 2 * Math.PI) / 60;
  let t = 0, apex = 0;
  const path = [[0, 0]];
  while (t < 15) {
    const v = Math.hypot(vx, vy);
    const { cd, cl } = coeffs(v, omega);
    const k = (0.5 * RHO * AREA) / MASS;
    // 抗力は速度と逆向き、揚力は速度に垂直（上向き側）
    const ax = -k * cd * v * vx - k * cl * v * vy;
    const ay = -k * cd * v * vy + k * cl * v * vx - G;
    vx += ax * dt; vy += ay * dt;
    const nx = x + vx * dt, ny = y + vy * dt;
    t += dt;
    omega *= 1 - 0.035 * dt; // スピン減衰 約3.5%/s
    if (ny < 0) {
      const f = y / (y - ny);
      x = x + (nx - x) * f; y = 0;
      path.push([x, 0]);
      break;
    }
    x = nx; y = ny;
    apex = Math.max(apex, y);
    if (path.length < 400 && Math.round(t / dt) % 6 === 0) path.push([x, y]);
  }
  const landAngle = (Math.atan2(-vy, vx) * 180) / Math.PI;
  return { carry: x, apex, flight: t, landAngle, path };
}

/** 指定初速・スピンで最大キャリーになる打ち出し角を探す */
export function optimalLaunch(speed, spinRpm, min = 6, max = 35) {
  let best = { deg: min, carry: 0 };
  for (let d = min; d <= max; d += 0.5) {
    const c = simulate(speed, d, spinRpm).carry;
    if (c > best.carry) best = { deg: d, carry: c };
  }
  return best;
}

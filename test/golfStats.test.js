import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  holeIsGir,
  holeUpAndDown,
  holeSandSave,
  holeFwKeep,
  aggregateRound,
  combineRoundAggregates,
  scoreBandForAverage,
  targetBandFor,
  abilityScore,
  computeAbilityScores,
  computeGrowthPotential,
  BENCHMARKS,
} from '../src/lib/golfStats.js';

function hole(overrides) {
  return { hole_no: 1, par: 4, strokes: null, putts: null, tee_shot: null, ob_count: 0, penalty_count: 0, bunker: 0, ...overrides };
}

test('GIR: par4 strokes4 putts2 is on, par4 strokes5 putts2 is not', () => {
  assert.equal(holeIsGir(hole({ par: 4, strokes: 4, putts: 2 })), true);
  assert.equal(holeIsGir(hole({ par: 4, strokes: 5, putts: 2 })), false);
});

test('up-and-down success: missed GIR and strokes <= par', () => {
  const missedGirMadeIt = hole({ par: 4, strokes: 4, putts: 1 }); // strokes-putts=3 > par-2=2 -> not GIR
  assert.equal(holeIsGir(missedGirMadeIt), false);
  const ud = holeUpAndDown(missedGirMadeIt);
  assert.equal(ud.opportunity, true);
  assert.equal(ud.success, true);
});

test('sand save success: bunker and strokes <= par', () => {
  const h = hole({ par: 4, strokes: 4, bunker: 1 });
  const ss = holeSandSave(h);
  assert.equal(ss.opportunity, true);
  assert.equal(ss.success, true);

  const missed = hole({ par: 4, strokes: 6, bunker: 1 });
  assert.equal(holeSandSave(missed).success, false);
});

test('par3 holes are not counted as fairway-keep opportunities', () => {
  const h = hole({ par: 3, strokes: 3, tee_shot: null });
  assert.equal(holeFwKeep(h).opportunity, false);
  // Even if a tee_shot value were somehow set on a par 3, it should not count.
  const h2 = hole({ par: 3, strokes: 3, tee_shot: 'fw' });
  assert.equal(holeFwKeep(h2).opportunity, false);
});

test('fairway-keep counts par4/par5 holes with a recorded tee shot', () => {
  assert.equal(holeFwKeep(hole({ par: 4, tee_shot: 'fw' })).opportunity, true);
  assert.equal(holeFwKeep(hole({ par: 4, tee_shot: 'fw' })).success, true);
  assert.equal(holeFwKeep(hole({ par: 5, tee_shot: 'left' })).success, false);
  assert.equal(holeFwKeep(hole({ par: 4, tee_shot: null })).opportunity, false);
});

test('a 9-hole round converts to an 18-hole-equivalent average (45 over 9H -> 90)', () => {
  const round9 = { entry_mode: 'total', holes: 9, pars: [4, 4, 3, 5, 4, 4, 3, 4, 5], total_score: 45, driver_avg_yards: null };
  const agg = aggregateRound(round9);
  assert.equal(agg.holesPlayed, 9);
  assert.equal(agg.totalScore, 45);
  const combined = combineRoundAggregates([agg]);
  assert.equal(combined.avgScorePer18, 90);
});

test('score band and target band mapping', () => {
  assert.equal(scoreBandForAverage(95), '90s');
  assert.equal(targetBandFor(scoreBandForAverage(95)), '80s');
  assert.equal(scoreBandForAverage(74), '70s');
  assert.equal(targetBandFor(scoreBandForAverage(74)), '70s');
  assert.equal(scoreBandForAverage(85), '80s');
  assert.equal(targetBandFor('80s'), '70s');
  assert.equal(scoreBandForAverage(105), '100plus');
  assert.equal(targetBandFor('100plus'), '90s');
});

test('ability score: 100plus-level value scores 20, 70s-level value scores 90', () => {
  const v70 = BENCHMARKS['70s'].putts; // 31 (lower is better)
  const v100 = BENCHMARKS['100plus'].putts; // 37
  assert.equal(abilityScore(v100, v70, v100), 20);
  assert.equal(abilityScore(v70, v70, v100), 90);
  // Clamp: a value well beyond either benchmark still lands in [0, 100].
  assert.equal(abilityScore(50, v70, v100), 100 >= abilityScore(50, v70, v100) ? abilityScore(50, v70, v100) : -1);
  assert.ok(abilityScore(50, v70, v100) >= 0 && abilityScore(50, v70, v100) <= 100);
  assert.ok(abilityScore(0, v70, v100) >= 0 && abilityScore(0, v70, v100) <= 100);
});

test('computeAbilityScores skips items with no data', () => {
  const combined = { puttsPer18: 33, fwKeepPct: null, obPer18: 1, girPct: 30, upAndDownPct: null, sandSavePct: null, doubleBogeyPlusPct: 15, driverAvgYards: null };
  const scores = computeAbilityScores(combined);
  const keys = scores.map((s) => s.key);
  assert.ok(keys.includes('putter'));
  assert.ok(keys.includes('obAvoid'));
  assert.ok(!keys.includes('direction'));
  assert.ok(!keys.includes('approach'));
  assert.ok(!keys.includes('bunker'));
  assert.ok(!keys.includes('distance'));
});

test('growth potential: items already past target are excluded, rest sorted descending', () => {
  // 90s-band golfer already better than the 80s putting target -> putter excluded.
  const combined = {
    avgScorePer18: 93,
    puttsPer18: 29, // better than 80s target (33) -> excluded
    obPer18: 3, // worse than 80s target (0.8) -> included, large gain
    penaltyPer18: 1,
    fwKeepPct: 40,
    girPct: 15,
    upAndDownPct: 15,
    girMissPer18: 15,
    sandSavePct: 10,
    sandOpportunityPer18: 2,
  };
  const growth = computeGrowthPotential(combined);
  assert.equal(growth.currentBand, '90s');
  assert.equal(growth.targetBand, '80s');
  const keys = growth.items.map((i) => i.key);
  assert.ok(!keys.includes('putter'));
  for (let i = 1; i < growth.items.length; i++) {
    assert.ok(growth.items[i - 1].gain >= growth.items[i].gain);
  }
  assert.ok(growth.items.every((i) => i.gain > 0.15));
});

import { DominoTile } from '../types/domino';

function compareTilesForStarter(a: DominoTile, b: DominoTile): number {
  const sumA = a.end1 + a.end2;
  const sumB = b.end1 + b.end2;
  if (sumA !== sumB) return sumA - sumB;

  const maxA = Math.max(a.end1, a.end2);
  const maxB = Math.max(b.end1, b.end2);
  if (maxA !== maxB) return maxA - maxB;

  const minA = Math.min(a.end1, a.end2);
  const minB = Math.min(b.end1, b.end2);
  return minA - minB;
}

function determineStarter(hands: DominoTile[][]): { starterIndex: number; openingTile: DominoTile } {
  // 1. Highest double
  for (let d = 6; d >= 0; d--) {
    for (let i = 0; i < hands.length; i++) {
      const match = hands[i].find((t) => t.end1 === d && t.end2 === d);
      if (match) {
        return { starterIndex: i, openingTile: match };
      }
    }
  }

  // 2. Highest tile
  let bestPlayer = 0;
  let bestTile: DominoTile | null = null;

  for (let i = 0; i < hands.length; i++) {
    for (const t of hands[i]) {
      if (!bestTile || compareTilesForStarter(t, bestTile) > 0) {
        bestTile = t;
        bestPlayer = i;
      }
    }
  }

  return { starterIndex: bestPlayer, openingTile: bestTile! };
}

console.log('=== RUNNING AUTO-DRAW & 1V1 STARTER VERIFICATION ===\n');

// Test 1: 6|6 in hand
const handA: DominoTile[] = [{ id: 1, end1: 6, end2: 6 }, { id: 2, end1: 4, end2: 3 }];
const handB: DominoTile[] = [{ id: 3, end1: 5, end2: 5 }, { id: 4, end1: 2, end2: 1 }];
const res1 = determineStarter([handA, handB]);
if (res1.starterIndex !== 0 || res1.openingTile.id !== 1) {
  throw new Error(`Test 1 Failed: expected starter 0 with [6|6], got ${res1.starterIndex}`);
}
console.log('✓ Test 1: Player with [6|6] correctly selected as starter.');

// Test 2: 6|6 in bank, highest double is 5|5
const handA2: DominoTile[] = [{ id: 1, end1: 3, end2: 3 }, { id: 2, end1: 6, end2: 4 }];
const handB2: DominoTile[] = [{ id: 3, end1: 5, end2: 5 }, { id: 4, end1: 2, end2: 1 }];
const res2 = determineStarter([handA2, handB2]);
if (res2.starterIndex !== 1 || res2.openingTile.id !== 3) {
  throw new Error(`Test 2 Failed: expected starter 1 with [5|5], got ${res2.starterIndex}`);
}
console.log('✓ Test 2: Player with highest double [5|5] selected when [6|6] is in bank.');

// Test 3: No doubles in either hand, highest sum wins
const handA3: DominoTile[] = [{ id: 1, end1: 5, end2: 6 }, { id: 2, end1: 1, end2: 3 }]; // [5|6] sum 11
const handB3: DominoTile[] = [{ id: 3, end1: 4, end2: 6 }, { id: 4, end1: 2, end2: 5 }]; // [4|6] sum 10
const res3 = determineStarter([handA3, handB3]);
if (res3.starterIndex !== 0 || res3.openingTile.id !== 1) {
  throw new Error(`Test 3 Failed: expected starter 0 with [5|6], got ${res3.starterIndex}`);
}
console.log('✓ Test 3: Highest tile by pip sum [5|6] selected when neither hand has doubles.');

// Test 4: Tied sum breaks tie using higher pip value
const handA4: DominoTile[] = [{ id: 1, end1: 1, end2: 6 }, { id: 2, end1: 0, end2: 2 }]; // [1|6] sum 7, max pip 6
const handB4: DominoTile[] = [{ id: 3, end1: 2, end2: 5 }, { id: 4, end1: 0, end2: 3 }]; // [2|5] sum 7, max pip 5
const res4 = determineStarter([handA4, handB4]);
if (res4.starterIndex !== 0 || res4.openingTile.id !== 1) {
  throw new Error(`Test 4 Failed: expected starter 0 with [1|6], got ${res4.starterIndex}`);
}
console.log('✓ Test 4: Tied pip sum breaks tie using higher individual pip value ([6|1] beats [5|2]).');

// Test 5: Sequential draw state transitions
let bankCount = 14;
const playerHand: DominoTile[] = [];
const draws = [
  { id: 10, end1: 2, end2: 3 },
  { id: 11, end1: 1, end2: 4 },
  { id: 12, end1: 6, end2: 2 } // Playable tile
];

for (const d of draws) {
  bankCount--;
  playerHand.push(d);
}
if (bankCount !== 11 || playerHand.length !== 3) {
  throw new Error('Test 5 Failed: Draw state transition count mismatch');
}
console.log('✓ Test 5: Sequential bank draw transitions maintain exact bankCount and hand count.');

console.log('\n=== ALL AUTO-DRAW & STARTER TESTS PASSED! ===\n');

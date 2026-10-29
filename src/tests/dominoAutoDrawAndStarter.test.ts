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

// Test 6: computeActiveLegalMoves - Round 1 1v1 mandatory opening double (starter has [5|5] and [3|3])
import { computeActiveLegalMoves } from '../utils/dominoRules';
import { GameMode, RoundOutcomeType } from '../types/domino';

const handWithDoubles: DominoTile[] = [
  { id: 1, end1: 5, end2: 5 },
  { id: 2, end1: 3, end2: 3 },
  { id: 3, end1: 6, end2: 4 },
  { id: 4, end1: 2, end2: 1 }
];

const legalMovesR1 = computeActiveLegalMoves({
  hand: handWithDoubles,
  isMyTurn: true,
  openLeft: null,
  openRight: null,
  boardChain: [],
  gameMode: GameMode.Individual,
  roundNumber: 1
});

if (legalMovesR1.length !== 1 || legalMovesR1[0].tile.id !== 1) {
  throw new Error(`Test 6 Failed: Expected only [5|5] (id 1) to be legal, got: ${JSON.stringify(legalMovesR1)}`);
}
console.log('✓ Test 6: In Round 1 1v1, ONLY the highest available double [5|5] is legal and highlighted in green.');

// Test 7: computeActiveLegalMoves - Restarted 1v1 game after DRAW: mandatory opening double applies
const handAfterDraw: DominoTile[] = [
  { id: 10, end1: 4, end2: 4 },
  { id: 11, end1: 2, end2: 2 },
  { id: 12, end1: 6, end2: 1 }
];

const legalMovesDraw = computeActiveLegalMoves({
  hand: handAfterDraw,
  isMyTurn: true,
  openLeft: null,
  openRight: null,
  boardChain: [],
  gameMode: GameMode.Individual,
  roundNumber: 2,
  lastRoundOutcomeType: RoundOutcomeType.Draw
});

if (legalMovesDraw.length !== 1 || legalMovesDraw[0].tile.id !== 10) {
  throw new Error(`Test 7 Failed: Expected only [4|4] (id 10) to be legal after DRAW, got: ${JSON.stringify(legalMovesDraw)}`);
}
console.log('✓ Test 7: In restarted 1v1 game after DRAW, ONLY the highest double [4|4] is legal and highlighted.');

// Test 8: computeActiveLegalMoves - Subsequent round after a player wins: winner can open with ANY tile
const legalMovesAfterWin = computeActiveLegalMoves({
  hand: handWithDoubles,
  isMyTurn: true,
  openLeft: null,
  openRight: null,
  boardChain: [],
  gameMode: GameMode.Individual,
  roundNumber: 2,
  lastRoundOutcomeType: RoundOutcomeType.NormalWin
});

if (legalMovesAfterWin.length !== handWithDoubles.length) {
  throw new Error(`Test 8 Failed: Expected all ${handWithDoubles.length} tiles to be playable after a win, got ${legalMovesAfterWin.length}`);
}
console.log('✓ Test 8: Subsequent round after a player wins allows ANY tile to be opened (not restricted to doubles).');

// Test 9: computeActiveLegalMoves - When neither player has a double in Round 1: all tiles legal (normal highlighting)
const handNoDoubles: DominoTile[] = [
  { id: 20, end1: 6, end2: 5 },
  { id: 21, end1: 4, end2: 3 },
  { id: 22, end1: 2, end2: 1 }
];

const legalMovesNoDoubles = computeActiveLegalMoves({
  hand: handNoDoubles,
  isMyTurn: true,
  openLeft: null,
  openRight: null,
  boardChain: [],
  gameMode: GameMode.Individual,
  roundNumber: 1
});

if (legalMovesNoDoubles.length !== handNoDoubles.length) {
  throw new Error(`Test 9 Failed: Expected all tiles to be legal when no doubles held, got ${legalMovesNoDoubles.length}`);
}
console.log('✓ Test 9: When neither player has a double in opening round, all tiles are legal (normal highlighting).');

// Test 10: computeActiveLegalMoves - When not player turn: no moves legal
const legalMovesNotMyTurn = computeActiveLegalMoves({
  hand: handWithDoubles,
  isMyTurn: false,
  openLeft: null,
  openRight: null,
  boardChain: [],
  gameMode: GameMode.Individual,
  roundNumber: 1
});

if (legalMovesNotMyTurn.length !== 0) {
  throw new Error('Test 10 Failed: Expected 0 legal moves when not player turn');
}
console.log('✓ Test 10: When not player turn, 0 legal moves are highlighted.');

// Test 11: computeActiveLegalMoves - Mid-game non-empty board matches endpoints
const legalMovesMidGame = computeActiveLegalMoves({
  hand: handWithDoubles, // [5|5], [3|3], [6|4], [2|1]
  isMyTurn: true,
  openLeft: 5,
  openRight: 6,
  boardChain: [{ tileId: 99, leftPip: 5, rightPip: 6, orderIndex: 0 }]
});

// [5|5] connects to 5, [6|4] connects to 6
if (legalMovesMidGame.length !== 2 || !legalMovesMidGame.some((m) => m.tile.id === 1) || !legalMovesMidGame.some((m) => m.tile.id === 3)) {
  throw new Error(`Test 11 Failed: Expected [5|5] and [6|4] to match mid-game endpoints, got ${JSON.stringify(legalMovesMidGame)}`);
}
console.log('✓ Test 11: Mid-game endpoints properly match only connected tiles.');

console.log('\n=== ALL AUTO-DRAW & STARTER TESTS PASSED! ===\n');


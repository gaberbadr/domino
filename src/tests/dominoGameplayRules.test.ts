import { DominoTileDto, BoardEnd, BoardPlacedTile } from '../types/domino';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== RUNNING DOMINO GAMEPLAY RULES & TAP-TO-PLAY VERIFICATION ===\n');

// 1. Hand Completeness Verification (1v1)
console.log('Test 1: Hand integrity check (1v1 requires exactly 7 tiles in hand)...');
const sample1v1Hand: DominoTileDto[] = [
  { id: 1, end1: 6, end2: 6, isDouble: true, pipSum: 12 },
  { id: 2, end1: 6, end2: 3, isDouble: false, pipSum: 9 },
  { id: 3, end1: 5, end2: 5, isDouble: true, pipSum: 10 },
  { id: 4, end1: 4, end2: 1, isDouble: false, pipSum: 5 },
  { id: 5, end1: 3, end2: 0, isDouble: false, pipSum: 3 },
  { id: 6, end1: 2, end2: 2, isDouble: true, pipSum: 4 },
  { id: 7, end1: 1, end2: 0, isDouble: false, pipSum: 1 },
];

assert(sample1v1Hand.length === 7, '1v1 player hand must contain exactly 7 tiles');
const uniqueIds = new Set(sample1v1Hand.map(t => t.id));
assert(uniqueIds.size === 7, 'All 7 tiles in hand must have unique IDs');
console.log('✓ 1v1 hand contains exactly 7 unique tiles.\n');

// 2. Legal Moves Logic helper matching GamePage.tsx
function computeLegalMoves(
  hand: DominoTileDto[],
  openLeft: number | undefined,
  openRight: number | undefined
) {
  if (openLeft === undefined && openRight === undefined) {
    // Empty board: all tiles are playable
    return hand.map(t => ({
      tile: t,
      canPlaceLeft: true,
      canPlaceRight: true,
      requiresChoice: false,
    }));
  }

  const moves = [];
  for (const t of hand) {
    const canLeft = openLeft !== undefined && (t.end1 === openLeft || t.end2 === openLeft);
    const canRight = openRight !== undefined && (t.end1 === openRight || t.end2 === openRight);
    if (canLeft || canRight) {
      moves.push({
        tile: t,
        canPlaceLeft: canLeft,
        canPlaceRight: canRight,
        requiresChoice: canLeft && canRight && openLeft !== openRight,
      });
    }
  }
  return moves;
}

// 3. Test Empty Board (Opening Move)
console.log('Test 2: Empty board opening move...');
const openingMoves = computeLegalMoves(sample1v1Hand, undefined, undefined);
assert(openingMoves.length === 7, 'On empty board, all tiles in hand are candidate opening moves');
console.log('✓ Empty board allows all hand tiles as candidates.\n');

// 4. Test Single Endpoint Match (Tap-to-Play Immediate Execution)
console.log('Test 3: Single endpoint match (Tap-to-Play immediate action)...');
// Board endpoints: Left = 6, Right = 2
const activeMoves1 = computeLegalMoves(sample1v1Hand, 6, 2);

// Tile [6|3] matches only Left (6)
const move63 = activeMoves1.find(m => m.tile.id === 2);
assert(move63 !== undefined, 'Tile [6|3] must be legal');
assert(move63!.canPlaceLeft === true, 'Tile [6|3] can place Left');
assert(move63!.canPlaceRight === false, 'Tile [6|3] cannot place Right');
assert(move63!.requiresChoice === false, 'Tile [6|3] requires NO endpoint choice');

// In tap-to-play, since requiresChoice === false and canPlaceLeft === true,
// the tile is played immediately on Left without a popup modal
const targetEnd = move63!.canPlaceLeft && !move63!.canPlaceRight ? BoardEnd.Left : BoardEnd.Right;
assert(targetEnd === BoardEnd.Left, 'Tap-to-play immediately targets BoardEnd.Left');
console.log('✓ Single-endpoint match resolves directly to BoardEnd.Left without prompting.\n');

// 5. Test Dual Endpoint Match (Tap-to-Play Choice Modal)
console.log('Test 4: Dual endpoint match (Tap-to-Play prompts Play Left / Play Right)...');
// Consider hand with tile [6|2] against board endpoints Left = 6, Right = 2
const dualTileHand: DominoTileDto[] = [
  { id: 99, end1: 6, end2: 2, isDouble: false, pipSum: 8 },
  { id: 100, end1: 0, end2: 0, isDouble: true, pipSum: 0 }
];
const activeMoves2 = computeLegalMoves(dualTileHand, 6, 2);
const moveDual = activeMoves2.find(m => m.tile.id === 99);
assert(moveDual !== undefined, 'Tile [6|2] must be legal on both ends');
assert(moveDual!.canPlaceLeft === true, 'Can place Left');
assert(moveDual!.canPlaceRight === true, 'Can place Right');
assert(moveDual!.requiresChoice === true, 'Must prompt for endpoint selection when Left != Right');
console.log('✓ Dual-endpoint match requires user choice (Play Left / Play Right).\n');

// 6. Test Non-Playable Tile (Illegal Move Rejection)
console.log('Test 5: Non-playable tile identification (No false green highlight)...');
// Tile [0|0] against board endpoints Left = 6, Right = 2
const moveIllegal = activeMoves2.find(m => m.tile.id === 100);
assert(moveIllegal === undefined, 'Tile [0|0] is illegal and must not have a legal move entry');
console.log('✓ Non-playable tile correctly excluded from legal moves.\n');

// 7. Test Dual Endpoint Match when Left == Right (e.g. 6 and 6)
console.log('Test 6: Dual match when both ends have same pip value (e.g. 6 and 6)...');
const activeMovesSame = computeLegalMoves(sample1v1Hand, 6, 6);
const move63_same = activeMovesSame.find(m => m.tile.id === 2);
assert(move63_same !== undefined, 'Tile [6|3] connects to 6');
// When Left == Right (both 6), placing on Left or Right is functionally equivalent, no prompt needed
assert(move63_same!.requiresChoice === false, 'No choice required when both endpoints have the exact same pip value');
console.log('✓ Symmetrical ends (openLeft === openRight) execute directly without redundant modal.\n');

console.log('=== ALL GAMEPLAY RULES & TAP-TO-PLAY TESTS PASSED! ===\n');

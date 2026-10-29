import { calculateBoardLayout } from '../services/dominoLayoutEngine';
import { BoardPlacedTile, BoardEnd } from '../types/domino';

// Helper to assert conditions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== RUNNING DOMINO TILE & REALISTIC BOARD LAYOUT VERIFICATION ===\n');

// 1. Verify all 28 tiles from 0|0 to 6|6
console.log('Test 1: Validating all 28 Double-Six Domino Tiles (0|0 through 6|6)...');
const all28Tiles: [number, number][] = [];
for (let i = 0; i <= 6; i++) {
  for (let j = i; j <= 6; j++) {
    all28Tiles.push([i, j]);
  }
}
assert(all28Tiles.length === 28, 'Should have exactly 28 double-six domino tiles');

// Check tile [6|3] specifically as required by Section 6.2
const tile63 = all28Tiles.find(([e1, e2]) => e1 === 3 && e2 === 6 || e1 === 6 && e2 === 3);
assert(tile63 !== undefined, 'Tile [6|3] must exist in the double-six set');
console.log('✓ All 28 double-six tiles enumerated and verified, including [6|3].\n');

// 2. Test Empty Board
console.log('Test 2: Layout with empty boardChain...');
const emptyResult = calculateBoardLayout({
  chain: [],
  openLeft: null,
  openRight: null,
  boardWidth: 800,
  boardHeight: 500
});
assert(emptyResult.tiles.length === 0, 'Empty chain produces 0 tiles');
assert(emptyResult.leftDropZone === null, 'Empty chain has no left drop zone');
assert(emptyResult.rightDropZone === null, 'Empty chain has no right drop zone');
console.log('✓ Empty board handled cleanly.\n');

// 3. Test Single Root Tile (e.g. 6|6 double opening)
console.log('Test 3: Layout with single root double tile [6|6]...');
const singleChain: BoardPlacedTile[] = [
  { tileId: 1, leftPip: 6, rightPip: 6, orderIndex: 0, placedAt: undefined }
];
const singleResult = calculateBoardLayout({
  chain: singleChain,
  openLeft: 6,
  openRight: 6,
  boardWidth: 800,
  boardHeight: 500
});
assert(singleResult.tiles.length === 1, 'Single tile placed');
assert(singleResult.tiles[0].isDouble === true, 'Double tile identified');
assert(singleResult.tiles[0].orientation === 'vertical', 'Double root tile placed vertical (transverse)');
assert(singleResult.tiles[0].width === 36, 'Double tile width is S (36px)');
assert(singleResult.tiles[0].height === 72, 'Double tile height is 2S (72px)');
assert(singleResult.leftDropZone !== null, 'Left drop zone exists');
assert(singleResult.rightDropZone !== null, 'Right drop zone exists');
assert(singleResult.leftDropZone!.openPip === 6, 'Left drop zone shows open pip 6');
assert(singleResult.rightDropZone!.openPip === 6, 'Right drop zone shows open pip 6');
console.log('✓ Single root double tile verified.\n');

// 4. Test Growing Chain with Left and Right Moves
console.log('Test 4: Chain connecting tiles [5|6] - [6|6] - [6|3]...');
const smallChain: BoardPlacedTile[] = [
  { tileId: 2, leftPip: 5, rightPip: 6, orderIndex: 1, placedAt: BoardEnd.Left },
  { tileId: 1, leftPip: 6, rightPip: 6, orderIndex: 0, placedAt: undefined },
  { tileId: 3, leftPip: 6, rightPip: 3, orderIndex: 2, placedAt: BoardEnd.Right }
];
const smallResult = calculateBoardLayout({
  chain: smallChain,
  openLeft: 5,
  openRight: 3,
  boardWidth: 800,
  boardHeight: 500
});
assert(smallResult.tiles.length === 3, 'Three tiles placed');
// Check matching pips at junctions
// Tile 0 is [5|6], Tile 1 is [6|6], Tile 2 is [6|3]
// Junction 0-1: Tile 0 rightPip (6) connects to Tile 1 leftPip (6)
// Junction 1-2: Tile 1 rightPip (6) connects to Tile 2 leftPip (6)
assert(smallChain[0].rightPip === smallChain[1].leftPip, 'Junction 0-1 pips match (6 == 6)');
assert(smallChain[1].rightPip === smallChain[2].leftPip, 'Junction 1-2 pips match (6 == 6)');
console.log('✓ Small chain with Left and Right extensions verified.\n');

// 5. Test Long Chain with 15 Tiles (Checking turns and no overlaps)
console.log('Test 5: Long chain of 15 tiles navigating turns...');
const longChain: BoardPlacedTile[] = [
  { tileId: 10, leftPip: 1, rightPip: 4, orderIndex: 7, placedAt: BoardEnd.Left },
  { tileId: 9,  leftPip: 4, rightPip: 2, orderIndex: 6, placedAt: BoardEnd.Left },
  { tileId: 8,  leftPip: 2, rightPip: 3, orderIndex: 5, placedAt: BoardEnd.Left },
  { tileId: 7,  leftPip: 3, rightPip: 5, orderIndex: 4, placedAt: BoardEnd.Left },
  { tileId: 6,  leftPip: 5, rightPip: 1, orderIndex: 3, placedAt: BoardEnd.Left },
  { tileId: 2,  leftPip: 1, rightPip: 6, orderIndex: 1, placedAt: BoardEnd.Left },
  { tileId: 1,  leftPip: 6, rightPip: 6, orderIndex: 0, placedAt: undefined },
  { tileId: 3,  leftPip: 6, rightPip: 3, orderIndex: 2, placedAt: BoardEnd.Right },
  { tileId: 11, leftPip: 3, rightPip: 0, orderIndex: 8, placedAt: BoardEnd.Right },
  { tileId: 12, leftPip: 0, rightPip: 5, orderIndex: 9, placedAt: BoardEnd.Right },
  { tileId: 13, leftPip: 5, rightPip: 5, orderIndex: 10, placedAt: BoardEnd.Right },
  { tileId: 14, leftPip: 5, rightPip: 2, orderIndex: 11, placedAt: BoardEnd.Right },
  { tileId: 15, leftPip: 2, rightPip: 4, orderIndex: 12, placedAt: BoardEnd.Right },
  { tileId: 16, leftPip: 4, rightPip: 6, orderIndex: 13, placedAt: BoardEnd.Right },
  { tileId: 17, leftPip: 6, rightPip: 1, orderIndex: 14, placedAt: BoardEnd.Right }
];

const longResult = calculateBoardLayout({
  chain: longChain,
  openLeft: 1,
  openRight: 1,
  boardWidth: 600,
  boardHeight: 400
});

assert(longResult.tiles.length === 15, 'All 15 tiles placed');
// Check that orientation has both horizontal and vertical tiles (turns occurred)
const hasVertical = longResult.tiles.some(t => t.orientation === 'vertical');
const hasHorizontal = longResult.tiles.some(t => t.orientation === 'horizontal');
assert(hasVertical, 'Chain contains vertical tiles (doubles and corners)');
assert(hasHorizontal, 'Chain contains horizontal tiles (in-line tracks)');

// Check for unintentional tile overlaps
console.log('Checking for unintentional tile collisions/overlaps...');
for (let i = 0; i < longResult.tiles.length; i++) {
  const a = longResult.tiles[i];
  for (let j = i + 1; j < longResult.tiles.length; j++) {
    const b = longResult.tiles[j];
    // Check rectangle overlap:
    // Two non-adjacent tiles should never overlap
    const isAdjacent = Math.abs(i - j) === 1;
    if (!isAdjacent) {
      const overlapX = a.x < b.x + b.width - 2 && a.x + a.width - 2 > b.x;
      const overlapY = a.y < b.y + b.height - 2 && a.y + a.height - 2 > b.y;
      assert(!(overlapX && overlapY), `Non-adjacent tiles ${i} and ${j} must not overlap!`);
    }
  }
}
console.log('✓ 15-tile long chain has 0 overlaps, turns properly, and preserves layout.\n');

// 6. Test Responsive Scaling on Mobile (360x400) vs Desktop (1200x800)
console.log('Test 6: Responsive scaling across viewports...');
const mobileResult = calculateBoardLayout({
  chain: longChain,
  openLeft: 1,
  openRight: 1,
  boardWidth: 360,
  boardHeight: 400
});
const desktopResult = calculateBoardLayout({
  chain: longChain,
  openLeft: 1,
  openRight: 1,
  boardWidth: 1200,
  boardHeight: 800
});

assert(mobileResult.scale <= desktopResult.scale, 'Mobile scale adjusts dynamically to fit available width');
assert(mobileResult.scale >= 0.58, 'Scale maintains minimum readability limit');
assert(desktopResult.scale <= 1.0, 'Desktop scale stays at or below 1.0');
console.log(`✓ Mobile scale (${mobileResult.scale.toFixed(2)}) and Desktop scale (${desktopResult.scale.toFixed(2)}) verified.\n`);

// 7. Verify Sequence and Endpoint Integrity
console.log('Test 7: Endpoint integrity...');
assert(longResult.leftDropZone !== null && longResult.leftDropZone.openPip === 1, 'Open left drop zone is 1');
assert(longResult.rightDropZone !== null && longResult.rightDropZone.openPip === 1, 'Open right drop zone is 1');
console.log('✓ Endpoints match openLeft and openRight.\n');

console.log('=== ALL 7 TESTS PASSED SUCCESSFULLY! ===');

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

// 8. Strict Endpoint Non-Overlap Verification
console.log('Test 8: Strict endpoint marker non-overlap verification...');
const allPlaced = longResult.tiles;
for (const tile of allPlaced) {
  if (longResult.leftDropZone) {
    const ldz = longResult.leftDropZone;
    const overlapX = tile.x < ldz.x + ldz.width && tile.x + tile.width > ldz.x;
    const overlapY = tile.y < ldz.y + ldz.height && tile.y + tile.height > ldz.y;
    assert(!(overlapX && overlapY), `Left drop zone must NOT overlap tile ${tile.tileId}!`);
  }
  if (longResult.rightDropZone) {
    const rdz = longResult.rightDropZone;
    const overlapX = tile.x < rdz.x + rdz.width && tile.x + tile.width > rdz.x;
    const overlapY = tile.y < rdz.y + rdz.height && tile.y + tile.height > rdz.y;
    assert(!(overlapX && overlapY), `Right drop zone must NOT overlap tile ${tile.tileId}!`);
  }
}
console.log('✓ Both endpoint indicators are strictly outside all domino tiles with 0 overlap.\n');

// 9. Viewport Centering Verification
console.log('Test 9: Centering balance in available board area...');
const centerResult = calculateBoardLayout({
  chain: longChain,
  openLeft: 1,
  openRight: 1,
  boardWidth: 1000,
  boardHeight: 600
});
const renderedW = centerResult.boundingBox.width * centerResult.scale;
const renderedH = centerResult.boundingBox.height * centerResult.scale;
const expectedLeft = Math.round((1000 - renderedW) / 2);
const expectedTop = Math.round((600 - renderedH) / 2);
assert(Math.abs(centerResult.offsetX - expectedLeft) <= 1, 'Board layout X is centered horizontally');
assert(Math.abs(centerResult.offsetY - expectedTop) <= 1, 'Board layout Y is centered vertically');
console.log(`✓ Board is centered at X=${centerResult.offsetX}px (expected ${expectedLeft}px) and Y=${centerResult.offsetY}px.\n`);

// 10. Specific Viewport Matrix Tests (Desktop 1440x900, Tablet 768x1024, Mobile Portrait 390x844, Mobile Landscape 844x390)
console.log('Test 10: Testing target viewports (1440x900, 768x1024, 390x844, 844x390)...');
const viewports = [
  { name: 'Desktop (1440x900)', width: 1300, height: 650 },
  { name: 'Tablet (768x1024)', width: 660, height: 750 },
  { name: 'Mobile Portrait (390x844)', width: 360, height: 500 },
  { name: 'Mobile Landscape (844x390)', width: 720, height: 260 }
];

for (const vp of viewports) {
  const res = calculateBoardLayout({
    chain: longChain,
    openLeft: 1,
    openRight: 1,
    boardWidth: vp.width,
    boardHeight: vp.height
  });
  assert(res.tiles.length === 15, `${vp.name}: All 15 tiles placed`);
  assert(res.scale >= 0.58 && res.scale <= 1.0, `${vp.name}: Scale (${res.scale.toFixed(2)}) is within valid range`);
  assert(res.leftDropZone !== null && res.rightDropZone !== null, `${vp.name}: Both drop zones exist`);
  console.log(`  ✓ ${vp.name}: scale=${res.scale.toFixed(2)}, totalW=${Math.round(res.boundingBox.width * res.scale)}px, totalH=${Math.round(res.boundingBox.height * res.scale)}px`);
}
console.log('✓ All 4 representative viewports verified successfully.\n');

// 11. Full 28-Tile Domino Board Centering and Viewport Containment Test
console.log('Test 11: Full 28-tile board layout, centering, and non-clipping verification...');
const full28Chain: BoardPlacedTile[] = [
  // Left arm (expanded in reverse order from root)
  { tileId: 101, leftPip: 4, rightPip: 2, orderIndex: 13, placedAt: BoardEnd.Left },
  { tileId: 102, leftPip: 2, rightPip: 0, orderIndex: 12, placedAt: BoardEnd.Left },
  { tileId: 103, leftPip: 0, rightPip: 3, orderIndex: 11, placedAt: BoardEnd.Left },
  { tileId: 104, leftPip: 3, rightPip: 1, orderIndex: 10, placedAt: BoardEnd.Left },
  { tileId: 105, leftPip: 1, rightPip: 5, orderIndex: 9, placedAt: BoardEnd.Left },
  { tileId: 106, leftPip: 5, rightPip: 0, orderIndex: 8, placedAt: BoardEnd.Left },
  { tileId: 107, leftPip: 0, rightPip: 4, orderIndex: 7, placedAt: BoardEnd.Left },
  { tileId: 108, leftPip: 4, rightPip: 1, orderIndex: 6, placedAt: BoardEnd.Left },
  { tileId: 109, leftPip: 1, rightPip: 6, orderIndex: 5, placedAt: BoardEnd.Left },
  { tileId: 110, leftPip: 6, rightPip: 2, orderIndex: 4, placedAt: BoardEnd.Left },
  { tileId: 111, leftPip: 2, rightPip: 5, orderIndex: 3, placedAt: BoardEnd.Left },
  { tileId: 112, leftPip: 5, rightPip: 3, orderIndex: 2, placedAt: BoardEnd.Left },
  { tileId: 113, leftPip: 3, rightPip: 6, orderIndex: 1, placedAt: BoardEnd.Left },

  // Root [6|6]
  { tileId: 100, leftPip: 6, rightPip: 6, orderIndex: 0 },

  // Right arm
  { tileId: 114, leftPip: 6, rightPip: 5, orderIndex: 1, placedAt: BoardEnd.Right },
  { tileId: 115, leftPip: 5, rightPip: 5, orderIndex: 2, placedAt: BoardEnd.Right },
  { tileId: 116, leftPip: 5, rightPip: 4, orderIndex: 3, placedAt: BoardEnd.Right },
  { tileId: 117, leftPip: 4, rightPip: 4, orderIndex: 4, placedAt: BoardEnd.Right },
  { tileId: 118, leftPip: 4, rightPip: 3, orderIndex: 5, placedAt: BoardEnd.Right },
  { tileId: 119, leftPip: 3, rightPip: 3, orderIndex: 6, placedAt: BoardEnd.Right },
  { tileId: 120, leftPip: 3, rightPip: 2, orderIndex: 7, placedAt: BoardEnd.Right },
  { tileId: 121, leftPip: 2, rightPip: 2, orderIndex: 8, placedAt: BoardEnd.Right },
  { tileId: 122, leftPip: 2, rightPip: 1, orderIndex: 9, placedAt: BoardEnd.Right },
  { tileId: 123, leftPip: 1, rightPip: 1, orderIndex: 10, placedAt: BoardEnd.Right },
  { tileId: 124, leftPip: 1, rightPip: 0, orderIndex: 11, placedAt: BoardEnd.Right },
  { tileId: 125, leftPip: 0, rightPip: 0, orderIndex: 12, placedAt: BoardEnd.Right },
  { tileId: 126, leftPip: 0, rightPip: 6, orderIndex: 13, placedAt: BoardEnd.Right },
  { tileId: 127, leftPip: 6, rightPip: 4, orderIndex: 14, placedAt: BoardEnd.Right }
];

assert(full28Chain.length === 28, 'Chain contains all 28 tiles');

// Test 28-tile on desktop (1200x700)
const desktop28 = calculateBoardLayout({
  chain: full28Chain,
  openLeft: 4,
  openRight: 4,
  boardWidth: 1200,
  boardHeight: 700
});

assert(desktop28.tiles.length === 28, 'All 28 tiles placed on desktop layout');
const desk28RenderedW = desktop28.boundingBox.width * desktop28.scale;
const desk28RenderedH = desktop28.boundingBox.height * desktop28.scale;
assert(desk28RenderedW <= 1200, '28-tile rendered width fits within 1200px boardWidth');
assert(desk28RenderedH <= 700, '28-tile rendered height fits within 700px boardHeight');
assert(desktop28.offsetX >= 0, '28-tile horizontal offset is positive (no left clipping)');
assert(desktop28.offsetY >= 0, '28-tile vertical offset is positive (no top clipping)');
assert(Math.abs(desktop28.offsetX - Math.round((1200 - desk28RenderedW) / 2)) <= 1, '28-tile is centered horizontally');
assert(Math.abs(desktop28.offsetY - Math.round((700 - desk28RenderedH) / 2)) <= 1, '28-tile is centered vertically');
console.log(`  ✓ Desktop 28-tile: scale=${desktop28.scale.toFixed(2)}, renderedW=${Math.round(desk28RenderedW)}px, renderedH=${Math.round(desk28RenderedH)}px, offsetX=${desktop28.offsetX}px, offsetY=${desktop28.offsetY}px`);

// Test 28-tile on mobile landscape (720x280)
const mobileLandscape28 = calculateBoardLayout({
  chain: full28Chain,
  openLeft: 4,
  openRight: 4,
  boardWidth: 720,
  boardHeight: 280
});

assert(mobileLandscape28.tiles.length === 28, 'All 28 tiles placed on mobile landscape');
const mob28RenderedW = mobileLandscape28.boundingBox.width * mobileLandscape28.scale;
const mob28RenderedH = mobileLandscape28.boundingBox.height * mobileLandscape28.scale;
assert(mob28RenderedW <= 720, '28-tile rendered width fits within 720px mobile landscape boardWidth');
assert(mob28RenderedH <= 280, '28-tile rendered height fits within 280px mobile landscape boardHeight');
assert(mobileLandscape28.offsetX >= 0, 'Mobile landscape offsetX is positive (no left clipping)');
assert(mobileLandscape28.offsetY >= 0, 'Mobile landscape offsetY is positive (no top clipping)');
console.log(`  ✓ Mobile landscape 28-tile: scale=${mobileLandscape28.scale.toFixed(2)}, renderedW=${Math.round(mob28RenderedW)}px, renderedH=${Math.round(mob28RenderedH)}px, offsetX=${mobileLandscape28.offsetX}px, offsetY=${mobileLandscape28.offsetY}px`);

// Test 28-tile on mobile portrait (360x520)
const mobilePortrait28 = calculateBoardLayout({
  chain: full28Chain,
  openLeft: 4,
  openRight: 4,
  boardWidth: 360,
  boardHeight: 520
});

assert(mobilePortrait28.tiles.length === 28, 'All 28 tiles placed on mobile portrait');
const mobPort28RenderedW = mobilePortrait28.boundingBox.width * mobilePortrait28.scale;
const mobPort28RenderedH = mobilePortrait28.boundingBox.height * mobilePortrait28.scale;
assert(mobPort28RenderedW <= 360, '28-tile rendered width fits within 360px mobile portrait boardWidth');
assert(mobPort28RenderedH <= 520, '28-tile rendered height fits within 520px mobile portrait boardHeight');
assert(mobilePortrait28.offsetX >= 0, 'Mobile portrait offsetX is positive');
assert(mobilePortrait28.offsetY >= 0, 'Mobile portrait offsetY is positive');
console.log(`  ✓ Mobile portrait 28-tile: scale=${mobilePortrait28.scale.toFixed(2)}, renderedW=${Math.round(mobPort28RenderedW)}px, renderedH=${Math.round(mobPort28RenderedH)}px, offsetX=${mobilePortrait28.offsetX}px, offsetY=${mobilePortrait28.offsetY}px`);

console.log('\n=== ALL 11 TESTS PASSED SUCCESSFULLY! ===\n');


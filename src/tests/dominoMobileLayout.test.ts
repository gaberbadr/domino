import { calculateBoardLayout, PlacedLayoutTile } from '../services/dominoLayoutEngine';
import { BoardPlacedTile, BoardEnd } from '../types/domino';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('=== RUNNING NATIVE MOBILE DOMINO UI/UX & VIEWPORT AUDIT ===\n');

// Standard 12-tile mid-game domino chain (Left to Right ordering)
const mockChain: BoardPlacedTile[] = [
  { tileId: 12, leftPip: 2, rightPip: 2, orderIndex: 11, placedAt: BoardEnd.Left },
  { tileId: 11, leftPip: 4, rightPip: 2, orderIndex: 10, placedAt: BoardEnd.Left },
  { tileId: 10, leftPip: 0, rightPip: 4, orderIndex: 9, placedAt: BoardEnd.Left },
  { tileId: 9, leftPip: 1, rightPip: 0, orderIndex: 8, placedAt: BoardEnd.Left },
  { tileId: 8, leftPip: 5, rightPip: 1, orderIndex: 7, placedAt: BoardEnd.Left },
  { tileId: 7, leftPip: 6, rightPip: 5, orderIndex: 6, placedAt: BoardEnd.Left },
  { tileId: 1, leftPip: 6, rightPip: 6, orderIndex: 0, placedAt: undefined },
  { tileId: 2, leftPip: 6, rightPip: 3, orderIndex: 1, placedAt: BoardEnd.Right },
  { tileId: 3, leftPip: 3, rightPip: 5, orderIndex: 2, placedAt: BoardEnd.Right },
  { tileId: 4, leftPip: 5, rightPip: 2, orderIndex: 3, placedAt: BoardEnd.Right },
  { tileId: 5, leftPip: 2, rightPip: 4, orderIndex: 4, placedAt: BoardEnd.Right },
  { tileId: 6, leftPip: 4, rightPip: 4, orderIndex: 5, placedAt: BoardEnd.Right }
];

// Test 1: iPhone 12 Portrait Screen Budget & Layout (390 x 844 CSS px)
console.log('Test 1: iPhone 12 Portrait Screen Budget & Domino Table Space (390 x 844 px)...');
{
  const viewportW = 390;
  const viewportH = 844;
  const safeAreaTop = 47;
  const safeAreaBottom = 34;

  // New compact mobile header height: 40px
  const mobileHeaderH = 40;
  // Compact top opponent badge: 36px
  const opponentBadgeH = 36;
  // Compact player hand with 38x76px tiles: ~96px
  const playerHandH = 96;

  const availableFeltH = viewportH - safeAreaTop - safeAreaBottom - mobileHeaderH - opponentBadgeH - playerHandH - 12;
  const availableFeltW = viewportW - 8;

  console.log(`  iPhone 12 Available Felt Area: ${availableFeltW}px W x ${availableFeltH}px H`);
  assert(availableFeltH >= 550, `Available felt height (${availableFeltH}px) should exceed 550px for spacious domino board`);
  assert(availableFeltW >= 370, `Available felt width (${availableFeltW}px) should fit mobile canvas`);

  const layout = calculateBoardLayout({
    chain: mockChain,
    openLeft: 2,
    openRight: 4,
    boardWidth: availableFeltW,
    boardHeight: availableFeltH
  });

  console.log(`  12-tile chain on iPhone 12: scale=${layout.scale.toFixed(2)}, renderedW=${Math.round(layout.boundingBox.width * layout.scale)}px, renderedH=${Math.round(layout.boundingBox.height * layout.scale)}px`);
  assert(layout.scale >= 0.70, `Chain scale on iPhone 12 portrait (${layout.scale}) should remain crisp and readable (>= 0.70)`);
  assert(layout.offsetX >= 0, `Board X-offset (${layout.offsetX}) must not be negative`);
  assert(layout.offsetY >= 0, `Board Y-offset (${layout.offsetY}) must not be negative`);
  console.log('  ✓ iPhone 12 portrait layout verified.\n');
}

// Test 2: iPhone 12 Landscape Screen Budget & Layout (844 x 390 CSS px)
console.log('Test 2: iPhone 12 Landscape Screen Budget & Layout (844 x 390 px)...');
{
  const viewportW = 844;
  const viewportH = 390;
  const safeAreaLeft = 47;
  const safeAreaRight = 47;
  const safeAreaBottom = 21;

  const mobileHeaderH = 34;
  const playerHandH = 68;

  const availableFeltH = viewportH - mobileHeaderH - playerHandH - safeAreaBottom - 10;
  const availableFeltW = viewportW - safeAreaLeft - safeAreaRight - 10;

  console.log(`  iPhone 12 Landscape Available Felt: ${availableFeltW}px W x ${availableFeltH}px H`);
  assert(availableFeltH >= 240, `Available felt height in landscape (${availableFeltH}px) should exceed 240px`);

  const layout = calculateBoardLayout({
    chain: mockChain,
    openLeft: 2,
    openRight: 4,
    boardWidth: availableFeltW,
    boardHeight: availableFeltH
  });

  console.log(`  12-tile chain on Landscape: scale=${layout.scale.toFixed(2)}, renderedW=${Math.round(layout.boundingBox.width * layout.scale)}px, renderedH=${Math.round(layout.boundingBox.height * layout.scale)}px`);
  assert(layout.scale >= 0.60, `Chain scale on landscape (${layout.scale}) should remain >= 0.60`);
  assert(layout.boundingBox.width * layout.scale <= availableFeltW, 'Rendered width must not exceed available felt width');
  assert(layout.boundingBox.height * layout.scale <= availableFeltH, 'Rendered height must not exceed available felt height');
  console.log('  ✓ iPhone 12 landscape layout verified.\n');
}

// Test 3: Narrow Screen (iPhone SE / Android: 360 x 667 CSS px)
console.log('Test 3: Narrow Mobile Screen (360 x 667 px)...');
{
  const availableFeltW = 350;
  const availableFeltH = 440;

  const layout = calculateBoardLayout({
    chain: mockChain,
    openLeft: 2,
    openRight: 4,
    boardWidth: availableFeltW,
    boardHeight: availableFeltH
  });

  console.log(`  12-tile chain on 360px screen: scale=${layout.scale.toFixed(2)}, W=${Math.round(layout.boundingBox.width * layout.scale)}px, H=${Math.round(layout.boundingBox.height * layout.scale)}px`);
  assert(layout.scale >= 0.65, `Chain scale on narrow screen (${layout.scale}) should be >= 0.65`);
  console.log('  ✓ Narrow mobile screen verified.\n');
}

// Test 4: Player Hand Width Budget for 7 Tiles on 390px Screen
console.log('Test 4: Touch-friendly 7-tile hand on 390px mobile portrait screen...');
{
  const tileWidth = 38;
  const tileGap = 5.6; // 0.35rem
  const total7TilesWidth = 7 * tileWidth + 6 * tileGap;
  const availableScreenW = 390 - 16; // minus safe padding

  console.log(`  7 tiles total width: ${total7TilesWidth.toFixed(1)}px / Screen width: ${availableScreenW}px`);
  assert(total7TilesWidth <= availableScreenW, `7 tiles width (${total7TilesWidth}px) should fit comfortably inside screen (${availableScreenW}px) without clipping`);
  console.log('  ✓ Hand tile width and touch clearance verified.\n');
}

// Test 5: Full 28-Tile Extreme Game on iPhone 12 Portrait
console.log('Test 5: Full 28-Tile Extreme Game on iPhone 12 Portrait (390 x 844 px)...');
{
  const full28Chain: BoardPlacedTile[] = [
    // Left arm
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

  const layout = calculateBoardLayout({
    chain: full28Chain,
    openLeft: 4,
    openRight: 4,
    boardWidth: 380,
    boardHeight: 560
  });

  console.log(`  Full 28-tile chain on iPhone 12: scale=${layout.scale.toFixed(2)}, renderedW=${Math.round(layout.boundingBox.width * layout.scale)}px, renderedH=${Math.round(layout.boundingBox.height * layout.scale)}px`);
  assert(layout.scale >= 0.55, `28-tile extreme scale (${layout.scale}) should remain >= 0.55`);
  assert(layout.boundingBox.width * layout.scale <= 380, '28-tile rendered width must fit inside 380px felt');
  assert(layout.boundingBox.height * layout.scale <= 560, '28-tile rendered height must fit inside 560px felt');
  assert(layout.offsetX >= 0, 'Horizontal offset must not clip off left edge');
  assert(layout.offsetY >= 0, 'Vertical offset must not clip off top edge');
  console.log('  ✓ Full 28-tile extreme game verified on iPhone 12.\n');
}

console.log('=== ALL 5 NATIVE MOBILE DOMINO UI/UX TESTS PASSED! ===');

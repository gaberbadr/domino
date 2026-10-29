import { BoardPlacedTile, BoardEnd } from '../types/domino';

export interface PlacedLayoutTile {
  tileId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
  displayEnd1: number;
  displayEnd2: number;
  isDouble: boolean;
  orderIndex: number;
  isLeftOpenEnd: boolean;
  isRightOpenEnd: boolean;
}

export interface EndpointDropZone {
  end: BoardEnd;
  openPip: number;
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: 'EAST' | 'WEST' | 'NORTH' | 'SOUTH';
}

export interface BoardLayoutResult {
  tiles: PlacedLayoutTile[];
  leftDropZone: EndpointDropZone | null;
  rightDropZone: EndpointDropZone | null;
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface BoardLayoutInput {
  chain: BoardPlacedTile[];
  openLeft: number | null;
  openRight: number | null;
  boardWidth: number;
  boardHeight: number;
}

/**
 * Calculates a continuous, mathematically aligned 2D serpentine domino board layout.
 * Anchors the first played tile (root) at (0, 0), expanding the Right arm towards
 * the East (snaking South into subsequent rows) and the Left arm towards the West
 * (snaking North into subsequent rows).
 *
 * All non-doubles and transverse doubles are centered on the row centerline.
 * Turns connect flush at 90 degrees with no floating tiles or row collisions.
 * Endpoint indicators are strictly anchored OUTSIDE the exposed ends so they never cover pips.
 */
export function calculateBoardLayout({
  chain,
  openLeft,
  openRight,
  boardWidth,
  boardHeight
}: BoardLayoutInput): BoardLayoutResult {
  if (!chain || chain.length === 0) {
    return {
      tiles: [],
      leftDropZone: null,
      rightDropZone: null,
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      scale: 1,
      offsetX: boardWidth / 2,
      offsetY: boardHeight / 2
    };
  }

  // Find root tile (first tile played in match, orderIndex === 0)
  let rootIdx = chain.findIndex((t) => t.orderIndex === 0);
  if (rootIdx === -1) {
    rootIdx = chain.findIndex((t) => t.placedAt === null || t.placedAt === undefined);
  }
  if (rootIdx === -1) {
    rootIdx = Math.floor(chain.length / 2);
  }

  // Unit half-tile dimension S in pixels (Full tile: 2S x S = 72px x 36px)
  const S = 36;
  const GAP = 2;
  const ROW_PITCH = 78; // Centerline distance between adjacent rows (allows 72px doubles with clean clearance)

  // Calculate dynamic turn limits based on available viewport width
  const effectiveWidth = Math.max(240, boardWidth || 800);
  // On mobile boards (<= 500px), boardWidth is already the measured canvas width, avoid excessive desktop deduction
  const sideMargin = effectiveWidth <= 500 ? 24 : 64;
  const usableWidth = Math.max(180, effectiveWidth - sideMargin);
  const tileRunLength = 2 * S + GAP; // 74px
  const maxTilesInRow = Math.max(3, Math.min(7, Math.floor(usableWidth / tileRunLength)));
  const armLimit = Math.max(1, Math.floor((maxTilesInRow - 1) / 2));

  const placedTiles: PlacedLayoutTile[] = [];

  // Track placement directions for accurate endpoint anchor calculation
  let rightArmLastDir: 'EAST' | 'WEST' | 'SOUTH' = 'EAST';
  let leftArmLastDir: 'WEST' | 'EAST' | 'NORTH' = 'WEST';

  // 1. Place Root Tile at (0, 0)
  const root = chain[rootIdx];
  const isRootDouble = root.leftPip === root.rightPip;

  let rightCurrX = 0;
  let rightCurrY = 0;
  let leftCurrX = 0;
  let leftCurrY = 0;

  if (isRootDouble) {
    // Root double is placed vertically (transverse across Row 0)
    const w = S;
    const h = 2 * S;
    const x = -S / 2;
    const y = -S;
    placedTiles.push({
      tileId: root.tileId,
      x,
      y,
      width: w,
      height: h,
      orientation: 'vertical',
      displayEnd1: root.leftPip,
      displayEnd2: root.rightPip,
      isDouble: true,
      orderIndex: root.orderIndex,
      isLeftOpenEnd: rootIdx === 0,
      isRightOpenEnd: rootIdx === chain.length - 1
    });

    rightCurrX = S / 2;
    rightCurrY = 0;
    leftCurrX = -S / 2;
    leftCurrY = 0;
  } else {
    // Non-double root is placed horizontally along Row 0
    const w = 2 * S;
    const h = S;
    const x = -S;
    const y = -S / 2;
    placedTiles.push({
      tileId: root.tileId,
      x,
      y,
      width: w,
      height: h,
      orientation: 'horizontal',
      displayEnd1: root.leftPip,
      displayEnd2: root.rightPip,
      isDouble: false,
      orderIndex: root.orderIndex,
      isLeftOpenEnd: rootIdx === 0,
      isRightOpenEnd: rootIdx === chain.length - 1
    });

    rightCurrX = S;
    rightCurrY = 0;
    leftCurrX = -S;
    leftCurrY = 0;
  }

  // 2. Expand Right Arm (indices rootIdx + 1 to chain.length - 1)
  let rightDir: 'EAST' | 'WEST' = 'EAST';
  let rightSteps = 0;
  let rightRow = 0;

  for (let i = rootIdx + 1; i < chain.length; i++) {
    const tile = chain[i];
    const isDouble = tile.leftPip === tile.rightPip;
    const isLastTile = i === chain.length - 1;

    // Check if turn should occur (only non-doubles turn to preserve transverse double symmetry)
    const shouldTurnEast = rightDir === 'EAST' && rightSteps >= armLimit && !isDouble;
    const shouldTurnWest = rightDir === 'WEST' && rightSteps >= armLimit + 1 && !isDouble;

    if (shouldTurnEast) {
      // 90-degree corner turn pointing SOUTH
      const w = S;
      const h = 2 * S;
      const x = rightCurrX + GAP;
      const y = rightCurrY - S / 2;

      placedTiles.push({
        tileId: tile.tileId,
        x,
        y,
        width: w,
        height: h,
        orientation: 'vertical',
        displayEnd1: tile.leftPip,
        displayEnd2: tile.rightPip,
        isDouble: false,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: false,
        isRightOpenEnd: isLastTile
      });

      rightRow++;
      rightDir = 'WEST';
      rightSteps = 0;
      rightArmLastDir = 'SOUTH';
      rightCurrX = x;
      rightCurrY = rightRow * ROW_PITCH;
    } else if (shouldTurnWest) {
      // 90-degree corner turn pointing SOUTH on Left edge
      const w = S;
      const h = 2 * S;
      const x = rightCurrX - GAP - S;
      const y = rightCurrY - S / 2;

      placedTiles.push({
        tileId: tile.tileId,
        x,
        y,
        width: w,
        height: h,
        orientation: 'vertical',
        displayEnd1: tile.leftPip,
        displayEnd2: tile.rightPip,
        isDouble: false,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: false,
        isRightOpenEnd: isLastTile
      });

      rightRow++;
      rightDir = 'EAST';
      rightSteps = 0;
      rightArmLastDir = 'SOUTH';
      rightCurrX = x + S;
      rightCurrY = rightRow * ROW_PITCH;
    } else {
      // In-line tile
      if (rightDir === 'EAST') {
        rightArmLastDir = 'EAST';
        if (isDouble) {
          // Transverse vertical double centered on Row centerline
          const w = S;
          const h = 2 * S;
          const x = rightCurrX + GAP;
          const y = rightCurrY - S;
          placedTiles.push({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'vertical',
            displayEnd1: tile.leftPip,
            displayEnd2: tile.rightPip,
            isDouble: true,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: false,
            isRightOpenEnd: isLastTile
          });
          rightCurrX = x + w;
          rightSteps++;
        } else {
          // Horizontal in-line non-double
          const w = 2 * S;
          const h = S;
          const x = rightCurrX + GAP;
          const y = rightCurrY - S / 2;
          placedTiles.push({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'horizontal',
            displayEnd1: tile.leftPip,
            displayEnd2: tile.rightPip,
            isDouble: false,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: false,
            isRightOpenEnd: isLastTile
          });
          rightCurrX = x + w;
          rightSteps++;
        }
      } else {
        // In-line WEST
        rightArmLastDir = 'WEST';
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = rightCurrX - GAP - S;
          const y = rightCurrY - S;
          placedTiles.push({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'vertical',
            displayEnd1: tile.leftPip,
            displayEnd2: tile.rightPip,
            isDouble: true,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: false,
            isRightOpenEnd: isLastTile
          });
          rightCurrX = x;
          rightSteps++;
        } else {
          const w = 2 * S;
          const h = S;
          const x = rightCurrX - GAP - 2 * S;
          const y = rightCurrY - S / 2;
          // Moving west: leftPip connects to previous tile on right, rightPip faces forward on left
          placedTiles.push({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'horizontal',
            displayEnd1: tile.rightPip,
            displayEnd2: tile.leftPip,
            isDouble: false,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: false,
            isRightOpenEnd: isLastTile
          });
          rightCurrX = x;
          rightSteps++;
        }
      }
    }
  }

  // 3. Expand Left Arm (indices rootIdx - 1 down to 0)
  let leftDir: 'WEST' | 'EAST' = 'WEST';
  let leftSteps = 0;
  let leftRow = 0;

  for (let i = rootIdx - 1; i >= 0; i--) {
    const tile = chain[i];
    const isDouble = tile.leftPip === tile.rightPip;
    const isFirstTile = i === 0;

    const shouldTurnWest = leftDir === 'WEST' && leftSteps >= armLimit && !isDouble;
    const shouldTurnEast = leftDir === 'EAST' && leftSteps >= armLimit + 1 && !isDouble;

    if (shouldTurnWest) {
      // 90-degree corner turn pointing NORTH
      const w = S;
      const h = 2 * S;
      const x = leftCurrX - GAP - S;
      const y = leftCurrY - 1.5 * S;

      placedTiles.unshift({
        tileId: tile.tileId,
        x,
        y,
        width: w,
        height: h,
        orientation: 'vertical',
        displayEnd1: tile.leftPip,
        displayEnd2: tile.rightPip,
        isDouble: false,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: isFirstTile,
        isRightOpenEnd: false
      });

      leftRow--;
      leftDir = 'EAST';
      leftSteps = 0;
      leftArmLastDir = 'NORTH';
      leftCurrX = x + S;
      leftCurrY = leftRow * ROW_PITCH;
    } else if (shouldTurnEast) {
      // 90-degree corner turn pointing NORTH on Right edge
      const w = S;
      const h = 2 * S;
      const x = leftCurrX + GAP;
      const y = leftCurrY - 1.5 * S;

      placedTiles.unshift({
        tileId: tile.tileId,
        x,
        y,
        width: w,
        height: h,
        orientation: 'vertical',
        displayEnd1: tile.leftPip,
        displayEnd2: tile.rightPip,
        isDouble: false,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: isFirstTile,
        isRightOpenEnd: false
      });

      leftRow--;
      leftDir = 'WEST';
      leftSteps = 0;
      leftArmLastDir = 'NORTH';
      leftCurrX = x;
      leftCurrY = leftRow * ROW_PITCH;
    } else {
      // In-line tile for Left Arm
      if (leftDir === 'WEST') {
        leftArmLastDir = 'WEST';
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = leftCurrX - GAP - S;
          const y = leftCurrY - S;
          placedTiles.unshift({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'vertical',
            displayEnd1: tile.leftPip,
            displayEnd2: tile.rightPip,
            isDouble: true,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX = x;
          leftSteps++;
        } else {
          const w = 2 * S;
          const h = S;
          const x = leftCurrX - GAP - 2 * S;
          const y = leftCurrY - S / 2;
          // Moving west on left arm: rightPip connects to previous tile on right, leftPip faces forward on left
          placedTiles.unshift({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'horizontal',
            displayEnd1: tile.leftPip,
            displayEnd2: tile.rightPip,
            isDouble: false,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX = x;
          leftSteps++;
        }
      } else {
        // In-line EAST on Left Arm
        leftArmLastDir = 'EAST';
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = leftCurrX + GAP;
          const y = leftCurrY - S;
          placedTiles.unshift({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'vertical',
            displayEnd1: tile.leftPip,
            displayEnd2: tile.rightPip,
            isDouble: true,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX = x + w;
          leftSteps++;
        } else {
          const w = 2 * S;
          const h = S;
          const x = leftCurrX + GAP;
          const y = leftCurrY - S / 2;
          // Moving east: leftPip is on right facing forward, rightPip touches previous tile on left
          placedTiles.unshift({
            tileId: tile.tileId,
            x,
            y,
            width: w,
            height: h,
            orientation: 'horizontal',
            displayEnd1: tile.rightPip,
            displayEnd2: tile.leftPip,
            isDouble: false,
            orderIndex: tile.orderIndex,
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX = x + w;
          leftSteps++;
        }
      }
    }
  }

  // 4. Calculate Endpoint Drop Zones (Strictly anchored outside the exposed end with 8px clearance)
  const dzWidth = 32;
  const dzHeight = 32;
  const clearance = 8;

  let rightDropZone: EndpointDropZone | null = null;
  if (openRight !== null && placedTiles.length > 0) {
    const lastTile = placedTiles[placedTiles.length - 1];
    let dzX = 0;
    let dzY = 0;
    let dir: 'EAST' | 'WEST' | 'SOUTH' | 'NORTH' = 'EAST';

    if (chain.length === 1) {
      // Single root tile: Right end is outside its right edge
      dzX = lastTile.x + lastTile.width + clearance;
      dzY = lastTile.y + lastTile.height / 2 - dzHeight / 2;
      dir = 'EAST';
    } else if (rightArmLastDir === 'SOUTH') {
      // Exposed face is bottom edge of vertical corner tile
      dzX = lastTile.x + lastTile.width / 2 - dzWidth / 2;
      dzY = lastTile.y + lastTile.height + clearance;
      dir = 'SOUTH';
    } else if (rightArmLastDir === 'WEST') {
      // Exposed face is left edge
      dzX = lastTile.x - dzWidth - clearance;
      dzY = lastTile.y + lastTile.height / 2 - dzHeight / 2;
      dir = 'WEST';
    } else {
      // Exposed face is right edge (EAST)
      dzX = lastTile.x + lastTile.width + clearance;
      dzY = lastTile.y + lastTile.height / 2 - dzHeight / 2;
      dir = 'EAST';
    }

    rightDropZone = {
      end: BoardEnd.Right,
      openPip: openRight,
      x: dzX,
      y: dzY,
      width: dzWidth,
      height: dzHeight,
      direction: dir
    };
  }

  let leftDropZone: EndpointDropZone | null = null;
  if (openLeft !== null && placedTiles.length > 0) {
    const firstTile = placedTiles[0];
    let dzX = 0;
    let dzY = 0;
    let dir: 'EAST' | 'WEST' | 'SOUTH' | 'NORTH' = 'WEST';

    if (chain.length === 1) {
      // Single root tile: Left end is outside its left edge
      dzX = firstTile.x - dzWidth - clearance;
      dzY = firstTile.y + firstTile.height / 2 - dzHeight / 2;
      dir = 'WEST';
    } else if (leftArmLastDir === 'NORTH') {
      // Exposed face is top edge of vertical corner tile
      dzX = firstTile.x + firstTile.width / 2 - dzWidth / 2;
      dzY = firstTile.y - dzHeight - clearance;
      dir = 'NORTH';
    } else if (leftArmLastDir === 'EAST') {
      // Exposed face is right edge
      dzX = firstTile.x + firstTile.width + clearance;
      dzY = firstTile.y + firstTile.height / 2 - dzHeight / 2;
      dir = 'EAST';
    } else {
      // Exposed face is left edge (WEST)
      dzX = firstTile.x - dzWidth - clearance;
      dzY = firstTile.y + firstTile.height / 2 - dzHeight / 2;
      dir = 'WEST';
    }

    leftDropZone = {
      end: BoardEnd.Left,
      openPip: openLeft,
      x: dzX,
      y: dzY,
      width: dzWidth,
      height: dzHeight,
      direction: dir
    };
  }

  // 5. Compute Bounding Box of all tiles + drop zones
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const t of placedTiles) {
    if (t.x < minX) minX = t.x;
    if (t.x + t.width > maxX) maxX = t.x + t.width;
    if (t.y < minY) minY = t.y;
    if (t.y + t.height > maxY) maxY = t.y + t.height;
  }

  if (rightDropZone) {
    if (rightDropZone.x < minX) minX = rightDropZone.x;
    if (rightDropZone.x + rightDropZone.width > maxX) maxX = rightDropZone.x + rightDropZone.width;
    if (rightDropZone.y < minY) minY = rightDropZone.y;
    if (rightDropZone.y + rightDropZone.height > maxY) maxY = rightDropZone.y + rightDropZone.height;
  }

  if (leftDropZone) {
    if (leftDropZone.x < minX) minX = leftDropZone.x;
    if (leftDropZone.x + leftDropZone.width > maxX) maxX = leftDropZone.x + leftDropZone.width;
    if (leftDropZone.y < minY) minY = leftDropZone.y;
    if (leftDropZone.y + leftDropZone.height > maxY) maxY = leftDropZone.y + leftDropZone.height;
  }

  // Padding
  const pad = 16;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  const totalWidth = Math.max(80, maxX - minX);
  const totalHeight = Math.max(60, maxY - minY);

  // 6. Dynamic Scaling to fit comfortably and completely inside visible board area
  // Calculate available dimensions with safety margin so the chain never touches canvas edges
  const marginX = Math.max(12, Math.min(32, Math.round(boardWidth * 0.04)));
  const marginY = Math.max(12, Math.min(32, Math.round(boardHeight * 0.04)));
  const availW = Math.max(60, boardWidth - marginX * 2);
  const availH = Math.max(60, boardHeight - marginY * 2);

  const scaleX = availW / totalWidth;
  const scaleY = availH / totalHeight;
  const fitScale = Math.min(1.0, scaleX, scaleY);

  // Scale adapts dynamically so the chain is fully contained at any length (up to 28 tiles)
  // Maintains visual clarity without clipping or forcing browser zoom
  const scale = Math.max(0.2, fitScale);

  // Center within board area
  // Since children in GameBoard are positioned relative to minX and minY (x - minX, y - minY),
  // the local bounding box begins at (0, 0) and has visual dimensions (totalWidth * scale, totalHeight * scale).
  // Placing the layout container at (boardWidth - totalWidth * scale) / 2 centers the board perfectly.
  const offsetX = Math.round((boardWidth - totalWidth * scale) / 2);
  const offsetY = Math.round((boardHeight - totalHeight * scale) / 2);

  return {
    tiles: placedTiles,
    leftDropZone,
    rightDropZone,
    boundingBox: {
      minX,
      minY,
      maxX,
      maxY,
      width: totalWidth,
      height: totalHeight
    },
    scale,
    offsetX,
    offsetY
  };
}

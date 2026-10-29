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
 * Calculates a continuous, realistic 2D serpentine domino board layout.
 * Anchors the first played tile (root) at the center, expanding Right arm
 * towards the East and Left arm towards the West. When an arm reaches the
 * turn limit, it creates a physical corner turn into the adjacent row
 * (Right arm snakes South; Left arm snakes North).
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

  // Half-tile unit dimension S in pixels (Full tile: 2S x S = 72px x 36px)
  const S = 36;
  const GAP = 2;
  const ROW_PITCH = 82; // Distance between row centerlines (allows doubles and clear felt gap)

  // Calculate dynamic horizontal turn limit based on available board width
  const effectiveWidth = Math.max(340, boardWidth || 800);
  const maxTilesInRow = Math.max(4, Math.min(8, Math.floor((effectiveWidth - 120) / (2 * S + GAP))));
  const armLimit = Math.max(2, Math.floor(maxTilesInRow / 2));

  const placedTiles: PlacedLayoutTile[] = [];

  // 1. Place Root Tile at (0, 0)
  const root = chain[rootIdx];
  const isRootDouble = root.leftPip === root.rightPip;

  let rightConnX = 0;
  let rightConnY = 0;
  let leftConnX = 0;
  let leftConnY = 0;

  if (isRootDouble) {
    // Root double is placed vertically (transverse)
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

    rightConnX = S / 2 + GAP;
    rightConnY = 0;
    leftConnX = -S / 2 - GAP;
    leftConnY = 0;
  } else {
    // Non-double root is placed horizontally
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

    rightConnX = S + GAP;
    rightConnY = 0;
    leftConnX = -S - GAP;
    leftConnY = 0;
  }

  // 2. Expand Right Arm (indices rootIdx + 1 to chain.length - 1)
  let rightCurrX = rightConnX;
  let rightCurrY = rightConnY;
  let rightDir: 'EAST' | 'WEST' = 'EAST';
  let rightSteps = 0;
  let rightRow = 0;

  for (let i = rootIdx + 1; i < chain.length; i++) {
    const tile = chain[i];
    const isDouble = tile.leftPip === tile.rightPip;
    const isLastTile = i === chain.length - 1;

    // Check if we need to turn
    const shouldTurnEast = rightDir === 'EAST' && rightSteps >= armLimit;
    const shouldTurnWest = rightDir === 'WEST' && rightSteps >= armLimit + 1;

    if (shouldTurnEast) {
      // Corner turn pointing SOUTH
      const w = S;
      const h = 2 * S;
      const x = rightCurrX;
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
        isDouble,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: false,
        isRightOpenEnd: isLastTile
      });

      rightRow++;
      rightDir = 'WEST';
      rightSteps = 0;
      rightCurrX = x;
      rightCurrY = y + ROW_PITCH;
    } else if (shouldTurnWest) {
      // Corner turn pointing SOUTH on left edge
      const w = S;
      const h = 2 * S;
      const x = rightCurrX - S;
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
        isDouble,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: false,
        isRightOpenEnd: isLastTile
      });

      rightRow++;
      rightDir = 'EAST';
      rightSteps = 0;
      rightCurrX = x + S + GAP;
      rightCurrY = y + ROW_PITCH;
    } else {
      // In-line tile
      if (rightDir === 'EAST') {
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = rightCurrX;
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
          rightCurrX += S + GAP;
        } else {
          const w = 2 * S;
          const h = S;
          const x = rightCurrX;
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
          rightCurrX += 2 * S + GAP;
          rightSteps++;
        }
      } else {
        // WEST
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = rightCurrX - S;
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
          rightCurrX -= S + GAP;
        } else {
          const w = 2 * S;
          const h = S;
          const x = rightCurrX - 2 * S;
          const y = rightCurrY - S / 2;
          // Moving west: leftPip is on right touching previous tile, rightPip is on left facing forward
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
          rightCurrX -= 2 * S + GAP;
          rightSteps++;
        }
      }
    }
  }

  // 3. Expand Left Arm (indices rootIdx - 1 down to 0)
  let leftCurrX = leftConnX;
  let leftCurrY = leftConnY;
  let leftDir: 'WEST' | 'EAST' = 'WEST';
  let leftSteps = 0;
  let leftRow = 0;

  for (let i = rootIdx - 1; i >= 0; i--) {
    const tile = chain[i];
    const isDouble = tile.leftPip === tile.rightPip;
    const isFirstTile = i === 0;

    const shouldTurnWest = leftDir === 'WEST' && leftSteps >= armLimit;
    const shouldTurnEast = leftDir === 'EAST' && leftSteps >= armLimit + 1;

    if (shouldTurnWest) {
      // Corner turn pointing NORTH
      const w = S;
      const h = 2 * S;
      const x = leftCurrX - S;
      const y = leftCurrY - 1.5 * S;

      placedTiles.push({
        tileId: tile.tileId,
        x,
        y,
        width: w,
        height: h,
        orientation: 'vertical',
        displayEnd1: tile.leftPip, // top (exiting North)
        displayEnd2: tile.rightPip, // bottom (entering from South)
        isDouble,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: isFirstTile,
        isRightOpenEnd: false
      });

      leftRow--;
      leftDir = 'EAST';
      leftSteps = 0;
      leftCurrX = x + S + GAP;
      leftCurrY = y - ROW_PITCH + S;
    } else if (shouldTurnEast) {
      // Corner turn pointing NORTH on right edge
      const w = S;
      const h = 2 * S;
      const x = leftCurrX;
      const y = leftCurrY - 1.5 * S;

      placedTiles.push({
        tileId: tile.tileId,
        x,
        y,
        width: w,
        height: h,
        orientation: 'vertical',
        displayEnd1: tile.leftPip,
        displayEnd2: tile.rightPip,
        isDouble,
        orderIndex: tile.orderIndex,
        isLeftOpenEnd: isFirstTile,
        isRightOpenEnd: false
      });

      leftRow--;
      leftDir = 'WEST';
      leftSteps = 0;
      leftCurrX = x - GAP;
      leftCurrY = y - ROW_PITCH + S;
    } else {
      // In-line tile for Left Arm
      if (leftDir === 'WEST') {
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = leftCurrX - S;
          const y = leftCurrY - S;
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
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX -= S + GAP;
        } else {
          const w = 2 * S;
          const h = S;
          const x = leftCurrX - 2 * S;
          const y = leftCurrY - S / 2;
          // Moving west: rightPip touches previous tile on right, leftPip is on left facing forward
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
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX -= 2 * S + GAP;
          leftSteps++;
        }
      } else {
        // EAST
        if (isDouble) {
          const w = S;
          const h = 2 * S;
          const x = leftCurrX;
          const y = leftCurrY - S;
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
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX += S + GAP;
        } else {
          const w = 2 * S;
          const h = S;
          const x = leftCurrX;
          const y = leftCurrY - S / 2;
          // Moving east: leftPip is on right facing forward, rightPip touches previous tile on left
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
            isLeftOpenEnd: isFirstTile,
            isRightOpenEnd: false
          });
          leftCurrX += 2 * S + GAP;
          leftSteps++;
        }
      }
    }
  }

  // 4. Calculate Endpoint Drop Zones
  let rightDropZone: EndpointDropZone | null = null;
  if (openRight !== null) {
    const dzWidth = S * 1.25;
    const dzHeight = S;
    const dzX = rightDir === 'EAST' ? rightCurrX + 4 : rightCurrX - dzWidth - 4;
    const dzY = rightCurrY - dzHeight / 2;
    rightDropZone = {
      end: BoardEnd.Right,
      openPip: openRight,
      x: dzX,
      y: dzY,
      width: dzWidth,
      height: dzHeight
    };
  }

  let leftDropZone: EndpointDropZone | null = null;
  if (openLeft !== null) {
    const dzWidth = S * 1.25;
    const dzHeight = S;
    const dzX = leftDir === 'WEST' ? leftCurrX - dzWidth - 4 : leftCurrX + 4;
    const dzY = leftCurrY - dzHeight / 2;
    leftDropZone = {
      end: BoardEnd.Left,
      openPip: openLeft,
      x: dzX,
      y: dzY,
      width: dzWidth,
      height: dzHeight
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

  // Add padding
  const pad = 24;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  const totalWidth = Math.max(100, maxX - minX);
  const totalHeight = Math.max(100, maxY - minY);

  // 6. Dynamic Scaling to fit comfortably inside visible board area
  const availW = Math.max(280, boardWidth - 30);
  const availH = Math.max(240, boardHeight - 30);

  const scaleX = availW / totalWidth;
  const scaleY = availH / totalHeight;
  const fitScale = Math.min(1.0, scaleX, scaleY);
  // Ensure scale doesn't shrink below readable threshold (0.58)
  const scale = Math.max(0.58, fitScale);

  // Center within board area
  const offsetX = (boardWidth - totalWidth * scale) / 2 - minX * scale;
  const offsetY = (boardHeight - totalHeight * scale) / 2 - minY * scale;

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

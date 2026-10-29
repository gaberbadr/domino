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
 * Calculates a tight, clean, continuous 2D serpentine domino board layout.
 *
 * Geometric principles:
 * - Half-tile unit square S = 36px.
 * - Standard domino: 2S x S = 72px x 36px (2:1 aspect ratio).
 * - Tiles touch flush with 0px gap (seam created naturally by tile border).
 * - All horizontal tiles in a row share the exact row centerline.
 * - Transverse doubles sit perpendicular across the run, centered on the centerline.
 * - Turns use 2 vertical tiles forming a clean 36x144 column that connects adjacent rows flush.
 * - Row pitch is exactly 3S = 108px, leaving 36px clean clearance between doubles across rows.
 * - Anchors root tile (orderIndex === 0) at (0, 0) so existing tiles never move as new tiles are played.
 * - Endpoints strictly sit outside the exposed faces with 8px clearance.
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

  // Dimensions
  const S = 36;          // Width of domino / half-length
  const L = 2 * S;       // Full length of domino (72px)
  const ROW_PITCH = 108; // Centerline distance between rows (3 * S)

  // Dynamic turn limits based on usable canvas width
  const effectiveWidth = Math.max(240, boardWidth || 800);
  const sideMargin = effectiveWidth <= 500 ? 24 : 64;
  const usableWidth = Math.max(180, effectiveWidth - sideMargin);
  const maxTilesInRow = Math.max(3, Math.min(6, Math.floor(usableWidth / L)));
  const armLimit = Math.max(1, Math.floor((maxTilesInRow - 1) / 2));

  const placedTiles: PlacedLayoutTile[] = [];

  // Track placement directions for accurate drop zone alignment
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
    const h = L;
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
    const w = L;
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
  let rightTurnStep: 0 | 1 | 2 = 0; // 0 = in row, 1 = first turn tile (vertical), 2 = second turn tile (vertical)
  let rightTurnColX = 0;

  for (let i = rootIdx + 1; i < chain.length; i++) {
    const tile = chain[i];
    const isDouble = tile.leftPip === tile.rightPip;
    const isLastTile = i === chain.length - 1;

    // Check if turn should begin
    const shouldStartTurnEast = rightDir === 'EAST' && rightTurnStep === 0 && rightSteps >= armLimit && !isDouble;
    const shouldStartTurnWest = rightDir === 'WEST' && rightTurnStep === 0 && rightSteps >= armLimit + 1 && !isDouble;

    if (shouldStartTurnEast || (rightDir === 'EAST' && rightTurnStep > 0)) {
      // Turning SOUTH on the right side
      if (shouldStartTurnEast || rightTurnStep === 0) {
        // First vertical tile of turn (upper)
        rightTurnStep = 1;
        rightTurnColX = rightCurrX;
        const w = S;
        const h = L;
        const x = rightTurnColX;
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

        rightArmLastDir = 'SOUTH';
      } else if (rightTurnStep === 1) {
        // Second vertical tile of turn (lower)
        rightTurnStep = 2;
        const w = S;
        const h = L;
        const x = rightTurnColX;
        const y = rightCurrY + S / 2 + S; // Exactly touches bottom of upper tile

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

        // Turn is now complete! Next row will travel WEST
        rightRow++;
        rightDir = 'WEST';
        rightSteps = 0;
        rightTurnStep = 0;
        rightArmLastDir = 'WEST';
        rightCurrX = rightTurnColX;
        rightCurrY = rightRow * ROW_PITCH;
      }
    } else if (shouldStartTurnWest || (rightDir === 'WEST' && rightTurnStep > 0)) {
      // Turning SOUTH on the left side
      if (shouldStartTurnWest || rightTurnStep === 0) {
        rightTurnStep = 1;
        rightTurnColX = rightCurrX - S;
        const w = S;
        const h = L;
        const x = rightTurnColX;
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

        rightArmLastDir = 'SOUTH';
      } else if (rightTurnStep === 1) {
        rightTurnStep = 2;
        const w = S;
        const h = L;
        const x = rightTurnColX;
        const y = rightCurrY + S / 2 + S;

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
        rightTurnStep = 0;
        rightArmLastDir = 'EAST';
        rightCurrX = rightTurnColX + S;
        rightCurrY = rightRow * ROW_PITCH;
      }
    } else {
      // In-line placement along current row
      if (rightDir === 'EAST') {
        rightArmLastDir = 'EAST';
        if (isDouble) {
          // Transverse vertical double centered on row centerline
          const w = S;
          const h = L;
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
          rightCurrX = x + w;
          rightSteps++;
        } else {
          // Horizontal in-line non-double
          const w = L;
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
          rightCurrX = x + w;
          rightSteps++;
        }
      } else {
        // In-line WEST
        rightArmLastDir = 'WEST';
        if (isDouble) {
          const w = S;
          const h = L;
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
          rightCurrX = x;
          rightSteps++;
        } else {
          const w = L;
          const h = S;
          const x = rightCurrX - L;
          const y = rightCurrY - S / 2;

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
  let leftTurnStep: 0 | 1 | 2 = 0;
  let leftTurnColX = 0;

  for (let i = rootIdx - 1; i >= 0; i--) {
    const tile = chain[i];
    const isDouble = tile.leftPip === tile.rightPip;
    const isFirstTile = i === 0;

    const shouldStartTurnWest = leftDir === 'WEST' && leftTurnStep === 0 && leftSteps >= armLimit && !isDouble;
    const shouldStartTurnEast = leftDir === 'EAST' && leftTurnStep === 0 && leftSteps >= armLimit + 1 && !isDouble;

    if (shouldStartTurnWest || (leftDir === 'WEST' && leftTurnStep > 0)) {
      // Turning NORTH on left side
      if (shouldStartTurnWest || leftTurnStep === 0) {
        leftTurnStep = 1;
        leftTurnColX = leftCurrX - S;
        const w = S;
        const h = L;
        const x = leftTurnColX;
        const y = leftCurrY - 1.5 * S; // Lower turn tile: bottom aligns with Row 0 bottom

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

        leftArmLastDir = 'NORTH';
      } else if (leftTurnStep === 1) {
        leftTurnStep = 2;
        const w = S;
        const h = L;
        const x = leftTurnColX;
        const y = leftCurrY - 3.5 * S; // Upper turn tile: bottom touches lower tile top

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
        leftTurnStep = 0;
        leftArmLastDir = 'EAST';
        leftCurrX = leftTurnColX + S;
        leftCurrY = leftRow * ROW_PITCH;
      }
    } else if (shouldStartTurnEast || (leftDir === 'EAST' && leftTurnStep > 0)) {
      // Turning NORTH on right side
      if (shouldStartTurnEast || leftTurnStep === 0) {
        leftTurnStep = 1;
        leftTurnColX = leftCurrX;
        const w = S;
        const h = L;
        const x = leftTurnColX;
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

        leftArmLastDir = 'NORTH';
      } else if (leftTurnStep === 1) {
        leftTurnStep = 2;
        const w = S;
        const h = L;
        const x = leftTurnColX;
        const y = leftCurrY - 3.5 * S;

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
        leftTurnStep = 0;
        leftArmLastDir = 'WEST';
        leftCurrX = leftTurnColX;
        leftCurrY = leftRow * ROW_PITCH;
      }
    } else {
      // In-line tile on Left Arm
      if (leftDir === 'WEST') {
        leftArmLastDir = 'WEST';
        if (isDouble) {
          const w = S;
          const h = L;
          const x = leftCurrX - S;
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
          const w = L;
          const h = S;
          const x = leftCurrX - L;
          const y = leftCurrY - S / 2;

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
          const h = L;
          const x = leftCurrX;
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
          const w = L;
          const h = S;
          const x = leftCurrX;
          const y = leftCurrY - S / 2;

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

  // 4. Calculate Endpoint Drop Zones (Strictly anchored outside exposed ends with 8px clearance)
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
      dzX = lastTile.x + lastTile.width + clearance;
      dzY = lastTile.y + lastTile.height / 2 - dzHeight / 2;
      dir = 'EAST';
    } else if (rightArmLastDir === 'SOUTH') {
      dzX = lastTile.x + lastTile.width / 2 - dzWidth / 2;
      dzY = lastTile.y + lastTile.height + clearance;
      dir = 'SOUTH';
    } else if (rightArmLastDir === 'WEST') {
      dzX = lastTile.x - dzWidth - clearance;
      dzY = lastTile.y + lastTile.height / 2 - dzHeight / 2;
      dir = 'WEST';
    } else {
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
      dzX = firstTile.x - dzWidth - clearance;
      dzY = firstTile.y + firstTile.height / 2 - dzHeight / 2;
      dir = 'WEST';
    } else if (leftArmLastDir === 'NORTH') {
      dzX = firstTile.x + firstTile.width / 2 - dzWidth / 2;
      dzY = firstTile.y - dzHeight - clearance;
      dir = 'NORTH';
    } else if (leftArmLastDir === 'EAST') {
      dzX = firstTile.x + firstTile.width + clearance;
      dzY = firstTile.y + firstTile.height / 2 - dzHeight / 2;
      dir = 'EAST';
    } else {
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
  const marginX = Math.max(12, Math.min(32, Math.round(boardWidth * 0.04)));
  const marginY = Math.max(12, Math.min(32, Math.round(boardHeight * 0.04)));
  const availW = Math.max(60, boardWidth - marginX * 2);
  const availH = Math.max(60, boardHeight - marginY * 2);

  const scaleX = availW / totalWidth;
  const scaleY = availH / totalHeight;
  const fitScale = Math.min(1.0, scaleX, scaleY);
  const scale = Math.max(0.2, fitScale);

  // Center within board area
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

import { DominoTile, LegalMoveDto, GameMode, RoundOutcomeType, BoardPlacedTile } from '../types/domino';

export interface ComputeLegalMovesParams {
  hand: DominoTile[];
  isMyTurn: boolean;
  openLeft?: number | null;
  openRight?: number | null;
  boardChain?: BoardPlacedTile[];
  gameMode?: GameMode;
  roundNumber?: number;
  lastRoundOutcomeType?: RoundOutcomeType | null;
}

/**
 * Computes active legal moves for the current player:
 * - In a new 1v1 game (round 1) or restarted 1v1 game after a DRAW, if the player holds any double,
 *   ONLY the highest available double in the hand is playable and highlighted in green.
 * - If neither player holds a double in a new or restarted game, all tiles are playable (normal highlighting).
 * - In subsequent rounds after a player wins, any tile is legal on an empty board (normal highlighting).
 * - On a non-empty board, tiles matching either open endpoint are legal.
 */
export function computeActiveLegalMoves({
  hand,
  isMyTurn,
  openLeft,
  openRight,
  boardChain,
  gameMode,
  roundNumber = 1,
  lastRoundOutcomeType
}: ComputeLegalMovesParams): LegalMoveDto[] {
  if (!isMyTurn) return [];

  const isBoardEmpty = (!boardChain || boardChain.length === 0) &&
    openLeft == null && openRight == null;

  if (isBoardEmpty) {
    const is1v1 = gameMode === GameMode.Individual;
    const isNewOrRestarted1v1 = is1v1 && (roundNumber === 1 || lastRoundOutcomeType === RoundOutcomeType.Draw);

    if (isNewOrRestarted1v1) {
      // Find doubles in hand
      const doubles = hand.filter((t) => t.end1 === t.end2);
      if (doubles.length > 0) {
        // Highest available double starts (6-6, 5-5, 4-4, 3-3, 2-2, 1-1, 0-0)
        const highestDouble = doubles.slice().sort((a, b) => b.end1 - a.end1)[0];
        return [{
          tile: highestDouble,
          canPlaceLeft: true,
          canPlaceRight: true,
          requiresChoice: false
        }];
      }
      // If neither player had a double, starter has no doubles: normal legal-move highlighting
    }

    // Normal empty board opening (subsequent rounds after a win, or when no doubles exist)
    return hand.map((t) => ({
      tile: t,
      canPlaceLeft: true,
      canPlaceRight: true,
      requiresChoice: false
    }));
  }

  const l = openLeft;
  const r = openRight;

  const moves: LegalMoveDto[] = [];
  for (const t of hand) {
    const canL = l != null && (t.end1 === l || t.end2 === l);
    const canR = r != null && (t.end1 === r || t.end2 === r);
    if (canL || canR) {
      moves.push({
        tile: t,
        canPlaceLeft: canL,
        canPlaceRight: canR,
        requiresChoice: canL && canR && (l !== r)
      });
    }
  }
  return moves;
}

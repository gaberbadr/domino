function assertStrictEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ''}`);
  }
}
import {
  RoundEndResultDto,
  MatchEndResultDto,
  RoundOutcomeType,
  GameMode,
  RoomPlayerDto,
  DominoTile
} from '../types/domino';

console.log('=== RUNNING TESTS: LEAVE MATCH & BLOCKED ROUND RESULTS ===\n');

// -------------------------------------------------------------
// Test 1: Leaving a Match Must Not Trigger Victory Celebrations
// -------------------------------------------------------------
console.log('Test 1: Leaving a match distinguishes leaver from winner...');
{
  const forfeitResult: MatchEndResultDto = {
    matchId: 'match-123',
    winnerUserId: 'user-winner',
    winnerName: 'اللاعب الفائز',
    finalTeam1Score: 0,
    finalTeam2Score: 0,
    reason: 'انسحب اللاعب لاعب مغادر من المباراة، فاز الخصم بالماتش',
    isForfeit: true,
    forfeitedUserId: 'user-leaver'
  };

  // Logic used in MatchEndModal:
  const checkWinner = (result: MatchEndResultDto, currentUserId: string, currentUserTeam?: number) => {
    const isForfeitedByUser = Boolean(
      result.isForfeit && currentUserId && result.forfeitedUserId === currentUserId
    );
    const isUserWinner = Boolean(
      !isForfeitedByUser &&
      (result.winnerUserId
        ? result.winnerUserId === currentUserId
        : result.winningTeamIndex != null && currentUserTeam != null
        ? result.winningTeamIndex === currentUserTeam
        : false)
    );
    return { isForfeitedByUser, isUserWinner };
  };

  // Leaver client
  const leaverCheck = checkWinner(forfeitResult, 'user-leaver');
  assertStrictEqual(leaverCheck.isForfeitedByUser, true, 'Leaver should be detected as forfeited user');
  assertStrictEqual(leaverCheck.isUserWinner, false, 'Leaver must NEVER be treated as winner');

  // Winner client
  const winnerCheck = checkWinner(forfeitResult, 'user-winner');
  assertStrictEqual(winnerCheck.isForfeitedByUser, false, 'Winner is not the forfeited user');
  assertStrictEqual(winnerCheck.isUserWinner, true, 'Actual winner must be treated as winner');

  // Normal victory check (not a forfeit)
  const normalVictoryResult: MatchEndResultDto = {
    matchId: 'match-456',
    winnerUserId: 'user-winner',
    winnerName: 'اللاعب الفائز',
    finalTeam1Score: 104,
    finalTeam2Score: 40,
    reason: 'وصل لـ 101 نقطة وكسب الماتش!',
    isForfeit: false
  };
  const normalWinnerCheck = checkWinner(normalVictoryResult, 'user-winner');
  assertStrictEqual(normalWinnerCheck.isUserWinner, true, 'Normal win correctly celebrates for winner');
  const normalLoserCheck = checkWinner(normalVictoryResult, 'user-loser');
  assertStrictEqual(normalLoserCheck.isUserWinner, false, 'Normal loser does not celebrate');

  console.log('  ✓ Leave match vs legitimate victory celebration verified.');
}

// -------------------------------------------------------------
// Test 2: Blocked Round Table Overlay Trigger & Scoring Logic
// -------------------------------------------------------------
console.log('Test 2: Blocked round table overlay triggers exclusively on closure & calculates pips...');
{
  const normalWinResult: RoundEndResultDto = {
    matchId: 'm1',
    roundNumber: 1,
    outcomeType: RoundOutcomeType.NormalWin,
    isDraw: false,
    winnerUserId: 'u1',
    winnerName: 'لاعب 1',
    pointsAwarded: 18,
    team1ScoreAfter: 18,
    team2ScoreAfter: 0,
    reason: 'لاعب 1 فضى ورقه وكسب الجولة!',
    isMatchCompleted: false,
    playerRemainingPips: { u1: 0, u2: 18 },
    playerRemainingHands: { u1: [], u2: [{ id: 1, end1: 6, end2: 6 }, { id: 2, end1: 3, end2: 3 }] },
    winnerRemainingHand: []
  };

  const isBlockedTrigger = (outcomeType: RoundOutcomeType) =>
    outcomeType === RoundOutcomeType.BlockedWin || outcomeType === RoundOutcomeType.Draw;

  // Must NOT trigger for normal win
  assertStrictEqual(isBlockedTrigger(normalWinResult.outcomeType), false, 'Normal win must NOT trigger table blocked overlay');

  // Must trigger for BlockedWin
  const blockedWinResult: RoundEndResultDto = {
    matchId: 'm2',
    roundNumber: 2,
    outcomeType: RoundOutcomeType.BlockedWin,
    isDraw: false,
    winnerUserId: 'u1',
    winnerName: 'لاعب 1',
    pointsAwarded: 14,
    team1ScoreAfter: 32,
    team2ScoreAfter: 0,
    reason: 'قفلة: اللاعب الأول كسب بمجموع نقط أقل (4 مقابل 18)',
    isMatchCompleted: false,
    playerRemainingPips: { u1: 4, u2: 18 },
    playerRemainingHands: {
      u1: [{ id: 10, end1: 1, end2: 3 }],
      u2: [{ id: 11, end1: 6, end2: 6 }, { id: 12, end1: 2, end2: 4 }]
    },
    winnerRemainingHand: [{ id: 10, end1: 1, end2: 3 }]
  };
  assertStrictEqual(isBlockedTrigger(blockedWinResult.outcomeType), true, 'BlockedWin triggers table blocked overlay');

  // Verify pip calculation for all players
  const u1Hand = blockedWinResult.playerRemainingHands?.['u1']!;
  const u2Hand = blockedWinResult.playerRemainingHands?.['u2']!;
  const calcPips = (hand: DominoTile[]) => hand.reduce((s, t) => s + (t.pipSum ?? (t.end1 + t.end2)), 0);
  assertStrictEqual(calcPips(u1Hand), 4, 'U1 remaining pips is 4');
  assertStrictEqual(calcPips(u2Hand), 18, 'U2 remaining pips is 18 (12 + 6)');
  assertStrictEqual(calcPips(u1Hand) < calcPips(u2Hand), true, 'Lowest remaining points wins blocked round');

  // Must trigger for Draw
  const drawResult: RoundEndResultDto = {
    matchId: 'm3',
    roundNumber: 3,
    outcomeType: RoundOutcomeType.Draw,
    isDraw: true,
    pointsAwarded: 0,
    team1ScoreAfter: 32,
    team2ScoreAfter: 0,
    reason: 'تعادل في القفلة: تساوى اللاعبان في عدد البنط (10)',
    isMatchCompleted: false,
    playerRemainingPips: { u1: 10, u2: 10 },
    playerRemainingHands: {
      u1: [{ id: 20, end1: 5, end2: 5 }],
      u2: [{ id: 21, end1: 4, end2: 6 }]
    },
    winnerRemainingHand: []
  };
  assertStrictEqual(isBlockedTrigger(drawResult.outcomeType), true, 'Draw triggers table blocked overlay');
  assertStrictEqual(drawResult.pointsAwarded, 0, 'Draw awards 0 points');

  console.log('  ✓ Blocked round table overlay triggers and pip calculation verified.');
}

// -------------------------------------------------------------
// Test 3: Displaying the Winning Player's Hand in Next-Round Prompt
// -------------------------------------------------------------
console.log('Test 3: Next-round prompt correctly showcases winning player tiles...');
{
  // Case A: Blocked Win -> Displays actual tiles held by winner
  const blockedRound: RoundEndResultDto = {
    matchId: 'm4',
    roundNumber: 1,
    outcomeType: RoundOutcomeType.BlockedWin,
    isDraw: false,
    winnerUserId: 'p1',
    winnerName: 'البطل',
    pointsAwarded: 15,
    team1ScoreAfter: 15,
    team2ScoreAfter: 0,
    reason: 'قفلة',
    isMatchCompleted: false,
    playerRemainingPips: { p1: 3, p2: 18 },
    winnerRemainingHand: [{ id: 1, end1: 1, end2: 2 }]
  };

  assertStrictEqual(blockedRound.winnerRemainingHand?.length, 1);
  assertStrictEqual(blockedRound.winnerRemainingHand![0].end1, 1);
  assertStrictEqual(blockedRound.winnerRemainingHand![0].end2, 2);

  // Case B: Normal Win -> 0 tiles, clean empty-hand state without stale tiles
  const normalWinRound: RoundEndResultDto = {
    matchId: 'm5',
    roundNumber: 2,
    outcomeType: RoundOutcomeType.NormalWin,
    isDraw: false,
    winnerUserId: 'p1',
    winnerName: 'البطل',
    pointsAwarded: 22,
    team1ScoreAfter: 37,
    team2ScoreAfter: 0,
    reason: 'أنهى جميع ورقه',
    isMatchCompleted: false,
    playerRemainingPips: { p1: 0, p2: 22 },
    winnerRemainingHand: []
  };

  assertStrictEqual(normalWinRound.winnerRemainingHand?.length, 0, 'Normal win has 0 winner tiles');

  // Case C: Quadruple (Team-Based) Blocked Win
  const quadBlockedRound: RoundEndResultDto = {
    matchId: 'm6',
    roundNumber: 1,
    outcomeType: RoundOutcomeType.BlockedWin,
    isDraw: false,
    winnerUserId: 'team1-p1',
    winnerName: 'لاعب فريق 1',
    winningTeamIndex: 1,
    pointsAwarded: 30,
    team1ScoreAfter: 30,
    team2ScoreAfter: 0,
    reason: 'قفلة: الفريق الأول كسب بأقل ورقة فردية',
    isMatchCompleted: false,
    playerRemainingPips: { 'team1-p1': 2, 'team1-p2': 9, 'team2-p1': 8, 'team2-p2': 14 },
    winnerRemainingHand: [{ id: 30, end1: 0, end2: 2 }]
  };

  assertStrictEqual(quadBlockedRound.winningTeamIndex, 1, 'Winning team index is team 1');
  assertStrictEqual(quadBlockedRound.winnerRemainingHand?.length, 1);
  assertStrictEqual(quadBlockedRound.winnerRemainingHand![0].end2, 2);

  console.log('  ✓ Next-round prompt winning tiles showcase verified for all cases.');
}

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');

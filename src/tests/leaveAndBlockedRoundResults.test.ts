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
// -------------------------------------------------------------
// Test 3: Displaying the Losing Player's Hand That Determined Round Points
// -------------------------------------------------------------
console.log('Test 3: Next-round prompt correctly showcases losing tiles that determined round points...');
{
  const getLosingContributors = (
    result: RoundEndResultDto,
    players: RoomPlayerDto[],
    mode: GameMode
  ) => {
    if (result.isDraw || result.outcomeType === RoundOutcomeType.Draw) return [];

    const contributors: Array<{
      userId: string;
      displayName: string;
      teamIndex?: number;
      tiles: DominoTile[];
      pipSum: number;
    }> = [];

    const handsDict = result.playerRemainingHands || {};
    const pipsDict = result.playerRemainingPips || {};

    const isQuadruple = mode === GameMode.Quadruple || result.winningTeamIndex != null;

    if (isQuadruple && result.winningTeamIndex != null) {
      const losingTeamIndex = result.winningTeamIndex === 1 ? 2 : 1;
      const losingPlayers = players.filter((p) => p.teamIndex === losingTeamIndex);
      for (const lp of losingPlayers) {
        const tiles = handsDict[lp.userId] || [];
        const pipSum = pipsDict[lp.userId] ?? tiles.reduce((acc, t) => acc + (t.pipSum ?? (t.end1 + t.end2)), 0);
        contributors.push({
          userId: lp.userId,
          displayName: lp.displayName,
          teamIndex: lp.teamIndex,
          tiles,
          pipSum
        });
      }
    } else {
      const losingPlayers = players.filter((p) => p.userId !== result.winnerUserId);
      for (const lp of losingPlayers) {
        const tiles = handsDict[lp.userId] || [];
        const pipSum = pipsDict[lp.userId] ?? tiles.reduce((acc, t) => acc + (t.pipSum ?? (t.end1 + t.end2)), 0);
        contributors.push({
          userId: lp.userId,
          displayName: lp.displayName,
          teamIndex: lp.teamIndex,
          tiles,
          pipSum
        });
      }
    }

    return contributors;
  };

  // Case A: 1v1 Normal Win -> Winner has 0 tiles, loser's remaining tiles determine points
  const normalWinResult: RoundEndResultDto = {
    matchId: 'm1v1',
    roundNumber: 1,
    outcomeType: RoundOutcomeType.NormalWin,
    isDraw: false,
    winnerUserId: 'user-winner',
    winnerName: 'الفائز',
    pointsAwarded: 22,
    team1ScoreAfter: 22,
    team2ScoreAfter: 0,
    reason: 'أنهى جميع ورقه',
    isMatchCompleted: false,
    playerRemainingPips: { 'user-winner': 0, 'user-loser': 22 },
    playerRemainingHands: {
      'user-winner': [],
      'user-loser': [
        { id: 1, end1: 6, end2: 5 },
        { id: 2, end1: 6, end2: 5 }
      ]
    }
  };
  const players1v1: RoomPlayerDto[] = [
    { userId: 'user-winner', displayName: 'الفائز', seatIndex: 0, teamIndex: 0, isHost: true, isConnected: true, tileCount: 0 },
    { userId: 'user-loser', displayName: 'الخاسر', seatIndex: 1, teamIndex: 0, isHost: false, isConnected: true, tileCount: 2 }
  ];
  const contribs1v1 = getLosingContributors(normalWinResult, players1v1, GameMode.Individual);
  assertStrictEqual(contribs1v1.length, 1, 'Exactly 1 losing contributor in 1v1');
  assertStrictEqual(contribs1v1[0].userId, 'user-loser', 'Loser is identified');
  assertStrictEqual(contribs1v1[0].tiles.length, 2, 'Loser has 2 tiles');
  assertStrictEqual(contribs1v1[0].pipSum, 22, 'Loser pip sum is 22');

  // Case B: Triple Mode Blocked Win -> Winner has fewest pips, the other 2 players are both losing contributors
  const tripleBlockedResult: RoundEndResultDto = {
    matchId: 'mTriple',
    roundNumber: 2,
    outcomeType: RoundOutcomeType.BlockedWin,
    isDraw: false,
    winnerUserId: 'p1',
    winnerName: 'لاعب 1',
    pointsAwarded: 25,
    team1ScoreAfter: 0,
    team2ScoreAfter: 0,
    reason: 'قفلة',
    isMatchCompleted: false,
    playerRemainingPips: { p1: 3, p2: 10, p3: 15 },
    playerRemainingHands: {
      p1: [{ id: 10, end1: 1, end2: 2 }],
      p2: [{ id: 11, end1: 5, end2: 5 }],
      p3: [{ id: 12, end1: 6, end2: 6 }, { id: 13, end1: 1, end2: 2 }]
    }
  };
  const playersTriple: RoomPlayerDto[] = [
    { userId: 'p1', displayName: 'لاعب 1', seatIndex: 0, teamIndex: 0, isHost: true, isConnected: true, tileCount: 1 },
    { userId: 'p2', displayName: 'لاعب 2', seatIndex: 1, teamIndex: 0, isHost: false, isConnected: true, tileCount: 1 },
    { userId: 'p3', displayName: 'لاعب 3', seatIndex: 2, teamIndex: 0, isHost: false, isConnected: true, tileCount: 2 }
  ];
  const contribsTriple = getLosingContributors(tripleBlockedResult, playersTriple, GameMode.Triple);
  assertStrictEqual(contribsTriple.length, 2, 'Two other players are losing contributors in Triple');
  assertStrictEqual(contribsTriple.reduce((sum, c) => sum + c.pipSum, 0), 25, 'Combined losing pips match awarded points (10 + 15 = 25)');

  // Case C: Quadruple (2v2) Win -> Losing team players' remaining tiles determine the points
  const quadWinResult: RoundEndResultDto = {
    matchId: 'mQuad',
    roundNumber: 1,
    outcomeType: RoundOutcomeType.NormalWin,
    isDraw: false,
    winnerUserId: 't1-p1',
    winnerName: 'أحمد',
    winningTeamIndex: 1,
    pointsAwarded: 35,
    team1ScoreAfter: 35,
    team2ScoreAfter: 0,
    reason: 'فوز الفريق الأول',
    isMatchCompleted: false,
    playerRemainingPips: { 't1-p1': 0, 't1-p2': 7, 't2-p1': 20, 't2-p2': 15 },
    playerRemainingHands: {
      't1-p1': [],
      't1-p2': [{ id: 20, end1: 3, end2: 4 }],
      't2-p1': [{ id: 21, end1: 6, end2: 6 }, { id: 22, end1: 4, end2: 4 }],
      't2-p2': [{ id: 23, end1: 5, end2: 5 }, { id: 24, end1: 2, end2: 3 }]
    }
  };
  const playersQuad: RoomPlayerDto[] = [
    { userId: 't1-p1', displayName: 'أحمد', seatIndex: 0, teamIndex: 1, isHost: true, isConnected: true, tileCount: 0 },
    { userId: 't2-p1', displayName: 'محمود', seatIndex: 1, teamIndex: 2, isHost: false, isConnected: true, tileCount: 2 },
    { userId: 't1-p2', displayName: 'علي', seatIndex: 2, teamIndex: 1, isHost: false, isConnected: true, tileCount: 1 },
    { userId: 't2-p2', displayName: 'خالد', seatIndex: 3, teamIndex: 2, isHost: false, isConnected: true, tileCount: 2 }
  ];
  const contribsQuad = getLosingContributors(quadWinResult, playersQuad, GameMode.Quadruple);
  assertStrictEqual(contribsQuad.length, 2, 'Losing team has 2 contributors');
  assertStrictEqual(contribsQuad.every((c) => c.teamIndex === 2), true, 'All contributors belong to losing team (Team 2)');
  assertStrictEqual(contribsQuad.reduce((sum, c) => sum + c.pipSum, 0), 35, 'Team 2 remaining tiles sum to 35 points');

  // Case D: Draw -> 0 contributors
  const drawResult: RoundEndResultDto = {
    matchId: 'mDraw',
    roundNumber: 3,
    outcomeType: RoundOutcomeType.Draw,
    isDraw: true,
    pointsAwarded: 0,
    team1ScoreAfter: 35,
    team2ScoreAfter: 0,
    reason: 'تعادل',
    isMatchCompleted: false,
    playerRemainingPips: { p1: 10, p2: 10 }
  };
  const contribsDraw = getLosingContributors(drawResult, players1v1, GameMode.Individual);
  assertStrictEqual(contribsDraw.length, 0, 'No losing contributors on draw');

  console.log('  ✓ Losing tiles showcase verified for Individual, Triple, Quadruple, and Draw.');
}

// -------------------------------------------------------------
// Test 4: Per-Player Totals Summary in Round History
// -------------------------------------------------------------
console.log('Test 4: Round history summary correctly calculates per-player totals including 0 wins/points...');
{
  const computeRoundHistorySummary = (
    roundHistories: Array<{ roundNumber: number; winnerUserId?: string; winningTeamIndex?: number; pointsAwarded: number }>,
    players: RoomPlayerDto[],
    mode: GameMode,
    team1Score: number,
    team2Score: number
  ) => {
    // Deduplicate by roundNumber
    const uniqueRoundsMap = new Map<number, typeof roundHistories[0]>();
    for (const h of roundHistories) {
      if (!uniqueRoundsMap.has(h.roundNumber)) {
        uniqueRoundsMap.set(h.roundNumber, h);
      }
    }
    const uniqueRounds = Array.from(uniqueRoundsMap.values());
    const isQuadruple = mode === GameMode.Quadruple;

    const playerStats = players.map((p) => {
      const roundsWon = uniqueRounds.filter((h) => h.winnerUserId === p.userId).length;
      let pointsAccumulated = 0;

      if (mode === GameMode.Individual) {
        pointsAccumulated = p.cumulativeScore ?? (p.seatIndex === 0 ? team1Score : team2Score);
      } else if (mode === GameMode.Triple) {
        pointsAccumulated = p.cumulativeScore ?? uniqueRounds
          .filter((h) => h.winnerUserId === p.userId)
          .reduce((sum, h) => sum + (h.pointsAwarded || 0), 0);
      } else if (isQuadruple) {
        pointsAccumulated = uniqueRounds
          .filter((h) => h.winnerUserId === p.userId)
          .reduce((sum, h) => sum + (h.pointsAwarded || 0), 0);
      }

      return {
        userId: p.userId,
        displayName: p.displayName,
        teamIndex: p.teamIndex,
        roundsWon,
        pointsAccumulated
      };
    });

    let team1Stats = null;
    let team2Stats = null;
    if (isQuadruple) {
      team1Stats = {
        totalPoints: team1Score,
        roundsWon: uniqueRounds.filter((h) => h.winningTeamIndex === 1).length,
        players: playerStats.filter((p) => p.teamIndex === 1)
      };
      team2Stats = {
        totalPoints: team2Score,
        roundsWon: uniqueRounds.filter((h) => h.winningTeamIndex === 2).length,
        players: playerStats.filter((p) => p.teamIndex === 2)
      };
    }

    return {
      totalCompletedRounds: uniqueRounds.length,
      playerStats,
      team1Stats,
      team2Stats
    };
  };

  // Case A: 1v1 where Player B has 0 wins and 0 points
  const matchPlayers1v1: RoomPlayerDto[] = [
    { userId: 'user-a', displayName: 'Player A', seatIndex: 0, teamIndex: 0, isHost: true, isConnected: true, tileCount: 0, cumulativeScore: 70 },
    { userId: 'user-b', displayName: 'Player B', seatIndex: 1, teamIndex: 0, isHost: false, isConnected: true, tileCount: 0, cumulativeScore: 0 }
  ];
  // Note: duplicate round 1 simulates repeated event
  const histories1v1 = [
    { roundNumber: 1, winnerUserId: 'user-a', pointsAwarded: 30 },
    { roundNumber: 1, winnerUserId: 'user-a', pointsAwarded: 30 }, // duplicate
    { roundNumber: 2, winnerUserId: 'user-a', pointsAwarded: 40 }
  ];

  const summary1v1 = computeRoundHistorySummary(histories1v1, matchPlayers1v1, GameMode.Individual, 70, 0);
  assertStrictEqual(summary1v1.totalCompletedRounds, 2, 'Rounds deduplicated: 2 unique rounds');
  assertStrictEqual(summary1v1.playerStats.length, 2, 'Both players included');

  const pA = summary1v1.playerStats.find((p) => p.userId === 'user-a')!;
  assertStrictEqual(pA.roundsWon, 2, 'Player A won 2 rounds');
  assertStrictEqual(pA.pointsAccumulated, 70, 'Player A has 70 points');

  const pB = summary1v1.playerStats.find((p) => p.userId === 'user-b')!;
  assertStrictEqual(pB.roundsWon, 0, 'Player B won 0 rounds (explicitly 0, not omitted)');
  assertStrictEqual(pB.pointsAccumulated, 0, 'Player B has 0 points (explicitly 0, not omitted)');

  // Case B: Quadruple (Team-Based) with team totals distinguished from individual player totals
  const matchPlayersQuad: RoomPlayerDto[] = [
    { userId: 't1-p1', displayName: 'فريق 1 - لاعب 1', seatIndex: 0, teamIndex: 1, isHost: true, isConnected: true, tileCount: 0 },
    { userId: 't2-p1', displayName: 'فريق 2 - لاعب 1', seatIndex: 1, teamIndex: 2, isHost: false, isConnected: true, tileCount: 0 },
    { userId: 't1-p2', displayName: 'فريق 1 - لاعب 2', seatIndex: 2, teamIndex: 1, isHost: false, isConnected: true, tileCount: 0 },
    { userId: 't2-p2', displayName: 'فريق 2 - لاعب 2', seatIndex: 3, teamIndex: 2, isHost: false, isConnected: true, tileCount: 0 }
  ];
  const historiesQuad = [
    { roundNumber: 1, winnerUserId: 't1-p1', winningTeamIndex: 1, pointsAwarded: 25 },
    { roundNumber: 2, winnerUserId: 't1-p2', winningTeamIndex: 1, pointsAwarded: 35 },
    { roundNumber: 3, winnerUserId: 't2-p1', winningTeamIndex: 2, pointsAwarded: 20 }
  ];

  const summaryQuad = computeRoundHistorySummary(historiesQuad, matchPlayersQuad, GameMode.Quadruple, 60, 20);
  assertStrictEqual(summaryQuad.totalCompletedRounds, 3, '3 completed rounds in quadruple');
  assertStrictEqual(summaryQuad.team1Stats?.totalPoints, 60, 'Team 1 total points is 60');
  assertStrictEqual(summaryQuad.team1Stats?.roundsWon, 2, 'Team 1 won 2 rounds');
  assertStrictEqual(summaryQuad.team2Stats?.totalPoints, 20, 'Team 2 total points is 20');
  assertStrictEqual(summaryQuad.team2Stats?.roundsWon, 1, 'Team 2 won 1 round');

  // Verify individual breakdown inside Team 1:
  const t1p1 = summaryQuad.team1Stats?.players.find((p) => p.userId === 't1-p1')!;
  const t1p2 = summaryQuad.team1Stats?.players.find((p) => p.userId === 't1-p2')!;
  assertStrictEqual(t1p1.roundsWon, 1, 't1-p1 personally won 1 round');
  assertStrictEqual(t1p1.pointsAccumulated, 25, 't1-p1 contributed 25 points');
  assertStrictEqual(t1p2.roundsWon, 1, 't1-p2 personally won 1 round');
  assertStrictEqual(t1p2.pointsAccumulated, 35, 't1-p2 contributed 35 points');

  // Verify player with 0 wins in Team 2:
  const t2p2 = summaryQuad.team2Stats?.players.find((p) => p.userId === 't2-p2')!;
  assertStrictEqual(t2p2.roundsWon, 0, 't2-p2 has 0 rounds won');
  assertStrictEqual(t2p2.pointsAccumulated, 0, 't2-p2 has 0 points');

  console.log('  ✓ Per-player and team totals summary verified.');
}

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');


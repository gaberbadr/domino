export enum GameMode {
  Individual = 1, // 1v1
  Triple = 2,     // 3 players
  Quadruple = 3   // 4 players (2 teams)
}

export enum RoomStatus {
  Waiting = 0,
  InProgress = 1,
  Finished = 2,
  Deleted = 3
}

export enum MatchStatus {
  Active = 0,
  RoundEnded = 1,
  Completed = 2,
  Cancelled = 3
}

export enum RoundOutcomeType {
  NormalWin = 0,
  BlockedWin = 1,
  Draw = 2
}

export enum BoardEnd {
  Left = 1,
  Right = 2
}

export interface DominoTile {
  id: number;
  end1: number;
  end2: number;
  isDouble?: boolean;
  pipSum?: number;
}

export interface BoardPlacedTile {
  tileId: number;
  leftPip: number;
  rightPip: number;
  placedAt?: BoardEnd;
  orderIndex: number;
}

export interface RoomPlayerDto {
  userId: string;
  displayName: string;
  seatIndex: number;
  teamIndex: number; // 1 or 2 in Quadruple; 0 otherwise
  isHost: boolean;
  isConnected: boolean;
  tileCount: number;
}

export interface RoomDto {
  id: string;
  roomCode: string;
  name: string;
  mode: GameMode;
  isPrivate: boolean;
  maxPlayers: number;
  currentPlayersCount: number;
  hostId: string;
  hostName: string;
  status: RoomStatus;
  currentMatchId?: string;
  players: RoomPlayerDto[];
}

export interface LegalMoveDto {
  tile: DominoTile;
  canPlaceLeft: boolean;
  canPlaceRight: boolean;
  requiresChoice: boolean;
}

export interface PlayerPrivateStateDto {
  hand: DominoTile[];
  legalMoves: LegalMoveDto[];
  canDraw: boolean;
  canSkip: boolean;
}

export interface GameMatchDto {
  id: string;
  roomId: string;
  mode: GameMode;
  status: MatchStatus;
  roundNumber: number;
  team1Score: number;
  team2Score: number;
  winnerUserId?: string;
  winningTeamIndex?: number;
  currentTurnUserId?: string;
  turnDeadlineUtc?: string;
  openLeft?: number;
  openRight?: number;
  bankCount: number;
  boardChain: BoardPlacedTile[];
  players: RoomPlayerDto[];
  pendingTeammateStarterUserId?: string;
}

export interface BoardUpdateDto {
  matchId: string;
  placedTile: BoardPlacedTile;
  newOpenLeft?: number;
  newOpenRight?: number;
  playedByUserId: string;
  playerRemainingTileCount: number;
}

export interface InvalidDealNotificationDto {
  matchId: string;
  invalidUserId: string;
  invalidUserName: string;
  reason: string;
  revealedHand: DominoTile[];
}

export interface RoundEndResultDto {
  matchId: string;
  roundNumber: number;
  outcomeType: RoundOutcomeType;
  isDraw: boolean;
  winnerUserId?: string;
  winnerName?: string;
  winningTeamIndex?: number;
  pointsAwarded: number;
  team1ScoreAfter: number;
  team2ScoreAfter: number;
  reason: string;
  nextStarterUserId?: string;
  nextStarterName?: string;
  nextStarterReason?: string;
  isMatchCompleted: boolean;
  playerRemainingPips: Record<string, number>;
}

export interface MatchEndResultDto {
  matchId: string;
  winnerUserId?: string;
  winnerName?: string;
  winningTeamIndex?: number;
  finalTeam1Score: number;
  finalTeam2Score: number;
  reason: string;
}

export interface UserProfileDto {
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isAdmin: boolean;
  profilePictureUrl?: string;
}

export interface AdminPlayerDto {
  userId: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminPlayerListResponse {
  players: AdminPlayerDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateRoomRequest {
  name: string;
  mode: GameMode;
  isPrivate: boolean;
  password?: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  password?: string;
}

export interface PlayTileRequest {
  matchId: string;
  tileId: number;
  chosenEnd?: BoardEnd;
}


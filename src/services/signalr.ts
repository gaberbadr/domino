import * as signalR from '@microsoft/signalr';
import { tokenStorage, isAccessTokenExpired, refreshAccessToken } from './api';
import { appConfig } from '../config/appConfig';

const HUB_URL = appConfig.hubUrl;

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;

  public async start(): Promise<signalR.HubConnection> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return this.connection;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        return this.connection;
      }
    }

    this.isConnecting = true;

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: async () => {
            if (isAccessTokenExpired(30)) {
              const fresh = await refreshAccessToken();
              if (fresh) return fresh;
            }
            return tokenStorage.getAccessToken() || '';
          },
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      await this.connection.start();
      return this.connection;
    } finally {
      this.isConnecting = false;
    }
  }

  public getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  public async stop(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } finally {
        this.connection = null;
      }
    }
  }

  public async joinRoomGroup(roomCode: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinRoomGroup', roomCode);
    }
  }

  public async leaveRoomGroup(roomCode: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveRoomGroup', roomCode);
    }
  }

  public async joinVoice(roomCode: string, voiceToken?: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinVoice', roomCode, voiceToken || null);
    }
  }

  public async leaveVoice(roomCode: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveVoice', roomCode);
    }
  }

  public async sendOffer(roomCode: string, targetUserId: string, sdp: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendOffer', roomCode, targetUserId, sdp);
    }
  }

  public async sendAnswer(roomCode: string, targetUserId: string, sdp: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendAnswer', roomCode, targetUserId, sdp);
    }
  }

  public async sendIceCandidate(roomCode: string, targetUserId: string, candidate: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendIceCandidate', roomCode, targetUserId, candidate);
    }
  }

  public async playSoundboardClip(roomCode: string, soundKey: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('PlaySoundboardClip', roomCode, soundKey);
    }
  }
}

export const signalRService = new SignalRService();

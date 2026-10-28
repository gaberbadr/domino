import * as signalR from '@microsoft/signalr';
import { tokenStorage } from './api';

const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://localhost:7237/hubs/game';

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
          accessTokenFactory: () => tokenStorage.getAccessToken() || '',
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

  public async joinVoice(roomCode: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinVoice', roomCode);
    }
  }

  public async leaveVoice(roomCode: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveVoice', roomCode);
    }
  }

  public async sendOffer(targetUserId: string, sdp: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendOffer', targetUserId, sdp);
    }
  }

  public async sendAnswer(targetUserId: string, sdp: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendAnswer', targetUserId, sdp);
    }
  }

  public async sendIceCandidate(targetUserId: string, candidate: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('SendIceCandidate', targetUserId, candidate);
    }
  }

  public async playSoundboardClip(roomCode: string, soundKey: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('PlaySoundboardClip', roomCode, soundKey);
    }
  }
}

export const signalRService = new SignalRService();

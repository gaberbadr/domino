import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  RemoteParticipant,
  LocalParticipant,
  Participant,
  RemoteTrackPublication,
  RemoteTrack
} from 'livekit-client';
import { api, getUserFromToken } from './api';

export type MicState = 'muted' | 'active' | 'connecting' | 'permission_denied' | 'failed';
export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface VoiceParticipant {
  userId: string;
  userName: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
}

export interface VoicePeerState {
  userId: string;
  userName: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted?: boolean;
}

export interface LiveKitVoiceListener {
  onMicStateChanged?: (state: MicState) => void;
  onConnectionStateChanged?: (state: VoiceConnectionState) => void;
  onParticipantsChanged?: (participants: VoiceParticipant[]) => void;
  onPeersChanged?: (peers: VoicePeerState[]) => void;
  onSpeakingChanged?: (userId: string, isSpeaking: boolean) => void;
  onAutoplayBlockedChanged?: (blocked: boolean) => void;
  onError?: (error: string) => void;
}

export class LiveKitVoiceService {
  private room: Room | null = null;
  private currentRoomCode: string | null = null;
  private currentVoiceRoomId: string | null = null;
  private connectionState: VoiceConnectionState = 'disconnected';
  private micState: MicState = 'muted';
  private isSpeakerMuted: boolean = false;
  private isAutoplayBlocked: boolean = false;
  private participants: Map<string, VoiceParticipant> = new Map();
  private listeners: Set<LiveKitVoiceListener> = new Set();
  private isConnecting: boolean = false;

  constructor() {
    // Setup window-level unlock listener on first user click
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
  }

  // -------------------------------------------------------------------------
  // Subscriptions & State Getters
  // -------------------------------------------------------------------------

  public subscribe(listener: LiveKitVoiceListener): () => void {
    this.listeners.add(listener);
    // Emit initial states
    listener.onConnectionStateChanged?.(this.connectionState);
    listener.onMicStateChanged?.(this.micState);
    listener.onParticipantsChanged?.(this.getParticipants());
    listener.onPeersChanged?.(this.getPeers());
    listener.onAutoplayBlockedChanged?.(this.isAutoplayBlocked);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getConnectionState(): VoiceConnectionState {
    return this.connectionState;
  }

  public getMicState(): MicState {
    return this.micState;
  }

  public isSpeakerMutedState(): boolean {
    return this.isSpeakerMuted;
  }

  public getIsAutoplayBlocked(): boolean {
    return this.isAutoplayBlocked;
  }

  public getCurrentRoomCode(): string | null {
    return this.currentRoomCode;
  }

  public getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }

  public getPeers(): VoicePeerState[] {
    // Return only remote participants formatted as VoicePeerState for backward compatibility
    return Array.from(this.participants.values())
      .filter((p) => !p.isLocal)
      .map((p) => ({
        userId: p.userId,
        userName: p.userName,
        avatarUrl: p.avatarUrl,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted
      }));
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  /**
   * Authoritative entry point: requests LiveKit participant token from backend
   * and establishes real-time WebRTC audio connection to LiveKit Cloud.
   */
  public async joinRoom(roomCode: string, userId?: string, userName?: string): Promise<void> {
    if (!roomCode) return;
    const cleanRoomCode = roomCode.trim().toUpperCase();

    // If already in this room and connected, keep connection (e.g. across lobby -> game transition)
    if (this.currentRoomCode === cleanRoomCode && this.connectionState === 'connected' && this.room) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.currentRoomCode = cleanRoomCode;
    this.setConnectionState('connecting');

    try {
      // 1. Fetch room-scoped LiveKit access token from backend
      const tokenDto = await api.voice.getToken(cleanRoomCode);
      if (!tokenDto || !tokenDto.token) {
        throw new Error('لم يتم استلام تصريح الدخول لغرفة الصوت من الخادم');
      }

      const liveKitUrl = tokenDto.liveKitUrl || 'wss://domino-wporumgs.livekit.cloud';
      this.currentVoiceRoomId = tokenDto.voiceRoomId;

      // Clean up previous room instance if any
      if (this.room) {
        try {
          await this.room.disconnect();
        } catch {
          // ignore
        }
        this.room = null;
      }

      // 2. Initialize official LiveKit Room with noise suppression and echo cancellation
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.room = room;
      this.setupRoomListeners(room);

      // 3. Connect to LiveKit Cloud
      await room.connect(liveKitUrl, tokenDto.token);

      // 4. Register local participant in state
      const localId = room.localParticipant.identity || userId || '';
      const localName = room.localParticipant.name || userName || 'أنا';

      this.participants.set(localId, {
        userId: localId,
        userName: localName,
        isSpeaking: false,
        isMuted: true,
        isLocal: true
      });

      // Register already-connected remote participants
      room.remoteParticipants.forEach((p) => {
        this.addRemoteParticipant(p);
      });

      this.setConnectionState('connected');
      this.notifyParticipants();

      // 5. Automatically enable local microphone if not permission denied
      await this.enableMicrophone();
    } catch (err: any) {
      console.error('Failed to connect to LiveKit voice room:', err);
      this.setConnectionState('error');
      const msg = err.message || 'فشل الاتصال بغرفة الصوت';
      this.notifyError(msg);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Cleanly leaves the voice room and releases local microphone and media elements.
   */
  public async leaveRoom(): Promise<void> {
    this.isConnecting = false;
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (err) {
        console.warn('Error during LiveKit room disconnect:', err);
      }
      this.room = null;
    }

    // Remove all attached audio elements
    if (typeof document !== 'undefined') {
      const audioEls = document.querySelectorAll('audio[data-livekit-voice]');
      audioEls.forEach((el) => el.remove());
    }

    this.currentRoomCode = null;
    this.currentVoiceRoomId = null;
    this.participants.clear();
    this.setConnectionState('disconnected');
    this.setMicState('muted');
    this.notifyParticipants();
  }

  /**
   * Compatibility alias for leaveRoom
   */
  public async leaveSession(): Promise<void> {
    await this.leaveRoom();
  }

  // -------------------------------------------------------------------------
  // Microphone & Speaker Controls
  // -------------------------------------------------------------------------

  public async setMicMuted(muted: boolean): Promise<void> {
    if (!this.room || this.connectionState !== 'connected') {
      this.setMicState(muted ? 'muted' : 'active');
      return;
    }

    try {
      this.setMicState('connecting');
      await this.room.localParticipant.setMicrophoneEnabled(!muted);
      this.setMicState(muted ? 'muted' : 'active');

      const localId = this.room.localParticipant.identity;
      const local = this.participants.get(localId);
      if (local) {
        local.isMuted = muted;
        this.notifyParticipants();
      }
    } catch (err: any) {
      console.error('Failed to change mic mute state:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.message?.toLowerCase().includes('permission') ||
        err.message?.toLowerCase().includes('denied')
      ) {
        this.setMicState('permission_denied');
        this.notifyError('إذن المايكروفون مرفوض من المتصفح. اضغط للسماح بالوصول.');
      } else {
        this.setMicState('failed');
        this.notifyError('تعذر تفعيل المايكروفون');
      }
    }
  }

  public async startLocalAudio(): Promise<void> {
    await this.setMicMuted(false);
  }

  public setSpeakerMuted(muted: boolean): void {
    this.isSpeakerMuted = muted;

    if (typeof document !== 'undefined') {
      const audioEls = document.querySelectorAll<HTMLAudioElement>('audio[data-livekit-voice]');
      audioEls.forEach((el) => {
        el.muted = muted;
      });
    }

    this.unlockAudio();
  }

  public unlockAudio(): void {
    this.isAutoplayBlocked = false;
    this.notifyAutoplayBlocked(false);

    if (typeof document !== 'undefined') {
      const audioEls = document.querySelectorAll<HTMLAudioElement>('audio[data-livekit-voice]');
      audioEls.forEach((el) => {
        if (el.paused && !this.isSpeakerMuted) {
          el.play().catch(() => {});
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Internal LiveKit Listeners & Event Handling
  // -------------------------------------------------------------------------

  private setupRoomListeners(room: Room): void {
    room.on(RoomEvent.Connected, () => {
      this.setConnectionState('connected');
    });

    room.on(RoomEvent.Reconnecting, () => {
      this.setConnectionState('reconnecting');
    });

    room.on(RoomEvent.Reconnected, () => {
      this.setConnectionState('connected');
    });

    room.on(RoomEvent.Disconnected, () => {
      if (this.connectionState !== 'disconnected') {
        this.setConnectionState('disconnected');
        this.setMicState('muted');
        this.participants.clear();
        this.notifyParticipants();
      }
    });

    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.addRemoteParticipant(participant);
      this.notifyParticipants();
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.removeRemoteParticipant(participant.identity);
      this.notifyParticipants();
    });

    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach();
          audioEl.setAttribute('data-livekit-voice', 'true');
          audioEl.setAttribute('data-participant-id', participant.identity);
          audioEl.style.display = 'none';
          audioEl.muted = this.isSpeakerMuted;

          if (!document.body.contains(audioEl)) {
            document.body.appendChild(audioEl);
          }

          audioEl.play().catch((err: any) => {
            if (err.name === 'NotAllowedError') {
              this.isAutoplayBlocked = true;
              this.notifyAutoplayBlocked(true);
            }
          });
        }
      }
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack) => {
        track.detach().forEach((el) => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      }
    );

    room.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (publication.kind === Track.Kind.Audio) {
        const p = this.participants.get(participant.identity);
        if (p) {
          p.isMuted = true;
          this.notifyParticipants();
        }
      }
    });

    room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (publication.kind === Track.Kind.Audio) {
        const p = this.participants.get(participant.identity);
        if (p) {
          p.isMuted = false;
          this.notifyParticipants();
        }
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const activeIds = new Set(speakers.map((s) => s.identity));

      // Local speaking
      const localId = room.localParticipant.identity;
      const isLocalSpeaking = activeIds.has(localId);
      const localP = this.participants.get(localId);
      if (localP && localP.isSpeaking !== isLocalSpeaking) {
        localP.isSpeaking = isLocalSpeaking;
      }
      this.notifySpeaking('local', isLocalSpeaking);

      // Remote speaking
      let changed = false;
      this.participants.forEach((p) => {
        if (!p.isLocal) {
          const isSpeaking = activeIds.has(p.userId);
          if (p.isSpeaking !== isSpeaking) {
            p.isSpeaking = isSpeaking;
            changed = true;
            this.notifySpeaking(p.userId, isSpeaking);
          }
        }
      });

      if (changed) {
        this.notifyParticipants();
      }
    });
  }

  private async enableMicrophone(): Promise<void> {
    if (!this.room) return;

    try {
      this.setMicState('connecting');
      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.setMicState('active');

      const localId = this.room.localParticipant.identity;
      const local = this.participants.get(localId);
      if (local) {
        local.isMuted = false;
        this.notifyParticipants();
      }
    } catch (err: any) {
      console.warn('Microphone activation notice:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.message?.toLowerCase().includes('permission') ||
        err.message?.toLowerCase().includes('denied')
      ) {
        this.setMicState('permission_denied');
        this.notifyError('إذن المايكروفون غير مفعل في المتصفح. انقر على زر المايكروفون للسماح.');
      } else {
        this.setMicState('failed');
      }
    }
  }

  private addRemoteParticipant(p: RemoteParticipant): void {
    let avatarUrl: string | undefined;
    try {
      if (p.metadata) {
        const parsed = JSON.parse(p.metadata);
        avatarUrl = parsed.avatarUrl;
      }
    } catch {
      // ignore
    }

    const isMuted = !p.isMicrophoneEnabled;

    this.participants.set(p.identity, {
      userId: p.identity,
      userName: p.name || 'لاعب',
      avatarUrl,
      isSpeaking: p.isSpeaking,
      isMuted,
      isLocal: false
    });
  }

  private removeRemoteParticipant(identity: string): void {
    this.participants.delete(identity);

    if (typeof document !== 'undefined') {
      const audioEls = document.querySelectorAll(`audio[data-participant-id="${identity}"]`);
      audioEls.forEach((el) => el.remove());
    }
  }

  // -------------------------------------------------------------------------
  // Notification Dispatchers
  // -------------------------------------------------------------------------

  private setConnectionState(state: VoiceConnectionState): void {
    this.connectionState = state;
    this.listeners.forEach((l) => l.onConnectionStateChanged?.(state));
  }

  private setMicState(state: MicState): void {
    this.micState = state;
    this.listeners.forEach((l) => l.onMicStateChanged?.(state));
  }

  private notifyParticipants(): void {
    const list = this.getParticipants();
    const peers = this.getPeers();
    this.listeners.forEach((l) => {
      l.onParticipantsChanged?.(list);
      l.onPeersChanged?.(peers);
    });
  }

  private notifySpeaking(userId: string, isSpeaking: boolean): void {
    this.listeners.forEach((l) => l.onSpeakingChanged?.(userId, isSpeaking));
  }

  private notifyAutoplayBlocked(blocked: boolean): void {
    this.listeners.forEach((l) => l.onAutoplayBlockedChanged?.(blocked));
  }

  private notifyError(message: string): void {
    this.listeners.forEach((l) => l.onError?.(message));
  }
}

export const livekitVoiceService = new LiveKitVoiceService();

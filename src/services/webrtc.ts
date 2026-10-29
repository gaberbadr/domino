import { signalRService } from './signalr';
import { api } from './api';
import { RtcIceServerDto } from '../types/domino';

export type MicState = 'idle' | 'connecting' | 'active' | 'muted' | 'permission_denied' | 'failed';

export interface VoicePeerState {
  userId: string;
  userName: string;
  isSpeaking: boolean;
  audioElement?: HTMLAudioElement;
  connection?: RTCPeerConnection;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export class WebRtcVoiceService {
  private currentRoomCode: string | null = null;
  private currentUserId: string = '';
  private currentUserName: string = '';
  private voiceToken: string | null = null;
  private iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS;

  private localStream: MediaStream | null = null;
  private peers: Map<string, VoicePeerState> = new Map();
  private candidateQueue: Map<string, RTCIceCandidateInit[]> = new Map();

  private micState: MicState = 'idle';
  private isSpeakerMuted: boolean = false;
  private isAutoplayBlocked: boolean = false;
  private isLocalSpeaking: boolean = false;

  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalysers: Map<string, AnalyserNode> = new Map();
  private animationFrameId: number | null = null;

  // Listeners
  private onMicStateChanged?: (state: MicState) => void;
  private onPeersChanged?: (peers: VoicePeerState[]) => void;
  private onSpeakingChanged?: (userId: string, isSpeaking: boolean) => void;
  private onAutoplayBlockedChanged?: (blocked: boolean) => void;
  private onError?: (msg: string | null) => void;

  public subscribe(callbacks: {
    onMicStateChanged?: (state: MicState) => void;
    onPeersChanged?: (peers: VoicePeerState[]) => void;
    onSpeakingChanged?: (userId: string, isSpeaking: boolean) => void;
    onAutoplayBlockedChanged?: (blocked: boolean) => void;
    onError?: (msg: string | null) => void;
  }) {
    this.onMicStateChanged = callbacks.onMicStateChanged;
    this.onPeersChanged = callbacks.onPeersChanged;
    this.onSpeakingChanged = callbacks.onSpeakingChanged;
    this.onAutoplayBlockedChanged = callbacks.onAutoplayBlockedChanged;
    this.onError = callbacks.onError;

    // Immediately notify current state
    this.onMicStateChanged?.(this.micState);
    this.onPeersChanged?.(Array.from(this.peers.values()));
    this.onSpeakingChanged?.('local', this.isLocalSpeaking);
    this.onAutoplayBlockedChanged?.(this.isAutoplayBlocked);
  }

  public getMicState(): MicState {
    return this.micState;
  }

  public isSpeakerMutedState(): boolean {
    return this.isSpeakerMuted;
  }

  public getPeers(): VoicePeerState[] {
    return Array.from(this.peers.values());
  }

  public getIsAutoplayBlocked(): boolean {
    return this.isAutoplayBlocked;
  }

  public getRoomCode(): string | null {
    return this.currentRoomCode;
  }

  /**
   * Authoritative entry point: requests signed voice token from backend,
   * binds room-scoped channel, registers SignalR signaling, and connects peers.
   */
  public async joinRoom(roomCode: string, userId: string, userName?: string): Promise<void> {
    if (!roomCode || !userId) return;

    const cleanRoomCode = roomCode.trim().toUpperCase();

    // If already in this room and connected, no-op (preserves voice across lobby -> game transition)
    if (this.currentRoomCode === cleanRoomCode && this.currentUserId === userId) {
      return;
    }

    // Leaving previous room if different
    if (this.currentRoomCode && this.currentRoomCode !== cleanRoomCode) {
      this.leaveSession();
    }

    this.currentRoomCode = cleanRoomCode;
    this.currentUserId = userId;
    this.currentUserName = userName || 'لاعب';

    try {
      // 1. Fetch room-scoped voice access token from backend
      const tokenDto = await api.voice.getToken(cleanRoomCode);
      this.voiceToken = tokenDto.token;

      if (tokenDto.iceServers && tokenDto.iceServers.length > 0) {
        this.iceServers = tokenDto.iceServers.map((s: RtcIceServerDto) => ({
          urls: s.urls,
          username: s.username,
          credential: s.credential
        }));
      } else {
        this.iceServers = DEFAULT_ICE_SERVERS;
      }
    } catch (err: any) {
      console.warn('Voice token acquisition failed, proceeding with SignalR authorization fallback:', err);
      this.voiceToken = null;
      this.iceServers = DEFAULT_ICE_SERVERS;
    }

    // 2. Setup SignalR listeners for voice
    const conn = await signalRService.start();
    if (!conn) return;

    this.registerSignalRListeners(conn);

    // 3. Join the room voice channel on backend
    await signalRService.joinVoice(cleanRoomCode, this.voiceToken || undefined);

    // 4. Default mic state is muted until user unmutes
    if (this.micState === 'idle') {
      this.micState = 'muted';
      this.onMicStateChanged?.(this.micState);
    }
  }

  private registerSignalRListeners(conn: any) {
    conn.off('VoiceExistingPeers');
    conn.off('VoicePeerJoined');
    conn.off('VoicePeerLeft');
    conn.off('ReceiveOffer');
    conn.off('ReceiveAnswer');
    conn.off('ReceiveIceCandidate');

    conn.on('VoiceExistingPeers', (existingPeers: { userId: string; displayName: string }[]) => {
      this.handleExistingPeers(existingPeers);
    });

    conn.on('VoicePeerJoined', (userId: string, userName: string) => {
      this.handlePeerJoined(userId, userName);
    });

    conn.on('VoicePeerLeft', (userId: string) => {
      this.handlePeerLeft(userId);
    });

    conn.on('ReceiveOffer', (fromUserId: string, sdp: string) => {
      this.handleReceiveOffer(fromUserId, sdp);
    });

    conn.on('ReceiveAnswer', (fromUserId: string, sdp: string) => {
      this.handleReceiveAnswer(fromUserId, sdp);
    });

    conn.on('ReceiveIceCandidate', (fromUserId: string, candidate: string) => {
      this.handleReceiveIceCandidate(fromUserId, candidate);
    });
  }

  /**
   * New joiner discovers existing peers in room.
   * Deterministic Single-Initiator Rule: Joiner creates connection with isInitiator = true and sends offer.
   */
  public async handleExistingPeers(existingPeers: { userId: string; displayName: string }[]) {
    for (const peer of existingPeers) {
      if (peer.userId === this.currentUserId) continue;
      await this.createPeerConnection(peer.userId, peer.displayName, true);
    }
  }

  /**
   * Existing peer discovers a newly joined peer.
   * Deterministic Single-Initiator Rule: Existing peer prepares connection with isInitiator = false and awaits offer.
   */
  public async handlePeerJoined(userId: string, userName: string) {
    if (userId === this.currentUserId) return;
    await this.createPeerConnection(userId, userName, false);
  }

  private async createPeerConnection(userId: string, userName: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const existing = this.peers.get(userId);
    if (existing && existing.connection && existing.connection.signalingState !== 'closed') {
      return existing.connection;
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    const peerState: VoicePeerState = {
      userId,
      userName,
      isSpeaking: false,
      connection: pc
    };
    this.peers.set(userId, peerState);
    this.notifyPeers();

    // 1. Guaranteed Audio Transceiver:
    // Adding audio transceiver ensures SDP offer/answer ALWAYS contains active m=audio description!
    const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });

    // Attach existing local audio track if microphone is currently enabled
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack && transceiver.sender) {
        transceiver.sender.replaceTrack(audioTrack).catch((err) => {
          console.warn('Failed to attach initial local audio track:', err);
        });
      }
    }

    // 2. Remote track playback handling
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      let audio = peerState.audioElement;
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        // Required for iOS Safari
        (audio as any).playsInline = true;
        audio.muted = this.isSpeakerMuted;
        peerState.audioElement = audio;
      }

      audio.srcObject = stream;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Autoplay policy prevented playback until user interaction
          if (err.name === 'NotAllowedError') {
            this.isAutoplayBlocked = true;
            this.onAutoplayBlockedChanged?.(true);
          }
        });
      }

      this.setupSpeakingDetector(userId, stream);
    };

    // 3. ICE Candidate candidate dispatching
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomCode) {
        signalRService.sendIceCandidate(this.currentRoomCode, userId, JSON.stringify(event.candidate));
      }
    };

    // 4. Connection state monitoring
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        // Handled via leave or reconnect
      }
    };

    // 5. If initiator, generate offer and send to peer
    if (isInitiator && this.currentRoomCode) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signalRService.sendOffer(this.currentRoomCode, userId, JSON.stringify(offer));
      } catch (err) {
        console.error('Failed to create offer for peer', userId, err);
      }
    }

    return pc;
  }

  public async handleReceiveOffer(fromUserId: string, sdp: string) {
    if (fromUserId === this.currentUserId || !this.currentRoomCode) return;

    let peer = this.peers.get(fromUserId);
    let pc = peer?.connection;

    if (!pc || pc.signalingState === 'closed') {
      pc = await this.createPeerConnection(fromUserId, peer?.userName || 'لاعب', false);
      peer = this.peers.get(fromUserId);
    }

    try {
      const offerDesc = new RTCSessionDescription(JSON.parse(sdp));

      // Perfect Negotiation / Glare handling:
      // If we are already in have-local-offer, check whether we are the "polite" peer
      const isOfferCollision = pc.signalingState !== 'stable' || pc.localDescription !== null;
      if (isOfferCollision) {
        const isPolite = this.currentUserId.localeCompare(fromUserId) > 0;
        if (!isPolite) {
          // Impolite peer discards incoming colliding offer
          return;
        }
        // Polite peer rolls back its own offer to accept the remote offer
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch {
          // Rollback fallback
        }
      }

      await pc.setRemoteDescription(offerDesc);

      // Flush queued ICE candidates
      await this.flushCandidateQueue(fromUserId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signalRService.sendAnswer(this.currentRoomCode, fromUserId, JSON.stringify(answer));
    } catch (err) {
      console.error('Failed to handle receive offer from', fromUserId, err);
    }
  }

  public async handleReceiveAnswer(fromUserId: string, sdp: string) {
    const peer = this.peers.get(fromUserId);
    const pc = peer?.connection;
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        const answerDesc = new RTCSessionDescription(JSON.parse(sdp));
        await pc.setRemoteDescription(answerDesc);
        await this.flushCandidateQueue(fromUserId, pc);
      } catch (err) {
        console.error('Failed to set remote answer from', fromUserId, err);
      }
    }
  }

  public async handleReceiveIceCandidate(fromUserId: string, candidateStr: string) {
    try {
      const candidateInit: RTCIceCandidateInit = JSON.parse(candidateStr);
      const peer = this.peers.get(fromUserId);
      const pc = peer?.connection;

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } else {
        const queue = this.candidateQueue.get(fromUserId) || [];
        queue.push(candidateInit);
        this.candidateQueue.set(fromUserId, queue);
      }
    } catch (err) {
      console.warn('Failed to add candidate from', fromUserId, err);
    }
  }

  private async flushCandidateQueue(userId: string, pc: RTCPeerConnection) {
    const queue = this.candidateQueue.get(userId);
    if (queue && queue.length > 0) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('Failed to add queued candidate:', err);
        }
      }
      this.candidateQueue.delete(userId);
    }
  }

  /**
   * Microphone capture and unmuting:
   * Requests media permission, attaches local tracks across all peers via replaceTrack,
   * without renegotiation interruption.
   */
  public async startLocalAudio(): Promise<boolean> {
    try {
      this.micState = 'connecting';
      this.onMicStateChanged?.(this.micState);
      this.onError?.(null);

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        this.micState = 'active';
        this.onMicStateChanged?.(this.micState);
        this.attachLocalTracksToAllPeers();
        return true;
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.micState = 'active';
      this.onMicStateChanged?.(this.micState);

      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      this.setupSpeakingDetector('local', this.localStream);
      this.attachLocalTracksToAllPeers();

      // Automatically unlock AudioContext on mic activation gesture
      this.unlockAudio();

      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.micState = 'permission_denied';
        this.onError?.('تم رفض إذن الوصول للمايكروفون من المتصفح. يرجى تفعيله من إعدادات المتصفح.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.micState = 'failed';
        this.onError?.('لم يتم العثور على مايكروفون موصول بجهازك.');
      } else {
        this.micState = 'failed';
        this.onError?.('تعذر تشغيل المايكروفون، يرجى التأكد من توصيله وصلاحيات المتصفح.');
      }
      this.onMicStateChanged?.(this.micState);
      return false;
    }
  }

  private attachLocalTracksToAllPeers() {
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    this.peers.forEach((peer) => {
      if (peer.connection && peer.connection.signalingState !== 'closed') {
        const senders = peer.connection.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio' || (s as any).kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(audioTrack).catch((err) => {
            console.warn('replaceTrack failed:', err);
          });
        }
      }
    });
  }

  public setMicMuted(muted: boolean) {
    if (muted) {
      this.micState = 'muted';
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    } else {
      if (!this.localStream) {
        this.startLocalAudio();
        return;
      }
      this.micState = 'active';
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      this.attachLocalTracksToAllPeers();
    }
    this.onMicStateChanged?.(this.micState);
  }

  public setSpeakerMuted(muted: boolean) {
    this.isSpeakerMuted = muted;
    this.peers.forEach((peer) => {
      if (peer.audioElement) {
        peer.audioElement.muted = muted;
      }
    });
  }

  /**
   * Resumes AudioContext and unlocks any remote audio playback blocked by autoplay policies
   */
  public unlockAudio() {
    this.isAutoplayBlocked = false;
    this.onAutoplayBlockedChanged?.(false);

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    this.peers.forEach((peer) => {
      if (peer.audioElement) {
        peer.audioElement.play().catch(() => {});
      }
    });
  }

  public handlePeerLeft(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      try {
        peer.connection?.close();
      } catch {}

      if (peer.audioElement) {
        peer.audioElement.pause();
        peer.audioElement.srcObject = null;
      }

      this.peers.delete(userId);
      this.candidateQueue.delete(userId);
      this.remoteAnalysers.delete(userId);
      this.notifyPeers();
    }
  }

  public leaveSession() {
    if (this.currentRoomCode) {
      signalRService.leaveVoice(this.currentRoomCode).catch(() => {});
    }

    this.peers.forEach((peer) => {
      try {
        peer.connection?.close();
      } catch {}
      if (peer.audioElement) {
        peer.audioElement.pause();
        peer.audioElement.srcObject = null;
      }
    });
    this.peers.clear();
    this.candidateQueue.clear();
    this.remoteAnalysers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.currentRoomCode = null;
    this.currentUserId = '';
    this.voiceToken = null;
    this.micState = 'idle';
    this.isLocalSpeaking = false;
    this.isAutoplayBlocked = false;

    this.onMicStateChanged?.(this.micState);
    this.notifyPeers();
  }

  private setupSpeakingDetector(id: string, stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      if (id === 'local') {
        this.localAnalyser = analyser;
      } else {
        this.remoteAnalysers.set(id, analyser);
      }

      if (this.animationFrameId === null) {
        this.startAudioLoop();
      }
    } catch {
      // AudioContext fallback
    }
  }

  private startAudioLoop() {
    const dataArray = new Uint8Array(128);

    const checkLevels = () => {
      // 1. Check local speaking
      if (this.localAnalyser && this.micState === 'active') {
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < 128; i++) sum += dataArray[i];
        const avg = sum / 128;
        const speaking = avg > 14;
        if (speaking !== this.isLocalSpeaking) {
          this.isLocalSpeaking = speaking;
          this.onSpeakingChanged?.('local', speaking);
        }
      } else if (this.isLocalSpeaking) {
        this.isLocalSpeaking = false;
        this.onSpeakingChanged?.('local', false);
      }

      // 2. Check remote peers speaking
      this.remoteAnalysers.forEach((analyser, peerId) => {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < 128; i++) sum += dataArray[i];
        const avg = sum / 128;
        const speaking = avg > 14;

        if (speaking !== peer.isSpeaking) {
          peer.isSpeaking = speaking;
          this.onSpeakingChanged?.(peerId, speaking);
        }
      });

      this.animationFrameId = requestAnimationFrame(checkLevels);
    };

    this.animationFrameId = requestAnimationFrame(checkLevels);
  }

  private notifyPeers() {
    this.onPeersChanged?.(Array.from(this.peers.values()));
  }
}

export const webrtcVoiceService = new WebRtcVoiceService();

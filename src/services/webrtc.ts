import { signalRService } from './signalr';

export interface VoicePeerState {
  userId: string;
  userName: string;
  isSpeaking: boolean;
  audioElement?: HTMLAudioElement;
  connection?: RTCPeerConnection;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class WebRtcVoiceService {
  private localStream: MediaStream | null = null;
  private peers: Map<string, VoicePeerState> = new Map();
  private candidateQueue: Map<string, RTCIceCandidateInit[]> = new Map();
  private isMicMuted = true;
  private isSpeakerMuted = false;
  private audioContext: AudioContext | null = null;
  private onPeersChanged?: (peers: VoicePeerState[]) => void;
  private onSpeakingChanged?: (userId: string, isSpeaking: boolean) => void;
  private onError?: (msg: string) => void;

  public initialize(
    onPeersChanged: (peers: VoicePeerState[]) => void,
    onSpeakingChanged: (userId: string, isSpeaking: boolean) => void,
    onError: (msg: string) => void
  ) {
    this.onPeersChanged = onPeersChanged;
    this.onSpeakingChanged = onSpeakingChanged;
    this.onError = onError;
  }

  public async startLocalAudio(): Promise<boolean> {
    try {
      if (this.localStream) {
        this.isMicMuted = false;
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
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

      this.isMicMuted = false;
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      this.setupSpeakingDetector('local', this.localStream);
      this.attachLocalTracksToAllPeers();
      return true;
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'تم رفض إذن الوصول للمايكروفون من المتصفح'
          : 'تعذر تشغيل المايكروفون، تأكد من توصيله ومنحه الإذن';
      this.onError?.(msg);
      return false;
    }
  }

  private attachLocalTracksToAllPeers() {
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    this.peers.forEach((peer) => {
      if (peer.connection) {
        const senders = peer.connection.getSenders();
        const existingAudioSender = senders.find((s) => s.track?.kind === 'audio');
        if (existingAudioSender) {
          existingAudioSender.replaceTrack(audioTrack).catch((err) => {
            console.warn('replaceTrack failed:', err);
          });
        } else {
          try {
            peer.connection.addTrack(audioTrack, this.localStream!);
          } catch (err) {
            console.warn('addTrack failed:', err);
          }
        }
      }
    });
  }

  public setMicMuted(muted: boolean) {
    this.isMicMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public setSpeakerMuted(muted: boolean) {
    this.isSpeakerMuted = muted;
    this.peers.forEach((peer) => {
      if (peer.audioElement) {
        peer.audioElement.muted = muted;
      }
    });
  }

  public isMicrophoneMuted(): boolean {
    return this.isMicMuted;
  }

  public isAudioSpeakerMuted(): boolean {
    return this.isSpeakerMuted;
  }

  // Handle batch list of existing peers from SignalR JoinVoice
  public async handleExistingPeers(existingPeers: { userId: string; displayName: string }[]) {
    for (const peer of existingPeers) {
      await this.handlePeerJoined(peer.userId, peer.displayName);
    }
  }

  public async handlePeerJoined(userId: string, userName: string) {
    if (this.peers.has(userId)) return;

    const peerConnection = new RTCPeerConnection(RTC_CONFIG);
    const peerState: VoicePeerState = {
      userId,
      userName,
      isSpeaking: false,
      connection: peerConnection
    };

    // Attach local track if mic is on
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    peerConnection.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.muted = this.isSpeakerMuted;
      audio.play().catch(() => {
        // Autoplay policy fallback
      });
      peerState.audioElement = audio;

      this.setupSpeakingDetector(userId, event.streams[0]);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalRService.sendIceCandidate(userId, JSON.stringify(event.candidate));
      }
    };

    this.peers.set(userId, peerState);
    this.notifyPeers();

    // Create and send offer to newly discovered peer
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await signalRService.sendOffer(userId, JSON.stringify(offer));
    } catch (err) {
      console.error('Failed to create offer for peer', userId, err);
    }
  }

  public async handleReceiveOffer(fromUserId: string, sdp: string) {
    let peerState = this.peers.get(fromUserId);
    let peerConnection = peerState?.connection;

    if (!peerConnection) {
      peerConnection = new RTCPeerConnection(RTC_CONFIG);
      peerState = {
        userId: fromUserId,
        userName: 'لاعب',
        isSpeaking: false,
        connection: peerConnection
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          peerConnection!.addTrack(track, this.localStream!);
        });
      }

      peerConnection.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.muted = this.isSpeakerMuted;
        audio.play().catch(() => {});
        peerState!.audioElement = audio;

        this.setupSpeakingDetector(fromUserId, event.streams[0]);
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          signalRService.sendIceCandidate(fromUserId, JSON.stringify(event.candidate));
        }
      };

      this.peers.set(fromUserId, peerState);
      this.notifyPeers();
    }

    try {
      const offerDesc = new RTCSessionDescription(JSON.parse(sdp));
      await peerConnection.setRemoteDescription(offerDesc);

      // Flush queued candidates
      await this.flushCandidateQueue(fromUserId, peerConnection);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await signalRService.sendAnswer(fromUserId, JSON.stringify(answer));
    } catch (err) {
      console.error('Failed to handle receive offer from', fromUserId, err);
    }
  }

  public async handleReceiveAnswer(fromUserId: string, sdp: string) {
    const peer = this.peers.get(fromUserId);
    if (peer?.connection) {
      try {
        const answerDesc = new RTCSessionDescription(JSON.parse(sdp));
        await peer.connection.setRemoteDescription(answerDesc);

        // Flush queued candidates
        await this.flushCandidateQueue(fromUserId, peer.connection);
      } catch (err) {
        console.error('Failed to set remote answer', fromUserId, err);
      }
    }
  }

  public async handleReceiveIceCandidate(fromUserId: string, candidateStr: string) {
    try {
      const candidateInit: RTCIceCandidateInit = JSON.parse(candidateStr);
      const peer = this.peers.get(fromUserId);

      if (peer?.connection && peer.connection.remoteDescription && peer.connection.remoteDescription.type) {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } else {
        // Queue until remote description is set
        const queue = this.candidateQueue.get(fromUserId) || [];
        queue.push(candidateInit);
        this.candidateQueue.set(fromUserId, queue);
      }
    } catch (err) {
      console.warn('Failed to handle ICE candidate', fromUserId, err);
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

  public handlePeerLeft(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.connection?.close();
      if (peer.audioElement) {
        peer.audioElement.pause();
        peer.audioElement.srcObject = null;
      }
      this.peers.delete(userId);
      this.candidateQueue.delete(userId);
      this.notifyPeers();
    }
  }

  public leaveSession() {
    this.peers.forEach((peer) => {
      peer.connection?.close();
      if (peer.audioElement) {
        peer.audioElement.pause();
        peer.audioElement.srcObject = null;
      }
    });
    this.peers.clear();
    this.candidateQueue.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

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

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speaking = false;
      const checkAudio = () => {
        if (!this.peers.has(id) && id !== 'local') return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        const isNowSpeaking = average > 16;
        if (isNowSpeaking !== speaking) {
          speaking = isNowSpeaking;
          if (id === 'local') {
            this.onSpeakingChanged?.('local', speaking);
          } else {
            const peer = this.peers.get(id);
            if (peer) {
              peer.isSpeaking = speaking;
              this.onSpeakingChanged?.(id, speaking);
            }
          }
        }

        requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch {
      // AudioContext fallback
    }
  }

  private notifyPeers() {
    this.onPeersChanged?.(Array.from(this.peers.values()));
  }
}

export const webrtcVoiceService = new WebRtcVoiceService();

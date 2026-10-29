// Centralized Sound Service for Egyptian Dominoes
// Handles automatic gameplay sounds and player-selectable soundboard clips

export interface ReplaySoundItem {
  key: string;
  label: string;
  fileName: string;
  url: string;
}

// 13 iconic Egyptian meme/soundboard clips supplied in Replay Sounds
export const REPLAY_SOUNDS_CATALOG: ReplaySoundItem[] = [
  {
    key: 'ابراهيم ارحمني',
    label: 'ابراهيم ارحمني',
    fileName: 'ابراهيم ارحمني.mp3',
    url: '/sounds/replay/ابراهيم ارحمني.mp3'
  },
  {
    key: 'الله اكبر عليك',
    label: 'الله اكبر عليك',
    fileName: 'الله اكبر عليك.mp3',
    url: '/sounds/replay/الله اكبر عليك.mp3'
  },
  {
    key: 'بقت عمليه شخصيه بهجت صابر',
    label: 'بقت عمليه شخصيه بهجت صابر',
    fileName: 'بقت عمليه شخصيه بهجت صابر.mp3',
    url: '/sounds/replay/بقت عمليه شخصيه بهجت صابر.mp3'
  },
  {
    key: 'بهجت صابر هوبا الاسد جي',
    label: 'بهجت صابر هوبا الاسد جي',
    fileName: 'بهجت صابر هوبا الاسد جي.mp3',
    url: '/sounds/replay/بهجت صابر هوبا الاسد جي.mp3'
  },
  {
    key: 'حبيب دين امي',
    label: 'حبيب دين امي',
    fileName: 'حبيب دين امي.mp3',
    url: '/sounds/replay/حبيب دين امي.mp3'
  },
  {
    key: 'خنجرين بهجت صابر',
    label: 'خنجرين بهجت صابر',
    fileName: 'خنجرين بهجت صابر.mp3',
    url: '/sounds/replay/خنجرين بهجت صابر.mp3'
  },
  {
    key: 'دمرتني',
    label: 'دمرتني',
    fileName: 'دمرتني.mp3',
    url: '/sounds/replay/دمرتني.mp3'
  },
  {
    key: 'عاوزين نعملك بني ادم يا كلب',
    label: 'عاوزين نعملك بني ادم يا كلب',
    fileName: 'عاوزين نعملك بني ادم يا كلب.mp3',
    url: '/sounds/replay/عاوزين نعملك بني ادم يا كلب.mp3'
  },
  {
    key: 'عنتيل المحلة',
    label: 'عنتيل المحلة',
    fileName: 'عنتيل المحلة.mp3',
    url: '/sounds/replay/عنتيل المحلة.mp3'
  },
  {
    key: 'كلنا عندنا وانت معندكش',
    label: 'كلنا عندنا وانت معندكش',
    fileName: 'كلنا عندنا وانت معندكش.mp3',
    url: '/sounds/replay/كلنا عندنا وانت معندكش.mp3'
  },
  {
    key: 'متعيطش',
    label: 'متعيطش',
    fileName: 'متعيطش.mp3',
    url: '/sounds/replay/متعيطش.mp3'
  },
  {
    key: 'يا ابن اللعيبه',
    label: 'يا ابن اللعيبه',
    fileName: 'يا ابن اللعيبه.mp3',
    url: '/sounds/replay/يا ابن اللعيبه.mp3'
  },
  {
    key: 'يا عمرو دياب يا خوو',
    label: 'يا عمرو دياب يا خوو',
    fileName: 'يا عمرو دياب يا خوو.mp3',
    url: '/sounds/replay/يا عمرو دياب يا خوو.mp3'
  }
];

export type GameplaySoundType = 'play' | 'shuffle' | 'take' | 'drawOrClose' | 'skip';

const GAMEPLAY_SOUND_URLS: Record<GameplaySoundType, string> = {
  play: '/sounds/play/domino_Play.mp3',
  shuffle: '/sounds/play/domino_shufle.mp3',
  take: '/sounds/play/domino_take.mp3',
  drawOrClose: '/sounds/play/drowOrclose.mp3',
  skip: '/sounds/play/skip.mp3'
};

class SoundService {
  private gameplayEnabled: boolean = true;
  private soundboardEnabled: boolean = true;
  private volume: number = 0.85;

  // Deduplication cache for event IDs
  private playedEventIds: Set<string> = new Set();

  // Web Audio API context and pre-decoded buffer cache
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private decodedBuffers: Map<GameplaySoundType, AudioBuffer> = new Map();
  private pendingBufferLoads: Map<GameplaySoundType, Promise<AudioBuffer | null>> = new Map();

  // Active audio elements cache (for fallback and replay clips)
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private gameplayAudioPool: Map<GameplaySoundType, HTMLAudioElement[]> = new Map();
  private currentReplayAudio: HTMLAudioElement | null = null;

  // Track unlock state
  private isUnlocked: boolean = false;
  private unlockListenersAttached: boolean = false;

  constructor() {
    this.loadSettings();
    this.setupAutoUnlock();
  }

  private loadSettings() {
    try {
      if (typeof localStorage === 'undefined') return;
      const gp = localStorage.getItem('egy_domino_sound_gameplay');
      if (gp !== null) this.gameplayEnabled = gp === 'true';

      const sb = localStorage.getItem('egy_domino_sound_board');
      if (sb !== null) this.soundboardEnabled = sb === 'true';

      const vol = localStorage.getItem('egy_domino_sound_vol');
      if (vol !== null) {
        const v = parseFloat(vol);
        if (!isNaN(v) && v >= 0 && v <= 1) this.volume = v;
      }
    } catch {
      // Ignore local storage errors
    }
  }

  /**
   * Initializes or returns the shared AudioContext and master GainNode
   */
  private getOrCreateAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.audioContext) return this.audioContext;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
      return this.audioContext;
    } catch (e) {
      console.debug('Web Audio API initialization not supported or blocked:', e);
      return null;
    }
  }

  /**
   * Setup one-time global user-gesture listeners to unlock audio seamlessly on mobile
   */
  private setupAutoUnlock() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.unlockListenersAttached) return;
    this.unlockListenersAttached = true;

    const handleFirstGesture = () => {
      this.unlockAudio();
      this.removeUnlockListeners(handleFirstGesture);
    };

    const events = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleFirstGesture, { capture: true, passive: true, once: true });
    });
  }

  private removeUnlockListeners(handler: () => void) {
    if (typeof window === 'undefined') return;
    const events = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
    events.forEach((evt) => {
      window.removeEventListener(evt, handler, { capture: true });
    });
  }

  public getSettings() {
    return {
      gameplayEnabled: this.gameplayEnabled,
      soundboardEnabled: this.soundboardEnabled,
      volume: this.volume
    };
  }

  public setGameplaySoundsEnabled(enabled: boolean) {
    this.gameplayEnabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('egy_domino_sound_gameplay', enabled ? 'true' : 'false');
      }
    } catch {}
  }

  public setSoundboardEnabled(enabled: boolean) {
    this.soundboardEnabled = enabled;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('egy_domino_sound_board', enabled ? 'true' : 'false');
      }
    } catch {}
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioContext) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      } catch {}
    }
    if (this.currentReplayAudio) {
      try {
        this.currentReplayAudio.volume = this.volume;
      } catch {}
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('egy_domino_sound_vol', this.volume.toString());
      }
    } catch {}
  }

  /**
   * Preload and decode a gameplay sound into memory
   */
  public async preloadGameplaySound(type: GameplaySoundType): Promise<AudioBuffer | null> {
    if (this.decodedBuffers.has(type)) {
      return this.decodedBuffers.get(type)!;
    }

    if (this.pendingBufferLoads.has(type)) {
      return this.pendingBufferLoads.get(type)!;
    }

    const ctx = this.getOrCreateAudioContext();
    if (!ctx || typeof fetch === 'undefined') {
      return null;
    }

    const url = GAMEPLAY_SOUND_URLS[type];
    if (!url) return null;

    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.decodedBuffers.set(type, audioBuffer);
        return audioBuffer;
      } catch (err) {
        console.debug(`Preload failed for ${type}:`, err);
        return null;
      } finally {
        this.pendingBufferLoads.delete(type);
      }
    })();

    this.pendingBufferLoads.set(type, loadPromise);
    return loadPromise;
  }

  /**
   * Preload all gameplay sound effects for instant zero-latency playback
   */
  public preloadAllGameplaySounds(): void {
    const types: GameplaySoundType[] = ['play', 'shuffle', 'take', 'drawOrClose', 'skip'];
    types.forEach((t) => {
      this.preloadGameplaySound(t).catch(() => {});
    });
  }

  /**
   * Play an automatic gameplay sound effect with zero-latency Web Audio API or pooled fallback
   */
  public async playGameplay(type: GameplaySoundType, dedupeKey?: string): Promise<void> {
    if (!this.gameplayEnabled || this.volume <= 0) return;

    // Deduplication check
    if (dedupeKey) {
      if (this.playedEventIds.has(dedupeKey)) return;
      this.playedEventIds.add(dedupeKey);
      // Prune dedupe cache if it grows large
      if (this.playedEventIds.size > 200) {
        const arr = Array.from(this.playedEventIds);
        this.playedEventIds = new Set(arr.slice(arr.length - 100));
      }
    }

    const url = GAMEPLAY_SOUND_URLS[type];
    if (!url) return;

    // 1. Primary path: Web Audio API (Zero latency, no GC stalls, immune to DOM audio limits)
    const ctx = this.getOrCreateAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        let buffer = this.decodedBuffers.get(type);
        if (!buffer) {
          buffer = (await this.preloadGameplaySound(type)) || undefined;
        }

        if (buffer && ctx.state !== 'closed') {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const target = this.masterGain || ctx.destination;
          source.connect(target);
          source.start(0);
          return;
        }
      } catch (e) {
        console.debug('Web Audio play failed, falling back to HTMLAudioElement:', e);
      }
    }

    // 2. Secondary path: Pooled HTMLAudioElement fallback
    try {
      if (typeof Audio === 'undefined') return;

      let pool = this.gameplayAudioPool.get(type);
      if (!pool) {
        pool = [];
        this.gameplayAudioPool.set(type, pool);
      }

      // Reuse an idle audio element or allocate up to 3 in pool
      let audio = pool.find((a) => a.paused || a.ended);
      if (!audio) {
        if (pool.length < 3) {
          audio = new Audio(url);
          audio.preload = 'auto';
          pool.push(audio);
        } else {
          audio = pool[0];
          audio.currentTime = 0;
        }
      }

      audio.volume = this.volume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {
      console.debug('Gameplay sound playback suppressed or failed:', err);
    }
  }

  /**
   * Play a soundboard clip from Replay Sounds with reuse, encoding safety, and single-stream policy
   */
  public async playReplay(soundKey: string): Promise<void> {
    if (!this.soundboardEnabled || this.volume <= 0) return;

    const item = REPLAY_SOUNDS_CATALOG.find((s) => s.key === soundKey);
    if (!item) return;

    try {
      if (typeof Audio === 'undefined') return;

      // Stop previously playing soundboard clip if active to avoid overlapping
      if (this.currentReplayAudio) {
        try {
          this.currentReplayAudio.pause();
          this.currentReplayAudio.currentTime = 0;
        } catch {}
      }

      const encodedUrl = encodeURI(item.url);
      let audio = this.audioCache.get(encodedUrl);
      if (!audio) {
        audio = new Audio(encodedUrl);
        audio.preload = 'auto';
        this.audioCache.set(encodedUrl, audio);
      }

      audio.volume = this.volume;
      audio.currentTime = 0;
      this.currentReplayAudio = audio;

      audio.onended = () => {
        if (this.currentReplayAudio === audio) {
          this.currentReplayAudio = null;
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {
      console.debug('Replay sound playback suppressed or failed:', err);
    }
  }

  /**
   * Unlock audio playback on user gesture and resume AudioContext immediately
   */
  public unlockAudio() {
    this.isUnlocked = true;

    // 1. Resume Web Audio context if suspended
    const ctx = this.getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // 2. Play silent buffer through Web Audio to unlock hardware pipeline
    if (ctx && ctx.state !== 'closed') {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {}
    }

    // 3. Fallback HTMLAudioElement silent trigger
    try {
      if (typeof Audio !== 'undefined') {
        const silentAudio = new Audio(
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
        );
        silentAudio.volume = 0.01;
        const p = silentAudio.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      }
    } catch {}

    // 4. Trigger background preload of gameplay sound effects
    this.preloadAllGameplaySounds();
  }
}

export const soundService = new SoundService();


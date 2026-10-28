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

  // Active audio elements cache
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private currentReplayAudio: HTMLAudioElement | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
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
      localStorage.setItem('egy_domino_sound_gameplay', enabled ? 'true' : 'false');
    } catch {}
  }

  public setSoundboardEnabled(enabled: boolean) {
    this.soundboardEnabled = enabled;
    try {
      localStorage.setItem('egy_domino_sound_board', enabled ? 'true' : 'false');
    } catch {}
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('egy_domino_sound_vol', this.volume.toString());
    } catch {}
  }

  /**
   * Play an automatic gameplay sound effect
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

    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      await audio.play();
    } catch (err) {
      // Audio autoplay policy or decode error handled gracefully without breaking game logic
      console.debug('Gameplay sound playback suppressed or failed:', err);
    }
  }

  /**
   * Play a soundboard clip from Replay Sounds
   */
  public async playReplay(soundKey: string): Promise<void> {
    if (!this.soundboardEnabled || this.volume <= 0) return;

    const item = REPLAY_SOUNDS_CATALOG.find((s) => s.key === soundKey);
    if (!item) return;

    try {
      // Stop previously playing soundboard clip if active to avoid messy overlapping
      if (this.currentReplayAudio) {
        this.currentReplayAudio.pause();
        this.currentReplayAudio.currentTime = 0;
      }

      const audio = new Audio(encodeURI(item.url));
      audio.volume = this.volume;
      this.currentReplayAudio = audio;

      audio.onended = () => {
        if (this.currentReplayAudio === audio) {
          this.currentReplayAudio = null;
        }
      };

      await audio.play();
    } catch (err) {
      console.debug('Replay sound playback suppressed or failed:', err);
    }
  }

  /**
   * Unlock audio playback on first user gesture
   */
  public unlockAudio() {
    try {
      const silentAudio = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      );
      silentAudio.volume = 0.01;
      silentAudio.play().catch(() => {});
    } catch {}
  }
}

export const soundService = new SoundService();

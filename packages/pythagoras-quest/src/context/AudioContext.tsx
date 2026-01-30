import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const BG_MUSIC_PATH = 'assets/audios/bg_music.mp3';
const BUTTON_CLICK_PATH = 'assets/audios/button_click.mp3';
const BADGE_SFX_PATH = 'assets/audios/badge_sfx.mp3';
const DOOR_OPEN_SFX_PATH = 'assets/audios/door_open_sfx.mp3';
const SCROLL_SFX_PATH = 'assets/audios/scroll_sfx.mp3';

interface AudioManager {
  isMuted: boolean;
  toggleMute: () => void;
  bgmVolume: number;
  setBgmVolume: (v: number) => void;
  dialogVolume: number;
  setDialogVolume: (v: number) => void;
  isDialogPlaying: boolean;
  playBgm: (url?: string) => Promise<void>;
  pauseBgm: () => void;
  playDialog: (url: string) => Promise<void>;
  pauseDialog: () => void;
  playSfx: (name: 'button_click' | 'badge_sfx' | 'door_open_sfx' | 'scroll_sfx' | string, urlOverride?: string) => void;
}

const AudioContext = createContext<AudioManager | null>(null);

export const useAudioManager = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('AudioContext not found');
  return ctx;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const dialogRef = useRef<HTMLAudioElement | null>(null);

  const [bgmVolume, setBgmVolumeState] = useState<number>(0.3);
  const [dialogVolume, setDialogVolumeState] = useState<number>(0.7);
  const [isDialogPlaying, setIsDialogPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const prevVolumesRef = useRef<{ bgm: number; dialog: number }>({ bgm: 0.3, dialog: 0.7 });

  const applyVolumes = useCallback(() => {
    if (bgmRef.current) bgmRef.current.volume = isMuted ? 0 : bgmVolume;
    if (dialogRef.current) dialogRef.current.volume = isMuted ? 0 : dialogVolume;
  }, [bgmVolume, dialogVolume, isMuted]);

  const ensureBgm = useCallback((url?: string) => {
    if (bgmRef.current && (!url || bgmRef.current.src.includes(url))) return bgmRef.current;
    const audio = new Audio(url || BG_MUSIC_PATH);
    audio.loop = true;
    audio.volume = isMuted ? 0 : bgmVolume;
    bgmRef.current = audio;
    return audio;
  }, [bgmVolume, isMuted]);

  const ensureDialog = useCallback((url: string) => {
    if (dialogRef.current) {
      dialogRef.current.pause();
    }
    const audio = new Audio(url);
    audio.loop = false;
    audio.volume = isMuted ? 0 : dialogVolume;
    audio.onplay = () => setIsDialogPlaying(true);
    audio.onpause = () => setIsDialogPlaying(false);
    audio.onended = () => setIsDialogPlaying(false);
    dialogRef.current = audio;
    return audio;
  }, [dialogVolume, isMuted]);

  const playBgm = useCallback(async (url?: string) => {
    const audio = ensureBgm(url);
    applyVolumes();
    try {
      await audio.play();
    } catch (e) {
      // autoplay might be blocked; will play later on user interaction
    }
  }, [applyVolumes, ensureBgm]);

  const pauseBgm = useCallback(() => {
    if (bgmRef.current) bgmRef.current.pause();
  }, []);

  const playDialog = useCallback(async (url: string) => {
    const audio = ensureDialog(url);
    applyVolumes();
    try {
      await audio.play();
    } catch (e) {
      // ignore
    }
  }, [applyVolumes, ensureDialog]);

  const pauseDialog = useCallback(() => {
    if (dialogRef.current) dialogRef.current.pause();
  }, []);

  const setBgmVolume = useCallback((v: number) => {
    setBgmVolumeState(v);
    if (isMuted) {
      if (v > 0) {
        setIsMuted(false);
        if (bgmRef.current) bgmRef.current.volume = v;
      } else {
        if (bgmRef.current) bgmRef.current.volume = 0;
      }
      return;
    }
    if (bgmRef.current) bgmRef.current.volume = v;
  }, [isMuted]);

  const setDialogVolume = useCallback((v: number) => {
    setDialogVolumeState(v);
    if (isMuted) {
      if (v > 0) {
        setIsMuted(false);
        if (dialogRef.current) dialogRef.current.volume = v;
      } else {
        if (dialogRef.current) dialogRef.current.volume = 0;
      }
      return;
    }
    if (dialogRef.current) dialogRef.current.volume = v;
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (!next) {
        // Unmuting: if current sliders are zero, restore previous saved volumes for those channels
        if (bgmVolume === 0) setBgmVolumeState(prevVolumesRef.current.bgm);
        if (dialogVolume === 0) setDialogVolumeState(prevVolumesRef.current.dialog);
      } else {
        // Muting: capture current volumes and set displayed values to 0
        prevVolumesRef.current = { bgm: bgmVolume, dialog: dialogVolume };
        setBgmVolumeState(0);
        setDialogVolumeState(0);
        if (bgmRef.current) bgmRef.current.volume = 0;
        if (dialogRef.current) dialogRef.current.volume = 0;
      }
      return next;
    });
  }, [bgmVolume, dialogVolume]);

  const playSfx = useCallback((name: 'button_click' | 'badge_sfx' | 'door_open_sfx' | 'scroll_sfx' | string, urlOverride?: string) => {
    let url: string | undefined = urlOverride;
    if (!url) {
      if (name === 'button_click') url = BUTTON_CLICK_PATH;
      else if (name === 'badge_sfx') url = BADGE_SFX_PATH;
      else if (name === 'door_open_sfx') url = DOOR_OPEN_SFX_PATH;
      else if (name === 'scroll_sfx') url = SCROLL_SFX_PATH;
    }
    if (!url) return;
    const sfx = new Audio(url);
    sfx.volume = isMuted ? 0 : bgmVolume;
    void sfx.play();
  }, [isMuted, bgmVolume]);

  // removed unused playTextAudio

  React.useEffect(() => {
    applyVolumes();
  }, [applyVolumes]);

  // Global click SFX for all button-like elements in the quest
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const buttonLike = target.closest('button, [role="button"], .btn, [class*="btn-"]');
      if (!buttonLike) return;
      // Skip disabled
      if ((buttonLike as HTMLButtonElement).disabled) return;
      const ariaDisabled = buttonLike.getAttribute('aria-disabled');
      if (ariaDisabled === 'true') return;
      playSfx('button_click');
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [playSfx]);

  const value = useMemo<AudioManager>(() => ({
    isMuted,
    toggleMute,
    bgmVolume,
    setBgmVolume,
    dialogVolume,
    setDialogVolume,
    isDialogPlaying,
    playBgm,
    pauseBgm,
    playDialog,
    pauseDialog,
    playSfx,
  }), [
    isMuted,
    toggleMute,
    bgmVolume,
    setBgmVolume,
    dialogVolume,
    setDialogVolume,
    isDialogPlaying,
    playBgm,
    pauseBgm,
    playDialog,
    pauseDialog,
    playSfx,
  ]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

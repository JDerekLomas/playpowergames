import { BaseScene } from '../core/BaseScene';

export class AudioManager {
    private static instance: AudioManager | null = null;
    private scene: BaseScene | null = null;
    private backgroundMusic: Phaser.Sound.WebAudioSound | null = null;
    private soundEffects: Map<string, Phaser.Sound.WebAudioSound> = new Map();
    private isMuted: boolean = false;
    private isMusicMuted: boolean = false;
    private isSfxMuted: boolean = false;
    private musicVolume: number = 0.3;
    private sfxVolume: number = 0.3;
    private isDucked: boolean = false;

    private constructor() { }

    /**
     * Get the singleton instance of AudioManager
     */
    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * Initialize the AudioManager with a scene
     * @param scene - The scene to use for audio operations
     */
    public initialize(scene: BaseScene): void {
        this.scene = scene;
    }

    /**
     * Load and play background music
     * @param key - The key of the audio asset
     * @param loop - Whether the music should loop
     */
    public playBackgroundMusic(key: string, loop: boolean = true): void {
        if (!this.scene) {
            console.warn('AudioManager not initialized with a scene');
            return;
        }

        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }

        this.backgroundMusic = this.scene.sound.add(key, {
            volume: this.musicVolume,
            loop: loop
        }) as Phaser.Sound.WebAudioSound;

        // Unduck background music if it is ducked
        this.unduckBackgroundMusic();

        if (!this.isMusicMuted) {
            this.backgroundMusic.play();
        }
    }

    /**
     * Play a sound effect
     * @param key - The key of the audio asset
     */
    public playSoundEffect(key: string): Phaser.Sound.WebAudioSound | undefined {
        if (!this.scene) {
            console.warn('AudioManager not initialized with a scene');
            return;
        }

        if (this.isSfxMuted) return;

        const sound = this.scene.sound.add(key, {
            volume: this.sfxVolume
        }) as Phaser.Sound.WebAudioSound;

        this.soundEffects.set(key, sound);
        sound.play();
        return sound;
    }

    /**
     * Play a specific segment of an audio file
     * @param key - The key of the audio asset
     * @param startTime - Start time in seconds
     * @param endTime - End time in seconds
     */
    public playAudioSprite(key: string, startTime: number, endTime: number): Phaser.Sound.WebAudioSound | undefined {
        if (!this.scene) {
            console.warn('AudioManager not initialized with a scene');
            return;
        }

        if (this.isSfxMuted) return;

        const sound = this.scene.sound.add(key, {
            volume: this.sfxVolume
        }) as Phaser.Sound.WebAudioSound;

        // Calculate duration in seconds
        const duration = (endTime - startTime);

        // Add marker to the audio
        sound.addMarker({
            name: 'marker',
            start: startTime,
            duration: duration,
            config: {
                volume: this.sfxVolume
            }
        })

        // Play the audio segment
        sound.play('marker');

        sound.once('complete', () => {
            sound.stop();
            this.soundEffects.delete(key);
        });

        this.soundEffects.set(key, sound);
        return sound;
    }


    /**
     * Set the volume for background music
     * @param volume - Volume level between 0 and 1
     */
    public setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.setVolume(this.musicVolume);
        }
    }

    /**
     * Set the volume for sound effects
     * @param volume - Volume level between 0 and 1
     */
    public setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.soundEffects.forEach(sound => {
            sound.setVolume(this.sfxVolume);
        });
    }

    /**
     * Mute or unmute all sounds
     * @param muted - Whether to mute or unmute
     */
    public setMute(muted: boolean): void {
        if (!this.scene) {
            console.warn('AudioManager not initialized with a scene');
            return;
        }

        this.isMuted = muted;
        this.scene.sound.setMute(muted);
    }

    /**
     * Mute or unmute background music
     * @param muted - Whether to mute or unmute
     */
    public setMusicMute(muted: boolean): void {
        this.isMusicMuted = muted;
        if (this.backgroundMusic) {
            if (muted) {
                this.backgroundMusic.pause();
            } else {
                this.backgroundMusic.resume();
            }
        }
    }

    /**
     * Mute or unmute sound effects
     * @param muted - Whether to mute or unmute
     */
    public setSfxMute(muted: boolean): void {
        this.isSfxMuted = muted;
    }

    /**
     * Stop background music
     */
    public stopBackgroundMusic(): void {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.unduckBackgroundMusic();
        }
    }

    public stopSoundEffect(key: string): void {
        const sound = this.soundEffects.get(key);
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }

    /**
     * Stop all sound effects
     */
    public stopAllSoundEffects(): void {
        this.soundEffects.forEach(sound => {
            sound.stop();
        });
        this.soundEffects.clear();
    }

    /**
     * Stop all sounds
     */
    public stopAll(): void {
        this.stopBackgroundMusic();
        this.stopAllSoundEffects();
    }

    /**
     * Get current music volume
     */
    public getMusicVolume(): number {
        return this.musicVolume;
    }

    /**
     * Duck the background music
     * @param factor - The factor to duck the music volume by
     */
    public duckBackgroundMusic(factor: number = 0.33): void {
        if (!this.backgroundMusic || this.isDucked) {
            return;
        }
        this.isDucked = true;
        this.backgroundMusic.setVolume(this.musicVolume * factor);
    }

    /**
     * Unduck the background music
     */
    public unduckBackgroundMusic(): void {
        if (!this.backgroundMusic || !this.isDucked) {
            return;
        }
        this.isDucked = false;
        this.backgroundMusic.setVolume(this.musicVolume);
    }

    /**
     * Get current SFX volume
     */
    public getSfxVolume(): number {
        return this.sfxVolume;
    }

    /**
     * Check if all sounds are muted
     */
    public getIsAllMuted(): boolean {
        return this.isMuted;
    }

    /**
     * Check if music is muted
     */
    public getIsMusicMuted(): boolean {
        return this.isMusicMuted;
    }

    /**
     * Check if SFX are muted
     */
    public getIsSfxMuted(): boolean {
        return this.isSfxMuted;
    }

    /**
     * Fade out the background music over a specified duration
     * @param duration - Duration of the fade in milliseconds
     * @param onComplete - Callback function to be called when fade is complete
     */
    public fadeOutBackgroundMusic(duration: number = 1000, onComplete?: () => void): void {
        if (!this.backgroundMusic) {
            onComplete?.();
            return;
        }

        this.backgroundMusic.volume = 0;
        this.scene?.tweens.add({
            targets: this.backgroundMusic,
            volume: 0,
            duration: duration,
            onComplete: () => {
                onComplete?.();
            }
        });
    }

    /**
     * Pause all audio (background music and sound effects)
     */
    public pauseAll(): void {
        if (!this.scene) {
            console.warn('AudioManager not initialized with a scene');
            return;
        }

        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }

        this.soundEffects.forEach(sound => {
            sound.pause();
        });
    }

    /**
     * Resume all audio (background music and sound effects)
     */
    public resumeAll(): void {
        if (!this.scene) {
            console.warn('AudioManager not initialized with a scene');
            return;
        }

        if (this.backgroundMusic && !this.isMusicMuted) {
            this.backgroundMusic.resume();
        }

        this.soundEffects.forEach(sound => {
            if (!this.isSfxMuted) {
                sound.resume();
            }
        });
    }
}

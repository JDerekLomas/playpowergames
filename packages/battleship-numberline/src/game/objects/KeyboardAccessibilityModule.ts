import { BaseScene } from '../scenes/BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { parseFractionString } from '../utils/parseFractionString';
import { announceToScreenReader, i18n } from '@k8-games/sdk';

export class KeyboardAccessibilityModule {
    private scene: BaseScene;
    private currentInput: string = '';
    private fractionPhase: 'none' | 'numerator' | 'denominator' = 'none';
    private onSubmit: (value: number) => void;
    private sfxKeys: typeof GameConfig.ASSETS.KEYS.SFX;
    private isActive: boolean = false;
    private keyDownHandler: (event: KeyboardEvent) => void;
    private gameContainer: HTMLElement | null = null;
    private announceDebounceTimer: number | null = null;
    private announceDebounceDelay: number = 500;

    constructor(scene: BaseScene, onSubmit: (value: number) => void) {
        this.scene = scene;
        this.onSubmit = onSubmit;
        this.sfxKeys = GameConfig.ASSETS.KEYS.SFX;

        this.keyDownHandler = this.handleKeyPress.bind(this);

        this.gameContainer = document.getElementById('game-container');

        this.activate();
    }

    private handleKeyPress(event: KeyboardEvent): void {
        if (!this.isActive) return;

        const key = event.key;

        // Handle number inputs (0-9)
        if (key.match(/[0-9]/)) {
            this.scene.audioManager.playSoundEffect(this.sfxKeys.NUMBERPAD_CLICK);
            this.handleInput(key);
        }
        // Handle decimal point and fraction slash
        else if (key === '.' || key === '/') {
            this.scene.audioManager.playSoundEffect(this.sfxKeys.NUMBERPAD_CLICK);
            this.handleInput(key);
        }
        // Handle backspace for correction
        else if (key === 'Backspace') {
            this.scene.audioManager.playSoundEffect(this.sfxKeys.NUMBERPAD_CLICK);
            this.handleInput('←');
        }
        // Handle enter/return key for submission
        else if (key === 'Enter') {
            this.scene.audioManager.playSoundEffect(this.sfxKeys.FIRE_BUTTON);
            this.handleSubmit();
        }
    }

    private handleInput(value: string): void {
        if (value === '←') {
            // Handle backspace - remove the last character
            const prev = this.currentInput;
            this.currentInput = this.currentInput.slice(0, -1);
            if (this.currentInput.length === 0 && prev.length > 0) {
                // Announce cleared
                announceToScreenReader(i18n.t('common.inputCleared'));
                this.fractionPhase = 'none';
            }
            if (prev.endsWith('/') && !this.currentInput.includes('/')) {
                // Went back from denominator to numerator context
                this.fractionPhase = 'numerator';
                announceToScreenReader(i18n.t('common.numeratorField'));
            }
        } else if (this.currentInput.length > 8) {
            // Limit input length
            return;
        } else if (value === '.' && !this.currentInput.includes('.')) {
            // Add decimal point if not already present
            this.currentInput += value;
        } else if (value === '/' && !this.currentInput.includes('/')) {
            // Add fraction slash if not already present and last char is a number
            if (this.currentInput.length > 0 && !isNaN(parseInt(this.currentInput[this.currentInput.length - 1]))) {
                this.currentInput += value;
                this.fractionPhase = 'denominator';
                announceToScreenReader(i18n.t('common.denominatorField'));
            }
        } else if (value !== '.' && value !== '/') {
            // Add number if:
            // 1. It's the first character
            // 2. Previous character is a slash (for denominator)
            // 3. Previous character is a number or decimal
            const lastChar = this.currentInput[this.currentInput.length - 1];
            if (this.currentInput.length === 0 || lastChar === '/' || lastChar === '.' || !isNaN(parseInt(lastChar))) {
                if (this.currentInput.length === 0 && this.fractionPhase === 'none') {
                    this.fractionPhase = 'numerator';
                    announceToScreenReader(i18n.t('common.numeratorField'));
                }
                this.currentInput += value;
            }
        }

        // Announce the current input value for screen readers
        this.announceCurrentInput();
    }

    private announceCurrentInput(): void {
        // Clear any existing timer
        if (this.announceDebounceTimer !== null) {
            window.clearTimeout(this.announceDebounceTimer);
        }

        // Set a new timer
        this.announceDebounceTimer = window.setTimeout(() => {
            if (this.currentInput)
                announceToScreenReader(`Current input: ${this.currentInput.toString().replace(/\//g, '⁄')}`);
            this.announceDebounceTimer = null;
        }, this.announceDebounceDelay);
    }

    private handleSubmit(): void {
        if (this.currentInput) {
            const value = parseFractionString(this.currentInput);
            if (this.currentInput.trim() === '0/0' || /^\s*\d+\s*\/\s*0\s*$/.test(this.currentInput)) {
                // Invalid fraction 0/0 or */0 → announce and block
                announceToScreenReader(i18n.t('common.invalidFraction'), 'assertive');
                return;
            }
            if (value !== null) {
                this.onSubmit(value);
                this.currentInput = '';
            }
        }
    }

    public activate(): void {
        this.isActive = true;
        this.gameContainer?.focus();
        this.gameContainer?.addEventListener('keydown', this.keyDownHandler);
    }

    public deactivate(): void {
        this.isActive = false;
        this.gameContainer?.removeEventListener('keydown', this.keyDownHandler);
    }

    public destroy(): void {
        this.deactivate();

        if (this.announceDebounceTimer !== null) {
            window.clearTimeout(this.announceDebounceTimer);
            this.announceDebounceTimer = null;
        }
    }

    // Reset the current input
    public resetInput(): void {
        this.currentInput = '';
    this.fractionPhase = 'none';
    announceToScreenReader(i18n.t('common.inputCleared'));
    }
}

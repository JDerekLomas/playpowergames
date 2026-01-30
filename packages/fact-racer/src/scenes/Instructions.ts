import { BaseScene, i18n, ButtonHelper, announceToScreenReader, focusToGameContainer, VolumeSlider } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";
import { FactRacerMechanic } from "../mechanic/FactRacer";

interface InstructionsInitData { parentScene?: string; returnTo?: string; fromSplashScene?: boolean; }

export class InstructionsScene extends BaseScene {
    private mechanic!: FactRacerMechanic;
    private returnTo: string = 'GameScene';
    private fromSplashScene: boolean = false;
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;
    constructor() { super('InstructionsScene'); }

    static _preload(scene: BaseScene) { 
        FactRacerMechanic._preload(scene);
        VolumeSlider.preload(scene, 'blue');
    }

    init(data?: InstructionsInitData) {
        if (data?.returnTo) this.returnTo = data.returnTo;
        if (data) this.fromSplashScene = data.fromSplashScene || false;
        this.mechanic = new FactRacerMechanic(this, { mode: 'instructions', fromSplashScene: this.fromSplashScene });
        this.mechanic.init(false);
    }

    private completeTutorial() {
        // Ensure all tutorial audio stops immediately
        try { this.sound.stopAll(); } catch {}
        try { this.audioManager.stopAllSoundEffects(); } catch {}
        // Let the mechanic clean up timers, handlers, and any lingering audio
        try { this.mechanic?.destroy(); } catch {}

        this.registry.set('factRacerTutorialSeen', true);
        
        // Check if we're inside an iframe and reset label when returning
        const inIframe = this.isInsideIframe();
        if (inIframe && !this.fromSplashScene) {
            // Reset iframe label back to "Game" when returning to game
            window.parent.postMessage({ 
                type: 'UPDATE_IFRAME_LABEL', 
                label: 'Game' 
            }, '*');
        }

        // Small delay to ensure audio cleanup completes before switching
        this.time.delayedCall(100, () => {
            this.scene.stop('InstructionsScene');
            if (this.fromSplashScene) {
                this.scene.start(this.returnTo, { reset: false, skipTutorial: true });
            } else {
                this.scene.resume(this.returnTo, { reset: false, skipTutorial: true });
            }
        });
    }

    create() {
        if (!this.fromSplashScene) {
            // Check if we're inside an iframe
            const inIframe = this.isInsideIframe();
            if (inIframe) {
                // Iframe flow: Update parent iframe label first
                window.parent.postMessage({ 
                    type: 'UPDATE_IFRAME_LABEL', 
                    label: i18n.t('info.helpPage') 
                }, '*');    
            }
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            });
        }

        // Skip button (half button asset, standard sizing top-right)
        const skipText = i18n.t('info.skip') || i18n.t('common.skipTutorial') || i18n.t('common.skip') || 'Skip';
        const skipButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.HALF_BUTTON.KEY,
                hover: BUTTONS.HALF_BUTTON_HOVER.KEY,
                pressed: BUTTONS.HALF_BUTTON_PRESSED.KEY,
            },
            text: skipText,
            label: skipText,
            textStyle: { font: '700 32px Exo', color: '#ffffff' },
            imageScale: 1,
            x: this.display.width - 78,
            y: 80,
            raisedOffset: 3.5,
            onClick: () => this.completeTutorial(),
        });
        skipButton.setDepth(100); // Ensure it's above everything
    
        // Create mute and volume controls
        this.createMuteButton();
        this.createVolumeControls();

        this.mechanic.create();

        // Safety: if scene shuts down for any reason, stop any remaining tutorial audio
        this.events.on('shutdown', () => {
            try { this.sound.stopAll(); } catch {}
            try { this.audioManager.stopAllSoundEffects(); } catch {}
        });
    }

    // Exposed for mechanic play button to use via scene events if needed later
    public triggerTutorialComplete() { this.completeTutorial(); }

    private isInsideIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            console.log('Iframe error', e);
            return true;
        }
    }

    override update(): void { 
        this.mechanic.update(); 
        
        // Update mute button icon
        if (this.muteBtn) {
            const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            if (this.audioManager.getIsAllMuted()) {
                muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
            } else {
                muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
            }
        }
    }

    private createMuteButton() {
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 170,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(100);
    }

    private createVolumeControls() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(
            this.display.width - 210,
            268,
            'blue',
            i18n.t('common.volume')
        );

        const volumeBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 260,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(100);
    }
}

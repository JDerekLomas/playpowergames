import { announceToScreenReader, BaseScene, ButtonHelper, i18n, TextOverlay } from "@k8-games/sdk";
import { Inequality } from "../mechanic/Inequality";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { DoorUtils } from "../utils/DoorUtils";

class InequalityTutorial {
    private scene: BaseScene;
    private level: number;
    private inequality: Inequality;
    private doorUtils!: DoorUtils;
    private parentScene: string = 'SplashScene';
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private isSkipped: boolean = false;
    private headingOverlay!: TextOverlay;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor(scene: BaseScene, level: number) {
        this.scene = scene;
        this.level = level;
        this.inequality = new Inequality(scene, level, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        Inequality._preload(scene);

        // Load instruction audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen/inequality`);
        scene.load.audio('step_0', `step_0_${lang}.mp3`);
        scene.load.audio('step_1', `step_1_${lang}.mp3`);
        scene.load.audio('step_2', `step_2_${lang}.mp3`);
        scene.load.audio('step_3', `step_3_${lang}.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio("hit_play", `hit_play_${lang}.mp3`);
    }

    init(data?: { reset?: boolean, level: number, parentScene: string }) {
        if (data?.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.inequality.init(data);
    }

    create() {
        // Add black title background
        this.scene.addRectangle(this.scene.display.width / 2, 96, this.scene.display.width, 128, 0x00141A, 1).setDepth(5);

        // Add how to play text
        const howToPlayText = this.scene.addText(this.scene.display.width / 2, 96, i18n.t('info.howToPlay'), {
            font: "700 26px Exo",
            color: '#FFFFFF',
        }).setOrigin(0.5).setDepth(10);
        new TextOverlay(this.scene, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.createSkipButton();
        
        this.inequality.create(this.parentScene);
        this.headingOverlay = new TextOverlay(
            this.scene,
            this.inequality.headingText!,
            {
                label: "",
                tag: "h2",
                role: "heading"
            }
        );
    
        this.doorUtils = new DoorUtils(this.scene);

        const timer = this.scene.time.delayedCall(1000, () => {
            this.playStep0();
        });
        this.delayedCalls.push(timer);
    }

    private createSkipButton() {
        ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.HALF_BUTTON.KEY,
                hover: BUTTONS.HALF_BUTTON_HOVER.KEY,
                pressed: BUTTONS.HALF_BUTTON_PRESSED.KEY,
            },
            text: i18n.t('common.skip'),
            label: i18n.t('common.skip'),
            textStyle: {
                font: "700 32px Exo",
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: this.scene.display.width - 54,
            y: 96,
            onClick: () => {
                if (this.isSkipped) {
                    return;
                }
                this.scene.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.startGameScene();
            }
        }).setDepth(10);
    }

    private createPlayButton(): void {
        this.inequality.hideHammerSprite();

        const playButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: this.parentScene === 'SplashScene' ? i18n.t("common.play") : i18n.t("common.back"),
            label: this.parentScene === 'SplashScene' ? i18n.t("common.play") : i18n.t("common.back"),
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.scene.display.width / 2,
            y: this.scene.display.height - 79,
            onClick: () => {
                if (this.isSkipped) {
                    return;
                }
                this.scene.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.startGameScene();
            },
        });
        playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    private playStep0() {
        if (this.isSkipped) {
            return;
        }
        // TODO: Update the audio.
        const step0 = this.scene.audioManager.playSoundEffect('step_0');

        const txt = i18n.t('info.inequality.step0');
        this.inequality.headingText?.setText(txt);
        this.headingOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        step0?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep1();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep1() {
        if (this.isSkipped) {
            return;
        }
        // TODO: Update the audio.
        const step1 = this.scene.audioManager.playSoundEffect('step_1');

        const txt = i18n.t('info.inequality.step1');
        this.inequality.headingText?.setText(txt);
        this.headingOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        step1?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep2() {
        if (this.isSkipped) {
            return;
        }
        const step2 = this.scene.audioManager.playSoundEffect('step_2');

        const txt = i18n.t('info.inequality.step2');
        this.inequality.headingText?.setText(txt);
        this.headingOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        step2?.on('complete', () => {
            const timer = this.scene.time.delayedCall(1000, () => {
                this.playStep3();
            });
            this.delayedCalls.push(timer);
        });
    }

    private playStep3() {
        if (this.isSkipped) {
            return;
        }
        this.scene.audioManager.playSoundEffect('step_3');

        const txt = i18n.t('info.inequality.step3');
        this.inequality.headingText?.setText(txt);
        this.headingOverlay.updateContent(txt);
        this.queueAnnouncement(txt, true);

        this.inequality.initializeInstructionsMode();

        const handleCorrectAnswer = (data: { isCorrect: boolean }) => {
            if (data.isCorrect) {
                this.destroyTimers();

                this.scene.time.delayedCall(1000, () => {
                    if (this.parentScene === 'SplashScene') {
                        this.scene.audioManager.playSoundEffect('hit_play');
                    }
                    // Add black background
                    this.scene.addRectangle(this.scene.display.width / 2, this.scene.display.height - 79, this.scene.display.width, 158, 0x000000, 1);
                    this.createPlayButton();
                });
            }
        }
        // Listen for correct answer event
        this.scene.events.once('correctanswer', handleCorrectAnswer);
    }

    public startGameScene() {
        if (this.parentScene === 'SplashScene') {
            // Close doors and start game scene
            this.doorUtils.closeDoors(() => {
                this.scene.audioManager.stopAllSoundEffects();
                this.scene.scene.stop('InstructionsScene');
                this.scene.scene.start('GameScene', {
                    reset: true,
                    mechanic: 'inequality',
                    level: this.level
                });
            });
        } else {
            this.scene.audioManager.playBackgroundMusic('bg_music');
            this.scene.scene.resume('GameScene');
            this.scene.scene.stop('InstructionsScene');
            this.scene.audioManager.resumeAll();
        }
    }

    private destroyTimers() {
        this.delayedCalls.forEach(timer => timer.destroy());
        this.delayedCalls = [];
    }

    private queueAnnouncement(message: string, priority: boolean = false) {
        if (priority) {
            // For priority announcements (like feedback), clear queue and add immediately
            this.announcementQueue = [message];
            this.isAnnouncing = false;
        } else {
            this.announcementQueue.push(message);
        }
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }
    
        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;
    
        // Clear first, then announce with a small delay
        announceToScreenReader('', 'assertive');
        
        setTimeout(() => {
            announceToScreenReader(message, 'assertive');
            
            // Estimate the duration of the announcement
            const words = message.split(' ').length;
            const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
            const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds
    
            this.scene.time.delayedCall(delay, () => {
                this.isAnnouncing = false;
                this.processAnnouncementQueue();
            });
        }, 50);
    }
}

export default InequalityTutorial;   
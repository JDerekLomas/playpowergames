import { BaseScene, i18n, ScoreHelper, ScoreCoins, setSceneBackground, TextOverlay, announceToScreenReader, focusToGameContainer } from "@k8-games/sdk";
import { SUCCESS_TEXT_KEYS } from "../config/common";

export class CelebrationScene extends BaseScene {
    // private progressBar!: ProgressBar;
    // private progress: number;
    private scoreHelper!: ScoreHelper;
    private callback: () => void;
    private scoreCoins!: ScoreCoins;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
        super("CelebrationScene");
        this.callback = () => { };
        // this.progress = 0;
    }

    init(data: {
        scoreHelper: ScoreHelper;
        streakColor: number;
        callback: () => void;
        // progress: number;
    }) {
        this.scoreHelper = data.scoreHelper;
        this.callback = data.callback;
        // this.progress = data.progress;

        // ProgressBar.init(this);
    }

    create() {
        focusToGameContainer();
        setSceneBackground('assets/images/common/bg.png');

        this.addImage(this.display.width / 2, this.display.height / 2, 'celebration_scene_bg').setOrigin(0.5);

        // this.progressBar = new ProgressBar(this, 'dark', i18n, { animateStreakAndStars: false });

        // Add score star
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(
            this.getScaledValue(105),
            this.getScaledValue(67)
        );
        this.scoreCoins.setFrame('coin0018');
        this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);
        this.scoreCoins.setScore(this.scoreHelper.getTotalScore());

        // this.progressBar.create(
        //     this.getScaledValue(this.display.width / 2),
        //     this.getScaledValue(70),
        // ).setDepth(2);

        // this.progressBar.drawProgressFill(this.progress, this.scoreHelper.getCurrentStreak());

        const celebTextValue = i18n.t(
            `common.${SUCCESS_TEXT_KEYS[
            Math.floor(Math.random() * SUCCESS_TEXT_KEYS.length)
            ]
            }`
        );
        const celebText = this.addText(
            this.display.width / 2,
            this.display.height / 2 - 250,
            celebTextValue,
            {
                font: "700 30px Exo",
                color: "#ffffff",
            }
        ).setOrigin(0.5);
        new TextOverlay(this, celebText, { label: celebTextValue });
        
        this.time.delayedCall(250, () => {
            announceToScreenReader(celebTextValue, "assertive");
        })

        // Create the streak animation sprite (initially hidden)
        const streakAnimation = this.addSprite(this.display.width / 2, this.display.height / 2, 'streak_animation').setOrigin(0.5);

        // streakAnimation.play('power_up');

        const mascotImage = this.addImage(this.display.width / 2, this.display.height / 2 + 22, 'mascot').setOrigin(0.5);

        // this.showSuccessAnimation();

        this.time.delayedCall(3000, () => {
            celebText.destroy();
            streakAnimation.destroy();
            mascotImage.destroy();
            this.callback?.();
            this.scene.resume("GameScene");
            this.scene.stop();
        });
    }

    // private showSuccessAnimation() {
    //     const width = this.display.width;
    //     const height = 122;
    //     const successContainer = this.add.container(this.getScaledValue(this.display.width / 2), this.getScaledValue(this.display.height + height / 2));

    //     // Create background rectangle
    //     const bgRect = this.addRectangle(0, 0, width, height, 0x1A8B29);
    //     successContainer.add(bgRect);

    //     const bgRectTop = this.addRectangle(0, -height / 2, width, 7, 0x24E13E).setOrigin(0.5, 0);
    //     successContainer.add(bgRectTop);

    //     // Create icon and text
    //     const icon = this.addImage(0, 0, 'correct_icon').setOrigin(0.5);

    //     successContainer.add(icon);

    //     // Simple slide up animation
    //     this.tweens.add({
    //         targets: successContainer,
    //         y: this.getScaledValue(this.display.height - height / 2),
    //         duration: 500,
    //         ease: "Power2",
    //         onComplete: () => {
    //             new ImageOverlay(this, icon, { label: i18n.t("common.correct") + " " + i18n.t("common.icon") });
    //             // Wait for a moment and then slide down
    //             this.time.delayedCall(3000, () => {
    //                 this.tweens.add({
    //                     targets: successContainer,
    //                     y: this.getScaledValue(this.display.height + height / 2),
    //                     duration: 500,
    //                     ease: "Power2",
    //                     onComplete: () => {
    //                         successContainer.destroy();
    //                     }
    //                 });
    //             });
    //         }
    //     });
    // }

    // private queueAnnouncement(message: string, priority: boolean = false) {
    //     if (priority) {
    //         // For priority announcements (like feedback), clear queue and add immediately
    //         this.announcementQueue = [message];
    //         this.isAnnouncing = false;
    //     } else {
    //         this.announcementQueue.push(message);
    //     }
    //     this.processAnnouncementQueue();
    // }
    
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
    
            this.time.delayedCall(delay, () => {
                this.isAnnouncing = false;
                this.processAnnouncementQueue();
            });
        }, 50);
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/celebration_screen');
        scene.load.image('celebration_scene_bg', 'bg.png');
        scene.load.image('mascot', 'mascot.png');
    }
}

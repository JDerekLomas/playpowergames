import { BaseScene, ButtonHelper, i18n, announceToScreenReader, focusToGameContainer, TextOverlay } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, CUT_SCENE_ASSETS } from '../config/common';

export class CutScene extends BaseScene {
    private sceneText!: Phaser.GameObjects.Text;
    private currentImage!: Phaser.GameObjects.Image;
    private cutSceneContainer!: Phaser.GameObjects.Container;
    private beginMissionButton!: Phaser.GameObjects.Container;
    private lang: string;
    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;
    
    private sceneTextOverlay!: TextOverlay;
    
    constructor() {
        super('CutScene');
        this.lang = i18n.getLanguage() || "en";
    }

    init() {
        if(!this.anims.exists('astrobot_shine')) {
            this.anims.create({
                key: 'shine',
                frames: 'astrobot_shine',
                frameRate: 24,
                repeat: -1,
            });
        }
        // Set background
        const backgroundImage = this.addImage(this.display.width / 2, this.display.height / 2, CUT_SCENE_ASSETS.INTRO_PART1.KEY).setOrigin(0.5);
        // Create dark overlay
        this.addRectangle(
            0,
            0,
            this.display.width,
            this.display.height,
            0x000000,
            0.25
        )
            .setOrigin(0)
            .setScrollFactor(0);
        
        // Initialize audio manager
        this.audioManager.initialize(this);
        // Create scene text and align at bottom
        this.audioManager.playSoundEffect(`intro_part0_${this.lang}`);
        this.sceneText = this.addText(
            this.display.width / 2,
            this.display.height/ 2 - 60,
            i18n.t('cutScene.journeyBegins'),
            {
                font: '500 26px Exo',
                color: '#ffffff',
                align: 'center',
                wordWrap: {
                    width: this.display.width - 300,
                    useAdvancedWrap: true
                }
            }
        ).setOrigin(0.5);
        new TextOverlay(this, this.sceneText, { label: i18n.t('cutScene.journeyBegins') });

        // Focus to game container and announce initial message
        focusToGameContainer();
        this.time.delayedCall(1000, () => {
            this.queueAnnouncement(i18n.t('cutScene.journeyBegins'));
        });

        // Add a button in the center of the screen with buttonHelper
        this.beginMissionButton = this.createBeginMissionButton(backgroundImage);

        //add breathing animation to the button
        ButtonHelper.startBreathingAnimation(this.beginMissionButton, {
            scale: 1.1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
    }

    private createSkipButton(): Phaser.GameObjects.Container {
        const skipButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.HALF_BUTTON.KEY,
                hover: BUTTONS.HALF_BUTTON_HOVER.KEY,
                pressed: BUTTONS.HALF_BUTTON_PRESSED.KEY,
            },
            text: i18n.t('cutScene.skip'),
            label: i18n.t('cutScene.skip'),
            textStyle: {
                font: '700 32px Exo',
                color: '#ffffff',
            },
            x: this.display.width - 80,
            y: 100,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.stopAllSoundEffects();
                this.scene.start('SplashScene');
            },
        }).setDepth(10);
        
        // Automatically focus the skip button for accessibility
        const buttonOverlay = (skipButton as any).buttonOverlay;
        if (buttonOverlay && buttonOverlay.element) {
            buttonOverlay.element.focus();
        }
        
        return skipButton;
    }

    private createBeginMissionButton(backgroundImage: Phaser.GameObjects.Image): Phaser.GameObjects.Container {
        return ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('cutScene.beginMission'),
            label: i18n.t('cutScene.beginMission'),
            textStyle: {
                font: '700 32px Exo',
                color: '#ffffff',
            },
            x: this.display.width / 2,
            y: this.display.height / 2 + 30,
            raisedOffset: 3.5,
            onClick: () => {
                // Destroy the begin mission button
                this.beginMissionButton.destroy();
                this.audioManager.stopAllSoundEffects();
                // Create skip button in top right corner (focus will be set automatically)
                this.createSkipButton();
                backgroundImage.setVisible(false);
                this.sceneText.setVisible(false);
                this.cameras.main.setBackgroundColor('#000000');
                this.audioManager.playBackgroundMusic('bg-music');
                this.audioManager.setMusicVolume(0.05);
                this.playIntroPart1();
            },
        });
    }

    private playIntroPart1() {
        const sound = this.audioManager.playSoundEffect(`intro_part1_${this.lang}`);
        const introText = i18n.t('cutScene.introPart1');

        this.sceneText = this.addText(
            this.display.width / 2,
            this.display.height - 50,
            i18n.t('cutScene.introPart1'),
            {
                font: '400 26px Exo',
                color: '#ffffff',
            }
        ).setOrigin(0.5);
        this.sceneTextOverlay = new TextOverlay(this, this.sceneText, { label: introText });
    
        // Announce for screen readers
        this.queueAnnouncement(introText);

        // Create a container for the cut scene images
        this.cutSceneContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height / 2 - 125)
        ).setDepth(1);

        // Add the main intro image
        this.currentImage = this.addImage(
            0, // Relative to container
            0, // Relative to container
            CUT_SCENE_ASSETS.INTRO_PART1.KEY
        ).setOrigin(0.5)
        .setScale(1, 0.9);
        this.cutSceneContainer.add(this.currentImage);

        // Add planet background
        const planetBg = this.addImage(
            0, // Relative to container
            50, // Relative to container
            CUT_SCENE_ASSETS.PLANET_BACKGROUND.KEY
        ).setOrigin(0.5)
        .setDepth(2);
        this.cutSceneContainer.add(planetBg);

        // Add planet
        const planet = this.addImage(
            0, // Relative to container
            50, // Relative to container
            CUT_SCENE_ASSETS.PLANET.KEY
        ).setOrigin(0.5)
        .setDepth(3);
        this.cutSceneContainer.add(planet);

        // Add subtle zoom out animation to the container
        this.tweens.add({
            targets: this.cutSceneContainer,
            scale: this.cutSceneContainer.scale * 1.1,
            duration: 1000,
            ease: 'Power2'
        });

        // Add breathing animation to the planet background
        this.tweens.add({
            targets: planetBg,
            scale: planetBg.scale * 1.05,
            duration: 700,
            ease: 'Sine.easeOut',
            yoyo: true,
            repeat: -1,
            hold: 300,
            yoyoDelay: 300,
        });

        if (sound) {
            sound.on('complete', () => {
                // Use common fade out animation function
                this.playFadeInAndOutAnimation(0, 'Sine.easeOut', () => {
                    // After fade out, transition to part2
                    this.playIntroPart2();
                });
            });
        }
    }

    private playFadeInAndOutAnimation(alpha: number, ease: string, onComplete?: () => void) {
        this.tweens.add({
            targets: [this.cutSceneContainer, this.sceneText],
            alpha: alpha,
            duration: 1000,
            ease: ease,
            onComplete: onComplete
        });
    }

    private playIntroPart2() {
        const sound = this.audioManager.playSoundEffect(`intro_part2_${this.lang}`);
        const introText = i18n.t('cutScene.introPart2');

        this.sceneText = this.addText(
            this.display.width / 2,
            this.display.height - 50,
            i18n.t('cutScene.introPart2'),
            {
                font: '400 26px Exo',
                color: '#ffffff',
            }
        ).setOrigin(0.5);
        this.sceneTextOverlay = new TextOverlay(this, this.sceneText, { label: introText });
    
        // Announce for screen readers
        this.queueAnnouncement(introText);
        
        // Destroy existing images from the container
        if (this.cutSceneContainer) {
            this.cutSceneContainer.destroy();
        }
        
        // Create a new container for intro part 2
        this.cutSceneContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height / 2 - 50)
        ).setDepth(1);

        // Add the intro part 2 image
        this.currentImage = this.addImage(
            0, // Relative to container
            0, // Relative to container
            CUT_SCENE_ASSETS.INTRO_PART2.KEY
        ).setOrigin(0.5)
        .setScale(1.05);
        this.cutSceneContainer.add(this.currentImage);

        // Add background asteroid image (contains multiple asteroids)
        const backgroundAsteroid = this.addImage(
            100, // Position relative to container
            -100, // Position relative to container  
            CUT_SCENE_ASSETS.ASTEROID2.KEY
        ).setOrigin(0.5)
        .setDepth(1); // Behind other elements
        this.cutSceneContainer.add(backgroundAsteroid);

        // Add foreground asteroid image (contains multiple asteroids)
        const foregroundAsteroid = this.addImage(
            -80, // Same position relative to container
            -100, // Same position relative to container
            CUT_SCENE_ASSETS.ASTEROID1.KEY
        ).setOrigin(0.5)
        .setDepth(4); // In front of other elements
        this.cutSceneContainer.add(foregroundAsteroid);

        // Add third asteroid layer for more depth
        const midgroundAsteroid = this.addImage(
            0, // Same position relative to container
            -100, // Same position relative to container
            CUT_SCENE_ASSETS.ASTEROID3.KEY
        ).setOrigin(0.5)
        .setScale(1.0)
        .setDepth(2); // Middle depth
        this.cutSceneContainer.add(midgroundAsteroid);
        
        // Start asteroid animations immediately
        // Background asteroid (slower movement)
        this.tweens.add({
            targets: backgroundAsteroid,
            x: backgroundAsteroid.x + 80, // Smoother diagonal right movement
            y: backgroundAsteroid.y + 50, // Smoother diagonal down movement
            duration: 10000, // Slower, smoother movement
            ease: 'Sine.easeInOut', // Smoother easing
            repeat: -1, // Continuous movement
            yoyo: true // Back and forth movement
        });

        // Foreground asteroid (slightly different smooth movement)
        this.tweens.add({
            targets: foregroundAsteroid,
            x: foregroundAsteroid.x + 60, // Smoother diagonal right movement
            y: foregroundAsteroid.y + 40, // Smoother diagonal down movement
            duration: 7000, // Slightly faster but still smooth
            ease: 'Sine.easeInOut', // Smoother easing
            repeat: -1, // Continuous movement
            yoyo: true // Back and forth movement
        });

        // Midground asteroid (medium speed movement for layered parallax)
        this.tweens.add({
            targets: midgroundAsteroid,
            x: midgroundAsteroid.x + 70, // Medium diagonal right movement
            y: midgroundAsteroid.y + 45, // Medium diagonal down movement
            duration: 8500, // Medium speed between background and foreground
            ease: 'Sine.easeInOut', // Smoother easing
            repeat: -1, // Continuous movement
            yoyo: true // Back and forth movement
        });

        // Add subtle container movement
        this.tweens.add({
            targets: this.cutSceneContainer,
            x: this.cutSceneContainer.x - 30, // Gentle left movement
            duration: (sound?.duration ?? 5) * 1000, // Duration matches audio
            ease: 'Sine.easeInOut', // Smooth easing
            repeat: 0,
            yoyo: false
        });

        // Add a fade in animation to the container (but start animations immediately)
        this.playFadeInAndOutAnimation(1, 'Sine.easeIn');

        if (sound) {
            sound.on('complete', () => {
                // Use common fade out animation function
                this.playFadeInAndOutAnimation(0, 'Sine.easeOut', () => {
                    this.playIntroPart3();
                });
            });
        }
    }

    private playIntroPart3() {
        const introText = i18n.t('cutScene.introPart3');
        this.sceneText.setText(introText);        
        this.sceneTextOverlay.updateContent(introText);

        // Announce for screen readers
        this.queueAnnouncement(introText);
        
        // Destroy existing images from the container
        if (this.cutSceneContainer) {
            this.cutSceneContainer.destroy();
        }
        
        // Create a new container for intro part 3
        this.cutSceneContainer = this.add.container(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(this.display.height / 2 - 125)
        ).setDepth(1);

        // Add the intro part 3 image
        this.currentImage = this.addImage(
            0, // Relative to container
            0, // Relative to container
            CUT_SCENE_ASSETS.INTRO_PART3.KEY
        ).setOrigin(0.5);
        this.cutSceneContainer.add(this.currentImage);

        // Create a separate container for astrobot and its shine
        const astrobotContainer = this.add.container(
            0, // Relative to main container
            0, // Relative to main container
        )
        .setDepth(2)
        this.cutSceneContainer.add(astrobotContainer);

        // Add astrobot to the astrobot container
        const astrobot = this.addImage(
            0, // Relative to astrobot container
            25, // Relative to astrobot container and at bottom
            CUT_SCENE_ASSETS.ASTROBOT_1.KEY
        ).setOrigin(0.5);
        astrobotContainer.add(astrobot);

        // Add astrobot shine sprite to the astrobot container
        const astrobotShine = this.addSprite(
            10, // Relative to astrobot container
            30, // Relative to astrobot container
            'astrobot_shine'
        ).setOrigin(0.5)
        .setAlpha(0.5)
        .setDepth(3); // Higher depth than astrobot to appear on top
        astrobotContainer.add(astrobotShine);
        
        // Add a fade in animation to the container
        this.playFadeInAndOutAnimation(1, 'Sine.easeIn', () => {
            const sound = this.audioManager.playSoundEffect(`intro_part3_${this.lang}`);
            // Add subtle zoom out animation to the container
            this.tweens.add({
               targets: this.cutSceneContainer,
               scale: this.cutSceneContainer.scale * 1.1,
               duration: 1000,
               ease: 'Linear'
           });

            //play the shine animation
            this.time.delayedCall(1000, () => {
                astrobotShine.play('shine');
            });
            if (sound) {
                sound.on('complete', () => {
                    // Transition to next scene after audio completes
                    this.playFadeInAndOutAnimation(0, 'Sine.easeOut', () => {
                        this.scene.start('SplashScene');
                    });
                });
            }
        });
    }

    private queueAnnouncement(message: string) {
        this.announcementQueue.push(message);
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }
    
        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;
    
        announceToScreenReader(message);
    
        // Estimate the duration of the announcement and wait before processing next
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds
    
        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }

    shutdown() {
        this.audioManager.stopAllSoundEffects();
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        scene.load.setPath(`${CUT_SCENE_ASSETS.PATH}`);
        scene.load.image(CUT_SCENE_ASSETS.INTRO_PART1.KEY, CUT_SCENE_ASSETS.INTRO_PART1.PATH);
        scene.load.image(CUT_SCENE_ASSETS.INTRO_PART2.KEY, CUT_SCENE_ASSETS.INTRO_PART2.PATH);
        scene.load.image(CUT_SCENE_ASSETS.INTRO_PART3.KEY, CUT_SCENE_ASSETS.INTRO_PART3.PATH);
        scene.load.image(CUT_SCENE_ASSETS.PLANET.KEY, CUT_SCENE_ASSETS.PLANET.PATH);
        scene.load.image(CUT_SCENE_ASSETS.PLANET_BACKGROUND.KEY, CUT_SCENE_ASSETS.PLANET_BACKGROUND.PATH);
        scene.load.image(CUT_SCENE_ASSETS.ASTEROID1.KEY, CUT_SCENE_ASSETS.ASTEROID1.PATH);
        scene.load.image(CUT_SCENE_ASSETS.ASTEROID2.KEY, CUT_SCENE_ASSETS.ASTEROID2.PATH);
        scene.load.image(CUT_SCENE_ASSETS.ASTEROID3.KEY, CUT_SCENE_ASSETS.ASTEROID3.PATH);
        scene.load.image(CUT_SCENE_ASSETS.ASTROBOT_1.KEY, CUT_SCENE_ASSETS.ASTROBOT_1.PATH);

        // Load astrobot_shine atlas
        scene.load.setPath('assets/atlases/astrobot_shine');
        scene.load.atlas('astrobot_shine', 'astrobot_shine.png', 'astrobot_shine.json');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/cut_screen`);
        scene.load.audio(`intro_part0_${lang}`, `intro_part0_${lang}.mp3`);
        scene.load.audio(`intro_part1_${lang}`, `intro_part1_${lang}.mp3`);
        scene.load.audio(`intro_part2_${lang}`, `intro_part2_${lang}.mp3`);
        scene.load.audio(`intro_part3_${lang}`, `intro_part3_${lang}.mp3`);
    }
} 
import { BaseScene } from './BaseScene';
import { CommonConfig } from '../config/CommonConfig';
import { HowToPlaySceneConfig as Config } from '../config/HowToPlaySceneConfig';
import { announceToScreenReader, ButtonHelper, ButtonOverlay, focusToGameContainer, GameConfigManager, i18n, Question, setSceneBackground } from '@k8-games/sdk';
import { QuestionData } from '../interfaces/gameplay';
import { GameplayManager } from '../managers/GameplayManager';
import { CountdownUtils } from '../utils/CountdownUtils';
import { getTopicQuestion } from '../config/TopicQuestionConfig';
import {
    FractionsHowToPlay,
    ClickingHowToPlay,
    TypingHowToPlay,
    CompareDecimals,
    type FractionsHowToPlayData,
    type ClickingHowToPlayData,
    type TypingHowToPlayData,
    type CompareDecimalsData
} from '../howToPlayModules';
import { AdditionInfo, AdditionInfoData } from '../howToPlayModules/AdditionInfo';
import { SubtractionInfo, SubtractionInfoData } from '../howToPlayModules/SubtractionInfo';
import { FractionAdditionInfo, FractionAdditionInfoData } from '../howToPlayModules/FractionAdditionInfo';
import { PlacingNumber, PlacingNumberData } from '../howToPlayModules/PlacingNumber';
import { extractGameParams } from '../utils/UrlParamsUtils';
import { topics } from "../../resources/topics.json";
import { EquivalentFraction, EquivalentFractionData } from '../howToPlayModules/EquivalentFraction';
import { FractionSubtractionInfo, FractionSubtractionInfoData } from '../howToPlayModules/FractionSubtractionInfo';
import { MultiplyFractions, MultiplyFractionsData } from '../howToPlayModules/MultiplyFractions';
import { MultiplicationInfo, MultiplicationInfoData } from '../howToPlayModules/MultiplicationInfo';
import { DivisionInfo, DivisionInfoData } from '../howToPlayModules/DivisionInfo';

const {
    ASSETS: {
        KEYS: { FONT: fontKeys, IMAGE: { BUTTON: buttonKeys, ICON: iconKeys } },
    },
} = CommonConfig;

export class HowToPlayScene extends BaseScene {
    private level: number;
    private mapLevel: number;
    private topic: string;
    private parentScene: string;
    private gameplayManager: GameplayManager;
    private question: QuestionData;
    private useQuestionBank: boolean;
    private isTypingMode: boolean = false;
    private muteButton: Phaser.GameObjects.Container;
    private playButton!: Phaser.GameObjects.Container;
    private howToPlayModule?: FractionsHowToPlay | ClickingHowToPlay | TypingHowToPlay | AdditionInfo | SubtractionInfo | FractionAdditionInfo | CompareDecimals | PlacingNumber | EquivalentFraction | FractionSubtractionInfo | MultiplyFractions | MultiplicationInfo | DivisionInfo;

    constructor() {
        super({ key: 'HowToPlayScene' });
    }

    init(data: { useQuestionBank: boolean; topic: string; parentScene: string; mapLevel?: number; level?: number }) {
        this.useQuestionBank = data.useQuestionBank;
        this.level = data.level ?? 0;
        this.mapLevel = data.mapLevel ?? 0;
        this.topic = data.topic;
        this.parentScene = data.parentScene;
        this.gameplayManager = new GameplayManager(this, this.useQuestionBank, this.topic, data.useQuestionBank ? data.mapLevel : this.level);
        this.isTypingMode = this.gameplayManager.getMode() === 'typing';
        // Get the first question from gameplay manager as fallback
        const fallbackQuestion = this.gameplayManager.getFirstQuestion();
        // Use topic-specific question if available, otherwise use fallback
        if (this.mapLevel) {
            this.question = getTopicQuestion(this.topic, fallbackQuestion, this.mapLevel);
        } else {
            this.question = getTopicQuestion(this.topic, fallbackQuestion);
        }
        if (this.question.csvQuestion) {
            this.updateQuestionPrompt(this.question.csvQuestion);
        }

        this.audioManager.initialize(this);
        if (this.parentScene === "MapScene") {
            this.removeClouds();
        }

    }

    create() {
        // Set background color
        setSceneBackground('assets/images/how_to_play/background.png');
        this.cameras.main.setBackgroundColor('#140E31');

        if (this.parentScene === 'GameScreen' && !this.isTypingMode) {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('howToPlay.helpPage'));
            })
        }

        // Create the appropriate how-to-play module based on topic and mode
        this.createHowToPlayModule();

        this.createMuteButton();

        if (this.parentScene === 'GameScreen') {
            this.audioManager.setMusicMute(true);
        } else {
            this.audioManager.initialize(this);
        }
    }

    private createHowToPlayModule() {
        const moduleData = {
            scene: this,
            question: this.question,
            gameplayManager: this.gameplayManager,
            parentScene: this.parentScene,
            useQuestionBank: this.useQuestionBank,
            topic: this.topic,
            level: this.mapLevel,
            onComplete: () => this.startGameScreen(),
            createSkipButton: () => this.createSkipButton()
        };

        if (this.topic === 'campaign') {
            // Campaign: show skip button immediately, no animated tutorial
            this.createSkipButton();
            this.createPlayButton();
            return;
        } else if (this.topic === 'fractions_as_numbers' && this.mapLevel === 1) {
            this.howToPlayModule = new FractionsHowToPlay(moduleData as FractionsHowToPlayData);
        } else if (this.topic === 'add_and_subtract_within_100') {
            this.howToPlayModule = new AdditionInfo(moduleData as AdditionInfoData);
        }  
        else if (this.topic === 'add_and_subtract_decimals') {
            if (this.mapLevel === 1) {
                this.howToPlayModule = new PlacingNumber(moduleData as PlacingNumberData);
            } else if (this.mapLevel === 2) {
                this.howToPlayModule = new AdditionInfo(({ ...moduleData, isDecimal: true }) as AdditionInfoData);
            } else {
                this.howToPlayModule = new SubtractionInfo(({ ...moduleData, isDecimal: true }) as SubtractionInfoData);
            }
        } else if (this.topic === 'subtract_within_1000') {
            this.howToPlayModule = new SubtractionInfo(moduleData as SubtractionInfoData);
        } else if (this.topic === 'add_and_subtract_fractions')  {
            if (this.mapLevel === 1) {
                this.howToPlayModule = new EquivalentFraction(moduleData as EquivalentFractionData);
            } else if (this.mapLevel === 3) {
                this.howToPlayModule = new FractionSubtractionInfo(moduleData as FractionSubtractionInfoData);
            } else {
                this.howToPlayModule = new FractionAdditionInfo(moduleData as FractionAdditionInfoData);
            }
        } else if (this.topic === 'addition_and_subtraction_of_fractions_mixed_numbers') {
            if (this.mapLevel === 2) {
                this.howToPlayModule = new FractionSubtractionInfo(moduleData as FractionSubtractionInfoData);
            } else {
                this.howToPlayModule = new FractionAdditionInfo(moduleData as FractionAdditionInfoData);
            }
        } else if (this.topic === 'explore_numbers_to_1000') {
            if (this.mapLevel === 3) {
                this.howToPlayModule = new TypingHowToPlay(moduleData as TypingHowToPlayData);
            } else {
                this.howToPlayModule = new PlacingNumber(moduleData as PlacingNumberData);
            }
        } else if (this.isTypingMode) {
            this.howToPlayModule = new TypingHowToPlay(moduleData as TypingHowToPlayData);
        } else if (this.topic === 'understand_and_compare_decimals') {
            if (this.mapLevel === 3) {
                this.howToPlayModule = new TypingHowToPlay(moduleData as TypingHowToPlayData);
            } else {
                this.howToPlayModule = new CompareDecimals(moduleData as CompareDecimalsData);
            }
        } else if (this.topic === 'rational_numbers') {
            if (this.mapLevel === 1) {
                this.howToPlayModule = new AdditionInfo(moduleData as AdditionInfoData);
            } else if (this.mapLevel === 2) {
                this.howToPlayModule = new SubtractionInfo(moduleData as SubtractionInfoData);
            } else if(this.mapLevel === 3) {
                this.howToPlayModule = new MultiplicationInfo(moduleData as MultiplicationInfoData);
            } else {
                this.howToPlayModule = new DivisionInfo(moduleData as DivisionInfoData);
            }
        } else if (this.topic === 'multiply_fractions') {
            this.howToPlayModule = new MultiplyFractions(moduleData as MultiplyFractionsData);
        } else if (this.topic === 'percents') {
            if(this.mapLevel === 1) {
                this.howToPlayModule = new TypingHowToPlay(moduleData as TypingHowToPlayData);
            } else {
                this.howToPlayModule = new PlacingNumber(moduleData as PlacingNumberData);
            }
        } else {
            this.howToPlayModule = new ClickingHowToPlay({
                ...(moduleData as ClickingHowToPlayData),
                playButton: this.playButton
            });
        }

        this.howToPlayModule.create();
    }

    private updateQuestionPrompt(question: Question) {
        if (this.topic === 'add_and_subtract_decimals') {
            if (this.mapLevel === 1) {
                this.question.questionPrompt = i18n.getLanguage() === 'en' ? this.question.csvQuestion?.questionEN : this.question.csvQuestion?.questionES;
            } 
        }
        if (this.topic === 'understand_and_compare_decimals') {
            this.question.questionPrompt = i18n.t('gameScreen.plot', { number: question.operand1 });
        }
        if (this.topic === 'add_and_subtract_fractions') {
            if (this.mapLevel === 1) {
                this.question.questionPrompt = i18n.t('gameScreen.plot', { number: question.operand1 });
            }
        }
        if (this.topic === 'percents') {
            if (this.mapLevel === 5) {
                this.question.questionPrompt = i18n.t('gameScreen.ofOperation', { percent: question.operand1, number: question.operand2 });
            }
            if (this.mapLevel === 2 || this.mapLevel === 3 || this.mapLevel === 4) {
                this.question.questionPrompt = i18n.t('gameScreen.place', { number: question.operand1 });
            }
        }
    }

    private createMuteButton() {
        const handleMuteButtonClick = () => {
            this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            const icon = this.muteButton.getAt(1) as Phaser.GameObjects.Image;
            icon.setTexture(this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON);
        };

        this.muteButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            raisedOffset: 3.5,
            x: this.display.width - 95,
            y: this.display.height - 75,
            onClick: handleMuteButtonClick,
        }).setDepth(10);

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteButton.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteButton as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteButton.getData('state');
            if(muteBtnState != label) {
                this.muteButton.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteButton.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private startGameScreen() {
        this.audioManager.stopAllSoundEffects();
        this.handlePlayButtonClick();
    }

    public createSkipButton(): Phaser.GameObjects.Container {
        const skipButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'half_button_default',
                hover: 'half_button_hover',
                pressed: 'half_button_pressed',
            },
            text: i18n.t(`tutorial.${this.parentScene === 'GameScreen' ? 'back' : 'skip'}`),
            label: i18n.t(`tutorial.${this.parentScene === 'GameScreen' ? 'back' : 'skipTutorial'}`),
            textStyle: {
                font: "700 32px Exo",
                color: '#ffffff',
            },
            // imageScale: 0.5,
            // padding: 40,
            raisedOffset: 3.5,
            x: this.display.width - 80,
            y: 61,
            onClick: () => {
                this.howToPlayModule?.destroy();
                this.startGameScreen();
            },
        }).setDepth(10);

        return skipButton;
    }

    private createPlayButton(): void {
        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: CommonConfig.ASSETS.KEYS.IMAGE.BUTTON.DEFAULT,
                hover: CommonConfig.ASSETS.KEYS.IMAGE.BUTTON.HOVER,
                pressed: CommonConfig.ASSETS.KEYS.IMAGE.BUTTON.PRESSED,
            },
            text: `${i18n.t(`common.${this.parentScene === 'GameScreen' ? 'back' : 'play'}`)}`,
            label: `${i18n.t(`common.${this.parentScene === 'GameScreen' ? 'back' : 'play'}`)}`,
            textStyle: {
                fontSize: '36px',
                fontFamily: fontKeys.EXO,
                fontStyle: 'bold',
                color: '#ffffff',
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 67,
            onClick: () => {
                this.howToPlayModule?.destroy();
                this.disableButton(this.playButton);
                this.startGameScreen();
            },
        });
    }

    private disableButton(button: Phaser.GameObjects.Container) {
        button.removeInteractive();
        const overlay = (button as any).buttonOverlay;
        if (overlay) overlay.cleanup();
    }

    private handlePlayButtonClick() {
        if (this.parentScene === 'GameScreen') {
            this.scene.resume(this.parentScene);
            this.scene.stop();
            this.audioManager.setMusicMute(false);
        } else {
            this.scene.stop();
            this.scene.start('GameScreen', {
                useQuestionBank: this.useQuestionBank,
                topic: this.topic,
                parentScene: this.parentScene,
                ...(this.useQuestionBank ? { mapLevel: this.mapLevel } : { level: this.level }),
            });
        }
    }

    private removeClouds() {
        const offset = 500;
        const cloud1 = this.addImage(this.display.width / 2, this.display.height / 2, 'cloud').setOrigin(0.5).setDepth(1000);
        const cloud2 = this.addImage(this.display.width / 2, this.display.height / 2, 'cloud').setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: cloud1,
            alpha: 0,
            x: -offset,
            y: this.getScaledValue(this.display.height + offset),
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => {
                cloud1.destroy();
                cloud2.destroy();
            }
        });

        this.tweens.add({
            targets: cloud2,
            alpha: 0,
            x: this.getScaledValue(this.display.height + offset),
            y: -offset,
            duration: 1000,
            ease: 'Sine.easeOut',
        });
    }

    /**
     * Creates a dotted guideline that masks around text elements
     * @param targetX The X position where the guideline should be drawn
     * @param startY The starting Y position for the guideline
     * @param totalHeight The total height of the guideline
     * @param markers Array of markers to check for text masking
     * @param options Configuration options for the guideline
     * @returns The created graphics object
     */
    public createMaskedGuideline(
        targetX: number,
        startY: number,
        totalHeight: number,
        markers: { line: Phaser.GameObjects.Rectangle; text: any }[],
        options: {
            lineColor?: number;
            lineWidth?: number;
            dotHeight?: number;
            gap?: number;
            tolerance?: number;
            textPadding?: number;
        } = {}
    ): Phaser.GameObjects.Graphics {
        const {
            lineColor = 0xFFF600,
            lineWidth = 4,
            dotHeight = 30,
            gap = 10,
            tolerance = 20,
            textPadding = 10
        } = options;

        const guideline = this.add.graphics();
        guideline.lineStyle(this.getScaledValue(lineWidth), lineColor);

        const scaledDotHeight = this.getScaledValue(dotHeight);
        const scaledGap = this.getScaledValue(gap);
        const scaledTolerance = this.getScaledValue(tolerance);
        const scaledTextPadding = this.getScaledValue(textPadding);

        // Find if there's a marker at the target X position
        let targetMarker: { line: Phaser.GameObjects.Rectangle; text: any } | null = null;
        
        for (const marker of markers) {
            if (marker && Math.abs(marker.line.x - targetX) < scaledTolerance) {
                targetMarker = marker;
                break;
            }
        }

        // If there's a marker at targetX, create gaps for the text
        if (targetMarker && targetMarker.text) {
            const textContainer = targetMarker.text.getContainer();
            const textBounds = textContainer.getBounds();
            
            // Calculate text area bounds with padding
            const textLeft = textBounds.left;
            const textRight = textBounds.right;
            const textTop = textBounds.top - scaledTextPadding;
            const textBottom = textBounds.bottom + scaledTextPadding;
            
            // Check if targetX is within the text bounds
            if (targetX >= textLeft && targetX <= textRight) {
                // Create gaps in the line where text overlaps
                this.drawDottedLineWithTextGaps(
                    guideline,
                    targetX,
                    startY,
                    totalHeight,
                    textTop,
                    textBottom,
                    scaledDotHeight,
                    scaledGap
                );
                return guideline;
            }
        }

        // If no text at targetX or targetX is outside text bounds, draw normal dotted line
        this.drawDottedLine(guideline, targetX, startY, totalHeight, scaledDotHeight, scaledGap);
        return guideline;
    }

    private drawDottedLineWithTextGaps(
        guideline: Phaser.GameObjects.Graphics,
        targetX: number,
        startY: number,
        totalHeight: number,
        textTop: number,
        textBottom: number,
        dotHeight: number,
        gap: number
    ): void {
        // Draw dotted line above text
        let y = textTop - (dotHeight + gap);
        while (y >= startY) {
            guideline.beginPath();
            guideline.moveTo(targetX, y);
            guideline.lineTo(targetX, y + dotHeight);
            guideline.strokePath();
            y -= (dotHeight + gap);
        }

        // Draw dotted line below text
        y = textBottom;
        while (y < startY + totalHeight) {
            guideline.beginPath();
            guideline.moveTo(targetX, y);
            guideline.lineTo(targetX, y + dotHeight);
            guideline.strokePath();
            y += dotHeight + gap;
        }
    }

    private drawDottedLine(
        guideline: Phaser.GameObjects.Graphics,
        targetX: number,
        startY: number,
        totalHeight: number,
        dotHeight: number,
        gap: number
    ): void {
        let y = startY;
        while (y < startY + totalHeight) {
            guideline.beginPath();
            guideline.moveTo(targetX, y);
            guideline.lineTo(targetX, y + dotHeight);
            guideline.strokePath();
            y += dotHeight + gap;
        }
    }

    static _preload(scene: BaseScene): void {
        const language = i18n.getLanguage() || 'en';
        scene.load.setPath(Config.ASSETS.PATH);
        Object.values(Config.ASSETS.KEYS).forEach((key) => {
            scene.load.image(key, `${key}.png`);
        });

        scene.load.setPath('assets/components/button/images/purple');
        scene.load.image('half_button_default', 'half_button_default.png');
        scene.load.image('half_button_hover', 'half_button_hover.png');
        scene.load.image('half_button_pressed', 'half_button_pressed.png');

        const gameConfigManager = GameConfigManager.getInstance();
        const searchParams = gameConfigManager.getAll();
        // const searchParams = new URLSearchParams(window.location.search);
        const gameParams = extractGameParams(searchParams);
        const topic = gameParams?.topic;

        // topics with level specific tutorial audios
        // const levelSpecificTopics = [
        //     {
        //         topicName: 'add_and_subtract_within_100',
        //         type: 'addition'
        //     }, 
        //     {
        //         topicName: 'subtract_within_1000',
        //         type: 'subtraction'
        //     },
        //     {
        //         topicName: 'place_value_magnitude',
        //         type: 'addition'
        //     }
        // ];

        // if (levelSpecificTopics.some(t => t.topicName === topic)) {
        //     const topicType = levelSpecificTopics.find(t => t.topicName === topic)?.type;
        //     const levels = topics.find(t => t.name === topic)?.levels;
        //     if (levels) {
        //         if (topicType === 'addition') {
        //             if (topic === 'place_value_magnitude') {
        //                 scene.load.setPath(`assets/audios/info_screen/addition/place_value_magnitude`);
        //                 scene.load.audio('step_2_place_value_magnitude_level_5', `step_2_en.mp3`);
        //                 scene.load.audio('step_3_place_value_magnitude_level_5', `step_3_en.mp3`);
        //                 scene.load.audio('step_4_place_value_magnitude_level_5', `step_4_en.mp3`);
        //             } else {
        //             for (let i = 1; i <= levels.length; i++) {
        //                 scene.load.setPath(`assets/audios/info_screen/addition/${topic}/level_${i}`);
        //                 scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
        //                 scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
        //                 scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
        //                 };
        //             }
        //         } else if (topicType === 'subtraction') {
        //             for (let i = 1; i <= levels.length; i++) {
        //                 scene.load.setPath(`assets/audios/info_screen/subtraction/${topic}/level_${i}`);
        //                 scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
        //                 scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
        //                 scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
        //             };
        //         }
        //     }
        // }

        const levels = topics.find(t => t.name === topic)?.levels;
        if (topic === 'add_and_subtract_within_100') {
            scene.load.setPath(`assets/audios/info_screen/addition`);
            scene.load.audio(`step_1_addition`, `step_1_addition_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                };
            }
        } else if (topic === 'subtract_within_1000') {
            if (levels) {
                scene.load.setPath(`assets/audios/info_screen/addition`);
                scene.load.audio(`step_1_addition`, `step_1_addition_${language}.mp3`);
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                };
            }
        } else if (topic === 'fractions_as_numbers') {
            scene.load.setPath(`assets/audios/info_screen/fractions_as_numbers`);
            scene.load.audio(`step_1_fraction`, `step_1_fraction_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                    scene.load.audio(`step_5_${topic}_level_${i}`, `step_5_${language}.mp3`);
                };
            }
        } else if (topic === 'explore_numbers_to_1000') {
            scene.load.setPath(`assets/audios/info_screen/placing_numbers`);
            scene.load.audio('placing_step_1', `placing_step_1_${language}.mp3`);
            scene.load.audio('placing_step_3', `placing_step_3_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    if(i === 3) continue;
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                };
            }
        } else if (topic === 'addition_and_subtraction_of_fractions_mixed_numbers') {
            scene.load.setPath(`assets/audios/info_screen/fractions_as_numbers`);
            scene.load.audio(`step_1_fraction`, `step_1_fraction_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                    scene.load.audio(`step_5_${topic}_level_${i}`, `step_5_${language}.mp3`);
                };
            }
        } else if (topic === 'understand_and_compare_decimals') {
            scene.load.setPath(`assets/audios/info_screen/fractions_as_numbers`);
            scene.load.audio(`step_1_fraction`, `step_1_fraction_${language}.mp3`);
            scene.load.setPath(`assets/audios/info_screen/addition`);
            scene.load.audio(`step_1_addition`, `step_1_addition_${language}.mp3`);
            scene.load.setPath(`assets/audios/info_screen/compare_decimals`);
            scene.load.audio(`step_1_decimals`, `step_1_decimals_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                };
            }
        } else if (topic === 'add_and_subtract_fractions') {
            scene.load.setPath(`assets/audios/info_screen/fractions_as_numbers`);
            scene.load.audio(`step_1_fraction`, `step_1_fraction_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                    scene.load.audio(`step_5_${topic}_level_${i}`, `step_5_${language}.mp3`);

                    if (i === 1) {
                        scene.load.audio(`step_1_${topic}_level_${i}`, `step_1_${language}.mp3`);
                    }
                }
            }
        } else if (topic === 'rational_numbers') {
            scene.load.setPath(`assets/audios/info_screen/addition`);
            scene.load.audio(`step_1_addition`, `step_1_addition_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                    if (i!== 3) scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`); // level 1, 2, 4
                    if (i === 4) {
                        scene.load.audio(`step_5_${topic}_level_${i}`, `step_5_${language}.mp3`);
                        scene.load.audio(`step_6_${topic}_level_${i}`, `step_6_${language}.mp3`);
                    }
                };
            }
        } else if (topic === 'multiply_fractions') {
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}_${language}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_3_${topic}_level_${i}_${language}`, `step_3_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}_${language}`, `step_4_${language}.mp3`);
                    scene.load.audio(`step_5_${topic}_level_${i}_${language}`, `step_5_${language}.mp3`);
                };
            }
        } else if (topic === 'add_and_subtract_decimals') {
            if (levels) {
                scene.load.setPath(`assets/audios/info_screen/addition`);
                scene.load.audio(`step_1_addition`, `step_1_addition_${language}.mp3`);

                // Load placing numbers audio for level 1
                scene.load.setPath(`assets/audios/info_screen/placing_numbers`);
                scene.load.audio(`placing_step_1`, `placing_step_1_${language}.mp3`);
                scene.load.audio(`placing_step_3`, `placing_step_3_${language}.mp3`);

                for (let i = 1; i <= levels.length; i++) {
                    if (i !== 1) {
                        scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                        scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                        scene.load.audio(`step_3_${topic}_level_${i}`, `step_3_${language}.mp3`);
                        scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                    }
                    else {
                        scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                        scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                        scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                    }
                };
            }
        } else if (topic === 'percents') {
            scene.load.setPath(`assets/audios/info_screen/placing_numbers`);
            scene.load.audio('placing_step_1', `placing_step_1_${language}.mp3`);
            scene.load.audio('placing_step_3', `placing_step_3_${language}.mp3`);
            if (levels) {
                for (let i = 1; i <= levels.length; i++) {
                    if(i === 1) continue;
                    scene.load.setPath(`assets/audios/info_screen/topics/${topic}/level_${i}`);
                    scene.load.audio(`step_2_${topic}_level_${i}`, `step_2_${language}.mp3`);
                    scene.load.audio(`step_4_${topic}_level_${i}`, `step_4_${language}.mp3`);
                };
            }
        }

        scene.load.setPath('assets/audios/info_screen');
        scene.load.audio('step_1', `step_1_${language}.mp3`);
        scene.load.audio('step_2', `step_2_${language}.mp3`);
        scene.load.audio('step_last', `step_3_${language}.mp3`);

        scene.load.setPath('assets/audios/info_screen/fractions_as_numbers');
        scene.load.audio('fractions_step_1', `step_1_${language}.mp3`);
        // scene.load.audio('fractions_step_2', `step_2_${language}.mp3`);
        // scene.load.audio('fractions_step_3', `step_3_${language}.mp3`);
        // scene.load.audio('fractions_step_4', `step_4_${language}.mp3`);
        // scene.load.audio('fractions_step_5', `step_5_${language}.mp3`);

        scene.load.setPath('assets/audios/info_screen/fraction_addition');
        scene.load.audio('step_2_fraction_add', `step_2_fraction_add_${language}.mp3`);
        scene.load.audio('step_3_fraction_add', `step_3_fraction_add_${language}.mp3`);
        scene.load.audio('step_4_fraction_add', `step_4_fraction_add_${language}.mp3`);
        scene.load.audio('step_5_fraction_add', `step_5_fraction_add_${language}.mp3`);

        scene.load.setPath('assets/audios/info_screen/addition');
        scene.load.audio('step_2_add_numbers', `step_2_add_numbers_${language}.mp3`);
        scene.load.audio('step_3_add_numbers', `step_3_add_numbers_${language}.mp3`);
        scene.load.audio('step_4_add_numbers', `step_4_add_numbers_${language}.mp3`);
        scene.load.audio('step_2_add_decimals', `step_2_add_decimals_${language}.mp3`);
        scene.load.audio('step_3_add_decimals', `step_3_add_decimals_${language}.mp3`);
        scene.load.audio('step_4_add_decimals', `step_4_add_decimals_${language}.mp3`);

        scene.load.setPath('assets/audios/info_screen/subtraction');
        scene.load.audio('step_2_subtract_numbers', `step_2_subtract_numbers_${language}.mp3`);
        scene.load.audio('step_3_subtract_numbers', `step_3_subtract_numbers_${language}.mp3`);
        scene.load.audio('step_4_subtract_numbers', `step_4_subtract_numbers_${language}.mp3`);

        scene.load.setPath('assets/audios/info_screen/compare_decimals');
        scene.load.audio('step_2_compare_decimals', `step_2_compare_decimals_${language}.mp3`);
        scene.load.audio('step_3_compare_decimals', `step_3_compare_decimals_${language}.mp3`);

        scene.load.setPath('assets/audios/info_screen/typing');
        scene.load.audio('step_1_typing', `step_1_typing_${language}.mp3`);
        scene.load.audio('step_2_1_typing', `step_2_1_typing_${language}.mp3`);
        scene.load.audio('step_2_2_typing', `step_2_2_typing_${language}.mp3`);
        scene.load.audio('step_2_3_typing', `step_2_3_typing_${language}.mp3`);
        scene.load.audio('step_3_1_typing', `step_3_1_typing_${language}.mp3`);
        scene.load.audio('step_3_2_typing', `step_3_2_typing_${language}.mp3`);
        scene.load.audio('step_3_3_typing', `step_3_3_typing_${language}.mp3`);
        scene.load.audio('step_4_typing', `step_4_typing_${language}.mp3`);
        scene.load.audio('step_2_explore_typing', `step_2_explore_typing_${language}.mp3`);
        scene.load.audio('step_3_explore_typing', `step_3_explore_typing_${language}.mp3`);
        scene.load.audio('step_4_explore_typing', `step_4_explore_typing_${language}.mp3`);
        scene.load.audio('step_fire', `step_fire_${language}.mp3`);

        CountdownUtils._preload(scene);
    }
}
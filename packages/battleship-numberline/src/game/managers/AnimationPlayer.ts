import { BaseScene } from '../scenes/BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { CommonConfig } from '../config/CommonConfig';
import { i18n, TextOverlay, announceToScreenReader } from '@k8-games/sdk';

export class AnimationPlayer {
    private scene: BaseScene;
    private topWoodImage: Phaser.GameObjects.Image;
    private waterAnimations: Phaser.GameObjects.Sprite[] = [];
    private atlasConstants: typeof GameConfig.ASSETS.KEYS.ATLAS;

    constructor(scene: BaseScene, topWoodImage: Phaser.GameObjects.Image) {
        this.scene = scene;
        this.topWoodImage = topWoodImage;
        this.atlasConstants = GameConfig.ASSETS.KEYS.ATLAS;
    }

    playWaterBubbleAnimations(): void {
        GameConfig.WATER_BUBBLE_ANIMATION.POSITIONS.forEach((pos) => {
            const waterSprite = this.scene
                .addSprite(
                    this.scene.display.width * pos.X_RATIO,
                    this.scene.display.height * pos.Y_RATIO,
                    this.atlasConstants.WATER_BUBBLE,
                )
                .setScale(GameConfig.WATER_BUBBLE_ANIMATION.SCALE);

            waterSprite.play(`${this.atlasConstants.WATER_BUBBLE}_animation`);
            waterSprite.anims.setProgress(Math.random());

            this.waterAnimations.push(waterSprite);
        });
    }

    playWaterAnimations(): void {
        GameConfig.WATER_ANIMATION.forEach((pos) => {
            const waterImg = this.scene
                .addImage(
                    pos.x,
                    pos.y,
                    'bg_water',
                )
                .setScale(pos.scale)
                .setOrigin(0)
                .setAlpha(0);

            const duration = Phaser.Math.Between(4000, 6000);
            this.scene.tweens.add({
                targets: waterImg,
                x: "+=" + this.scene.getScaledValue(100),
                duration: duration,
                ease: 'Power2.easeInOut',
                repeat: -1,
                onRepeat: () => {
                    waterImg.setX(pos.x);
                },
                onUpdate: (tween) => {
                    const elapsed = tween.elapsed;
                    const progress = (elapsed % duration) / duration;
                    if (progress <= 0.5) {
                        waterImg.setAlpha(progress);
                    } else {
                        waterImg.setAlpha(1 - progress);
                    }
                }
            });
        })
    }

    playSharkLoopAnimation(x: number, duration: number = 0, result?: 'nearMiss' | 'miss' | 'hit', y?: number): Promise<Phaser.GameObjects.Sprite> {
        const shark = this.scene.add
            .sprite(
                x,
                y ?? this.scene.sys.game.canvas.height * GameConfig.SHARK_ANIMATION.POSITION.Y_RATIO,
                this.atlasConstants.SHARK_LOOP,
            )
            .setOrigin(0.495, 0.49)
            .setScale(GameConfig.SHARK_ANIMATION.SCALE);

        shark.play(`${this.atlasConstants.SHARK_LOOP}_animation`);

        if (result === 'nearMiss') {
            // Create a more dynamic shake effect
            this.scene.tweens.add({
                targets: shark,
                x: x + 15,
                duration: 500,
                yoyo: true,
                repeat: 2,
                ease: 'Sine.easeInOut'
            });
        }

        return new Promise((resolve) => {
            if (duration > 0) {
                this.scene.time.delayedCall(duration, () => {
                    shark.destroy();
                    resolve({} as Phaser.GameObjects.Sprite);
                });
            } else {
                resolve(shark);
            }
        });
    }

    playScreenClickAnimation(): void {
        const screenClicking = this.scene
            .addSprite(
                this.scene.display.width / 2,
                this.scene.display.height / 2 + 25,
                this.atlasConstants.SCREEN_CLICK_MODE,
            )
            .setName('screen_clicking')
            .setDepth(3)
            .on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                screenClicking.destroy();
            })
            .play(`${this.atlasConstants.SCREEN_CLICK_MODE}_animation`);
    }

    playShootStartAnimation(x: number, autoPlayEnd: boolean = true): Promise<void> {
        return new Promise((resolve) => {
            const sfx = this.scene.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.BOMB_DROP);
            if (sfx) sfx.setVolume(0.7 * this.scene.audioManager.getSfxVolume());

            const shotStart = this.scene.add
                .sprite(
                    x,
                    this.topWoodImage.getBounds().bottom + 320 * this.scene.display.scale,
                    this.atlasConstants.SHOOT_START,
                )
                .setName('shoot_start')
                // .setDepth(1000)
                .setBelow(this.topWoodImage)
                .setScale(this.scene.display.scale)
                .play(`${this.atlasConstants.SHOOT_START}_animation`);

            shotStart
                .on('animationupdate', (_: unknown, { index }: { index: number }) => {
                    if (index === 12) {
                        return resolve();
                    }
                })
                .on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                    autoPlayEnd && void this.playShootEndAnimation(x);
                    shotStart.destroy();
                });
        });
    }

    playShootEndAnimation(x: number): Promise<void> {
        return new Promise((resolve) => {
            const shotEnd = this.scene.add
                .sprite(
                    x,
                    this.topWoodImage.getBounds().bottom + 300 * this.scene.display.scale,
                    this.atlasConstants.SHOOT_END,
                )
                .setName('shoot_end')
                .setOrigin(0.5, 0.58)
                .setBelow(this.topWoodImage)
                .setScale(this.scene.display.scale)
                .play(`${this.atlasConstants.SHOOT_END}_animation`);

            shotEnd.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                shotEnd.destroy();
                resolve();
            });
        });
    }

    playSharkEnterExitAnimation(x: number, isExit?: boolean, isVisible: boolean = true, isShake: boolean = false): Promise<void> {
        return new Promise((resolve) => {
            
            const sharkEnterExit = this.scene.add
                .sprite(
                    x,
                    this.scene.sys.game.canvas.height * GameConfig.SHARK_ENTER_ANIMATION.POSITION.Y_RATIO,
                    this.atlasConstants.SHARK_ENTER,
                )
                .setName('shark_enter_exit')
                .setOrigin(0.495, 0.49)
                .setScale(GameConfig.SHARK_ENTER_ANIMATION.SCALE)
                .setVisible(isVisible);
            if (isExit && isShake) {
                this.scene.tweens.add({
                    targets: sharkEnterExit,
                    x: x + 15,
                    angle: 50,
                    duration: 500,
                    ease: 'Sine.easeInOut',
                });
            }
            isExit
                ? sharkEnterExit.playReverse(`${this.atlasConstants.SHARK_ENTER}_animation`)
                : sharkEnterExit.play(`${this.atlasConstants.SHARK_ENTER}_animation`);

            sharkEnterExit.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                isExit
                    ? sharkEnterExit.destroy()
                    : this.scene.time.delayedCall(100, () => {
                          sharkEnterExit.destroy();
                      });
                resolve();
            });
        });
    }

    playBlastAnimation(x: number): Promise<void> {
        const targetY = this.scene.sys.game.canvas.height * GameConfig.GAME_LOGIC.REVEL_Y_RATIO;
        return new Promise((resolve) => {
            const sfx = this.scene.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.BOMB_BLAST);
            if (sfx) sfx.setVolume(0.7 * this.scene.audioManager.getSfxVolume());
            const hitText = this.scene.addText(
                x/ this.scene.display.scale,
                targetY/2 + 50,
                i18n.t('gameScreen.hit'),
                {
                    font: '900 38px Exo',
                    color: '#' + CommonConfig.STREAK_COLORS.DEFAULT.toString(16).padStart(6, '0'),
                    stroke: '#000000',
                    strokeThickness: 8,
                }
            )
            .setAlpha(0)
            .setOrigin(0.5);

            this.scene.tweens.add({
                targets: hitText,
                y: targetY/2,
                alpha: 1,
                duration: 500,
                ease: 'Bounce.easeOut'
            });

            const blast = this.scene.add
                .sprite(
                    x,
                    targetY,
                    this.atlasConstants.BLAST,
                )
                .setOrigin(0.5, 0.58)
                .setScale(GameConfig.BLAST_ANIMATION.SCALE);

            blast.play(`${this.atlasConstants.BLAST}_animation`);
            blast.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.scene.tweens.add({
                    targets: hitText,
                    y: targetY/2 - 50,
                    alpha: 0,
                    duration: 300,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        hitText.destroy();
                        blast.destroy();
                        resolve();
                    }
                });
            });
        });
    }

    playMissAnimation(x: number): Promise<void> {
        const targetY = this.scene.sys.game.canvas.height * GameConfig.GAME_LOGIC.REVEL_Y_RATIO;
        return new Promise((resolve) => {
            const sfx = this.scene.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.BOMB_SUBMERGE);
            if (sfx) sfx.setVolume(0.7 * this.scene.audioManager.getSfxVolume());

            const missText = this.scene.addText(
                x/ this.scene.display.scale,
                targetY/2 + 50,
                i18n.t('gameScreen.miss'), 
                {
                    font: '900 38px Exo',
                    color: '#' + CommonConfig.STREAK_COLORS.DEFAULT.toString(16).padStart(6, '0'),
                    stroke: '#000000',
                    strokeThickness: 8,
                }
            )
            .setAlpha(0)
            .setOrigin(0.5);

            this.scene.tweens.add({
                targets: missText,
                y: targetY/2,
                alpha: 1,
                duration: 500,
                ease: 'Bounce.easeOut'
            });

            const miss = this.scene.add
                .sprite(
                    x,
                    targetY,
                    this.atlasConstants.MISS,
                )
                .setOrigin(0.62, 0.59)
                .setScale(GameConfig.MISS_ANIMATION.SCALE)
                .on(Phaser.Animations.Events.ANIMATION_UPDATE, (_: unknown, { index }: { index: number }) => {
                    if (index === 21) {
                        const sfx = this.scene.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.BOMB_MISS);
                        if (sfx) sfx.setVolume(0.7 * this.scene.audioManager.getSfxVolume());
                    }
                });

            miss.play(`${this.atlasConstants.MISS}_animation`);
            miss.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.scene.tweens.add({
                    targets: missText,
                    y: targetY/2 - 50,
                    alpha: 0,
                    duration: 300,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        missText.destroy();
                        miss.destroy();
                        resolve();
                    }
                });
            });
        });
    }

    playNearMissAnimation(x: number): Promise<void> {
        const targetY = this.scene.sys.game.canvas.height * GameConfig.GAME_LOGIC.REVEL_Y_RATIO;
        return new Promise((resolve) => {
            const sfx = this.scene.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.BOMB_SUBMERGE);
            if (sfx) sfx.setVolume(0.7 * this.scene.audioManager.getSfxVolume());

            const nearMissText = this.scene.addText(
                x/ this.scene.display.scale,
                targetY/2 + 50,
                i18n.t('gameScreen.nearMiss'), 
                {
                    font: '900 38px Exo',
                    color: '#' + CommonConfig.STREAK_COLORS.DEFAULT.toString(16).padStart(6, '0'),
                    stroke: '#000000',
                    strokeThickness: 8,
                }
            )
            .setAlpha(0)
            .setOrigin(0.5);

            this.scene.tweens.add({
                targets: nearMissText,
                y: targetY/2,
                alpha: 1,
                duration: 500,
                ease: 'Bounce.easeOut'
            });

            const nearMiss = this.scene.add
                .sprite(
                    x,
                    targetY,
                    this.atlasConstants.NEAR_MISS,
                )
                .setOrigin(0.62, 0.59)
                .setScale(GameConfig.NEAR_MISS_ANIMATION.SCALE)
                .on(Phaser.Animations.Events.ANIMATION_UPDATE, (_: unknown, { index }: { index: number }) => {
                    if (index === 21) {
                        const sfx = this.scene.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.BOMB_MISS);
                        if (sfx) sfx.setVolume(0.7 * this.scene.audioManager.getSfxVolume());
                    }
                });

            nearMiss.play(`${this.atlasConstants.NEAR_MISS}_animation`);
            nearMiss.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.scene.tweens.add({
                    targets: nearMissText,
                    y: targetY/2 - 50,
                    alpha: 0,
                    duration: 300,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        nearMissText.destroy();
                        nearMiss.destroy();
                        resolve();
                    }
                });
            });
        });
    }

    async addToastMessage({
        message,
        duration = 1000,
        textStyle,
    }: {
        message: string;
        duration?: number;
        textStyle?: Phaser.Types.GameObjects.Text.TextStyle & { letterSpacing?: number };
    }): Promise<void> {
        return new Promise<void>((resolve) => {
            const toast = this.scene
                .addText(this.scene.display.width / 2, this.scene.display.height / 2, message, {
                    fontSize: '32px',
                    color: '#292826',
                    backgroundColor: '#CD9810',
                    padding: {
                        x: 16,
                        y: 12,
                    },
                    ...textStyle,
                })
                .setScale(0)
                .setOrigin(0.5)
                .setDepth(200);

            // new TextOverlay(this.scene, toast, { label: message, announce: true});
            new TextOverlay(this.scene, toast, { label: message, announce: true });

            textStyle?.letterSpacing && toast.setLetterSpacing(textStyle.letterSpacing);
            this.scene.tweens.add({
                targets: toast,
                scale: 1 * this.scene.display.scale,
                duration: 700,
                ease: Phaser.Math.Easing.Back.Out,
            });

            this.scene.tweens.add({
                targets: toast,
                scale: 0 * this.scene.display.scale,
                duration: 200,
                ease: Phaser.Math.Easing.Linear,
                delay: duration,
                onComplete: () => {
                    toast.destroy();
                    resolve();
                },
            });
        });
    }

    async playResultAnimations(
        result: 'hit' | 'nearMiss' | 'miss',
        x: number,
        targetX: number,
        isSharkInScene?: boolean,
    ): Promise<void> {
        if (!isSharkInScene) {
            if (result !== 'hit') {
                void (async () => {
                    await this.playSharkEnterExitAnimation(targetX, false, true, true);
                    await this.playSharkLoopAnimation(targetX, 1000, result);
                    void this.playSharkEnterExitAnimation(targetX, true, true, true);
                })();
            } else {
                void this.playSharkEnterExitAnimation(targetX);
            }
        }

        // announceToScreenReader(result === 'hit' ? 'Hit!' : result === 'nearMiss' ? 'Near Miss!' : 'Miss!');
        announceToScreenReader(i18n.t(`gameScreen.${result}`));

        await this.playShootStartAnimation(x);

        switch (result) {
            case 'hit':
                await this.playBlastAnimation(x);
                break;
            case 'nearMiss':
                await this.playNearMissAnimation(x);
                break;
            case 'miss':
                await this.playMissAnimation(x);
                break;
        }
    }

    destroyWaterAnimations(): void {
        this.waterAnimations.forEach((sprite) => sprite.destroy());
        this.waterAnimations = [];
    }
}

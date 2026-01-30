export function tweenBrightness(
    colorMatrix: Phaser.FX.ColorMatrix,
    config: {
        from: number;
        to: number;
        duration: number;
        steps?: number;
    },
) {
    const { from, to, duration, steps = 100 } = config;
    colorMatrix.brightness(from);
    colorMatrix.gameObject.scene.tweens.addCounter({
        from: 0,
        to: steps,
        duration,
        onUpdate: (tween) => {
            const step = tween.getValue();
            colorMatrix.brightness(from + ((to - from) * step) / steps);
        },
        ease: Phaser.Math.Easing.Linear,
    });
}


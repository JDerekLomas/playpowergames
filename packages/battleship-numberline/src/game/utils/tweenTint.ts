export function tweenTint(
    obj: Phaser.GameObjects.Image,
    config: {
        startColor: number;
        endColor: number;
        time: number;
    },
) {
    const { startColor: startColorNumber, endColor: endColorNumber, time } = config;
    const startColor = Phaser.Display.Color.IntegerToColor(startColorNumber);
    const endColor = Phaser.Display.Color.IntegerToColor(endColorNumber);

    obj.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: time,
        onUpdate: (tween) => {
            const step = tween.getValue();
            const currentColor = Phaser.Display.Color.Interpolate.ColorWithColor(startColor, endColor, 100, step);
            const finalColor = Phaser.Display.Color.GetColor(currentColor.r, currentColor.g, currentColor.b);
            obj.setTint(finalColor);
        },
    });
}

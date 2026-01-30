import { GameObjects, Scene, Tweens } from 'phaser';

/**
 * Collection of reusable tween animations for Phaser 3 games
 */
export class TweenAnimations {
  /**
   * Fade in a game object
   * @param scene The current scene
   * @param target The game object to animate
   * @param duration Duration in milliseconds
   * @param delay Optional delay before starting
   * @param onComplete Optional callback when complete
   * @returns The tween instance
   */
  static fadeIn(
    scene: Scene,
    target: GameObjects.GameObject,
    duration: number = 500,
    delay: number = 0,
    onComplete?: () => void
  ): Tweens.Tween {
    if ('alpha' in target) {
      const gameObject = target as GameObjects.GameObject & { alpha: number };
      gameObject.alpha = 0;
      
      return scene.tweens.add({
        targets: gameObject,
        alpha: 1,
        duration,
        delay,
        ease: 'Power1',
        onComplete: onComplete ? () => onComplete() : undefined
      });
    }
    
    throw new Error('Target object does not have alpha property');
  }

  /**
   * Fade out a game object
   * @param scene The current scene
   * @param target The game object to animate
   * @param duration Duration in milliseconds
   * @param delay Optional delay before starting
   * @param onComplete Optional callback when complete
   * @returns The tween instance
   */
  static fadeOut(
    scene: Scene,
    target: GameObjects.GameObject,
    duration: number = 500,
    delay: number = 0,
    onComplete?: () => void
  ): Tweens.Tween {
    if ('alpha' in target) {
      const gameObject = target as GameObjects.GameObject & { alpha: number };
      
      return scene.tweens.add({
        targets: gameObject,
        alpha: 0,
        duration,
        delay,
        ease: 'Power1',
        onComplete: onComplete ? () => onComplete() : undefined
      });
    }
    
    throw new Error('Target object does not have alpha property');
  }

  /**
   * Scale up a game object from a smaller size
   * @param scene The current scene
   * @param target The game object to animate
   * @param duration Duration in milliseconds
   * @param fromScale Starting scale
   * @param toScale Target scale
   * @param delay Optional delay before starting
   * @param onComplete Optional callback when complete
   * @returns The tween instance
   */
  static scaleUp(
    scene: Scene,
    target: GameObjects.GameObject,
    duration: number = 500,
    fromScale: number = 0,
    toScale: number = 1,
    delay: number = 0,
    onComplete?: () => void
  ): Tweens.Tween {
    if ('scale' in target || ('scaleX' in target && 'scaleY' in target)) {
      const gameObject = target as GameObjects.GameObject & { 
        scaleX: number;
        scaleY: number;
      };
      
      gameObject.scaleX = fromScale;
      gameObject.scaleY = fromScale;
      
      return scene.tweens.add({
        targets: gameObject,
        scaleX: toScale,
        scaleY: toScale,
        duration,
        delay,
        ease: 'Back.Out',
        onComplete: onComplete ? () => onComplete() : undefined
      });
    }
    
    throw new Error('Target object does not have scale properties');
  }

  /**
   * Pulse a game object (scale up and down repeatedly)
   * @param scene The current scene
   * @param target The game object to animate
   * @param scale Scale factor for the pulse
   * @param duration Duration of one pulse cycle
   * @param repeat Number of times to repeat (-1 for infinite)
   * @returns The tween instance
   */
  static pulse(
    scene: Scene,
    target: GameObjects.GameObject,
    scale: number = 1.2,
    duration: number = 500,
    repeat: number = -1
  ): Tweens.Tween {
    if ('scale' in target || ('scaleX' in target && 'scaleY' in target)) {
      const gameObject = target as GameObjects.GameObject & { 
        scaleX: number;
        scaleY: number;
      };
      
      const originalScaleX = gameObject.scaleX;
      const originalScaleY = gameObject.scaleY;
      
      return scene.tweens.add({
        targets: gameObject,
        scaleX: originalScaleX * scale,
        scaleY: originalScaleY * scale,
        duration: duration / 2,
        yoyo: true,
        repeat,
        ease: 'Sine.easeInOut'
      });
    }
    
    throw new Error('Target object does not have scale properties');
  }

  /**
   * Shake a game object
   * @param scene The current scene
   * @param target The game object to animate
   * @param intensity Intensity of the shake
   * @param duration Duration in milliseconds
   * @param onComplete Optional callback when complete
   * @returns The tween instance
   */
  static shake(
    scene: Scene,
    target: GameObjects.GameObject,
    intensity: number = 5,
    duration: number = 500,
    onComplete?: () => void
  ): Tweens.Tween {
    if ('x' in target && 'y' in target) {
      const gameObject = target as GameObjects.GameObject & { 
        x: number;
        y: number;
      };
      
      const originalX = gameObject.x;
      
      return scene.tweens.add({
        targets: gameObject,
        x: { 
          value: { 
            getEnd: () => originalX + Phaser.Math.Between(-intensity, intensity) 
          },
          duration: 50,
          ease: 'Power0',
          yoyo: false
        },
        repeat: Math.floor(duration / 50) - 1,
        onComplete: () => {
          gameObject.x = originalX;
          if (onComplete) onComplete();
        }
      });
    }
    
    throw new Error('Target object does not have position properties');
  }

  /**
   * Move a game object from one position to another
   * @param scene The current scene
   * @param target The game object to animate
   * @param toX Target X position
   * @param toY Target Y position
   * @param duration Duration in milliseconds
   * @param delay Optional delay before starting
   * @param easeType Type of easing to use
   * @param onComplete Optional callback when complete
   * @returns The tween instance
   */
  static moveTo(
    scene: Scene,
    target: GameObjects.GameObject,
    toX: number,
    toY: number,
    duration: number = 1000,
    delay: number = 0,
    easeType: string = 'Power2',
    onComplete?: () => void
  ): Tweens.Tween {
    if ('x' in target && 'y' in target) {
      const gameObject = target as GameObjects.GameObject & { 
        x: number;
        y: number;
      };
      
      return scene.tweens.add({
        targets: gameObject,
        x: toX,
        y: toY,
        duration,
        delay,
        ease: easeType,
        onComplete: onComplete ? () => onComplete() : undefined
      });
    }
    
    throw new Error('Target object does not have position properties');
  }

  /**
   * Float a game object up and down
   * @param scene The current scene
   * @param target The game object to animate
   * @param amount Distance to float
   * @param duration Duration of one cycle
   * @param repeat Number of repeats (-1 for infinite)
   * @returns The tween instance
   */
  static float(
    scene: Scene,
    target: GameObjects.GameObject,
    amount: number = 10,
    duration: number = 1500,
    repeat: number = -1
  ): Tweens.Tween {
    if ('y' in target) {
      const gameObject = target as GameObjects.GameObject & { y: number };
      const originalY = gameObject.y;
      
      return scene.tweens.add({
        targets: gameObject,
        y: originalY - amount,
        duration: duration / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat
      });
    }
    
    throw new Error('Target object does not have y position property');
  }

  /**
   * Rotate a game object
   * @param scene The current scene
   * @param target The game object to animate
   * @param toAngle Target angle in radians
   * @param duration Duration in milliseconds
   * @param delay Optional delay before starting
   * @param onComplete Optional callback when complete
   * @returns The tween instance
   */
  static rotateTo(
    scene: Scene,
    target: GameObjects.GameObject,
    toAngle: number,
    duration: number = 1000,
    delay: number = 0,
    onComplete?: () => void
  ): Tweens.Tween {
    if ('rotation' in target) {
      const gameObject = target as GameObjects.GameObject & { rotation: number };
      
      return scene.tweens.add({
        targets: gameObject,
        rotation: toAngle,
        duration,
        delay,
        ease: 'Sine.easeInOut',
        onComplete: onComplete ? () => onComplete() : undefined
      });
    }
    
    throw new Error('Target object does not have rotation property');
  }

  /**
   * Chain multiple tweens in sequence
   * @param scene The current scene
   * @param tweens Array of tween configurations
   * @returns The tween chain
   */
  static chain(scene: Scene, tweens: Tweens.Tween[]): Tweens.TweenChain {
    if (tweens.length === 0) {
      throw new Error('No tweens provided for chaining');
    }
    
    return scene.tweens.chain(tweens);
  }
}

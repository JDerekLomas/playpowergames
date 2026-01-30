import { BaseScene } from '@k8-games/sdk';

interface Star {
  shape: Phaser.GameObjects.Arc;
  baseVx: number;
  baseVy: number;
  baseRadius: number;
  age: number; // Time since spawn for fade-in effect
  sizeFactor: number; // Additional per-star size variance multiplier
}

/**
 * Starfield creates a pseudo-3D hyperspace style streak effect: stars spawn near the center
 * and accelerate outwards to the left or right while scaling up (giving perspective) until
 * they leave the screen and are destroyed.
 */
export class Starfield {
  private scene: BaseScene;
  private container!: Phaser.GameObjects.Container;
  private stars: Star[] = [];
  private centerX: number;
  private centerY: number;
  private width: number;
  private height: number;

  constructor(scene: BaseScene) {
    this.scene = scene;
    this.centerX = scene.cameras.main.centerX;
    this.centerY = scene.cameras.main.centerY * 0.7;
    this.width = scene.display.width;
    this.height = scene.display.height;
  }

  create() {
    this.container = this.scene.add.container(0, 0).setDepth(-1); // animation layer depth
  this.seedInitialStars();
  }

  update() {
    // Refresh dimensions in case of resize / scale changes
    const cam = this.scene.cameras.main;
    this.width = cam.worldView.width;
    this.height = cam.worldView.height;
    this.centerX = cam.worldView.centerX;
    this.centerY = cam.worldView.centerY * 0.7; // preserve original vertical bias
    // Slightly increased spawn rate for higher density
    const spawnPerFrame = 2;

    // Spawn new stars
    for (let i = 0; i < spawnPerFrame; i++) {
      this.spawnStar();
    }

    // Update existing stars with fixed slow speed
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.shape.x += s.baseVx * 0.2; // Fixed slow speed
      s.shape.y += s.baseVy * 0.2; // Fixed slow speed
      s.age += 1; // Increment age
      this.applyStarVisual(s);

      // Remove once sufficiently outside screen
      const dx = s.shape.x - this.centerX;
      const dy = s.shape.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(this.width, this.height) / 2 * 1.5;
      if (dist > maxDist + 120) {
        s.shape.destroy();
        this.stars.splice(i, 1);
      }
    }
  }

  private spawnStar(ageOverride?: number, preAdvance?: boolean) {
    // Use camera worldView to cover actual visible, scaled area
    const view = this.scene.cameras.main.worldView;
    const startX = view.x + Phaser.Math.FloatBetween(0, view.width);
    const startY = view.y + Phaser.Math.FloatBetween(0, view.height);

    // Direction is away from (centerX, centerY) so compute vector from center -> spawn
    let dirX = startX - this.centerX;
    let dirY = startY - this.centerY;
    const len = Math.hypot(dirX, dirY) || 1; // avoid div by 0 if (rare) center chosen
    dirX /= len;
    dirY /= len;

    // Speed range kept same as before; feels like stars already moving
    const baseSpeed = Phaser.Math.FloatBetween(4, 8);
    const vx = dirX * baseSpeed;
    const vy = dirY * baseSpeed;

    // Broaden base radius range slightly; final visual size mostly driven by scale * sizeFactor
    const baseRadius = Phaser.Math.FloatBetween(0.6, 1.9);
    const sizeFactor = Phaser.Math.FloatBetween(0.55, 1.6); // wider variety
    const color = 0xEFEFEF;
    const star = this.scene.add.circle(startX, startY, baseRadius, color).setDepth(-1);
    star.setAlpha(0); // Start invisible (we'll adjust if aged)
    this.container.add(star);
    const s: Star = { shape: star, baseVx: vx, baseVy: vy, baseRadius, age: 0, sizeFactor };
    if (ageOverride) {
      s.age = ageOverride;
      if (preAdvance) {
        // Move the star forward along its path proportionally so distribution isn't all near spawn
        const advanceFactor = 0.2 * ageOverride; // mirrors per-frame movement scaling
        s.shape.x += s.baseVx * advanceFactor;
        s.shape.y += s.baseVy * advanceFactor;
      }
      this.applyStarVisual(s);
    }
    this.stars.push(s);
  }

  private applyStarVisual(s: Star) {
    const dx = s.shape.x - this.centerX;
    const dy = s.shape.y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.max(this.width, this.height) / 2 * 1.5;
    const progress = Phaser.Math.Clamp(dist / maxDist, 0, 1);
    const fadeInProgress = Math.min(s.age / 60, 1);
    const targetAlpha = Phaser.Math.Clamp(1 - progress * 0.6, 0.06, 0.20);
    s.shape.setAlpha(targetAlpha * fadeInProgress);
    const scale = (0.35 + progress * 3.0) * s.sizeFactor;
    s.shape.setScale(scale);
  }

  private seedInitialStars() {
    const cam = this.scene.cameras.main;
    this.width = cam.worldView.width;
    this.height = cam.worldView.height;
    this.centerX = cam.worldView.centerX;
    this.centerY = cam.worldView.centerY * 0.7;
    const area = this.width * this.height;
    // Density heuristic: ~1 star per 8000 px^2 within clamps
    const target = Phaser.Math.Clamp(Math.round(area / 8000), 80, 220);
    for (let i = 0; i < target; i++) {
      // Age spread so some appear mid-flight and fully visible already
      const age = Phaser.Math.Between(0, 90); // >60 allows full alpha for some
      this.spawnStar(age, true);
    }
  }
}

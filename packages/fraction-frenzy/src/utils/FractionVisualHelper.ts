import { BaseScene } from "@k8-games/sdk";
import { VisualType } from "./CardHelper";

interface Fraction {
  numerator: number;
  denominator: number;
}

export class FractionVisualHelper {
  public static createVisual(
    scene: BaseScene,
    fraction: Fraction,
    representation: VisualType,
    x: number,
    y: number,
    cardKey?: string,
  ): Phaser.GameObjects.Container {
    // Create container
    const container = scene.add.container(scene.getScaledValue(x), scene.getScaledValue(y));

    // Representation logic
    switch (representation) {
      case "hundredthsGrid":
        FractionVisualHelper.createHundredthsGrid(scene, container, fraction);
        break;
      case "pizza":
        FractionVisualHelper.createPizzaVisual(scene, container, fraction);
        break;
      case "rectangle":
        FractionVisualHelper.createRectangleVisual(scene, container, fraction);
        break;
      case "circles":
        FractionVisualHelper.circles(scene, container, fraction, cardKey);
        break;
    }

    return container;
  }

  private static createHundredthsGrid(
    scene: BaseScene,
    container: Phaser.GameObjects.Container,
    fraction: Fraction
  ): void {
    const filledCells = Math.round(
      (fraction.numerator / fraction.denominator) * 100
    );
    const gridSize = 10;
    const cellSize = 24;
    const totalSize = gridSize * cellSize;

    // Create background
    const background = scene.addRectangle(
      0,
      0,
      totalSize,
      totalSize,
      0xf0f0f0
    );
    background.setStrokeStyle(scene.getScaledValue(2), 0xb1b1b1);
    container.add(background);

    // Create grid cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellIndex = row * gridSize + col;
        const filled = cellIndex < filledCells;

        const cell = scene.addRectangle(
          col * cellSize - totalSize / 2 + cellSize / 2,
          row * cellSize - totalSize / 2 + cellSize / 2,
          cellSize - 1,
          cellSize - 1,
          filled ? 0x5e7ce2 : 0xeaeaea
        );
        cell.setStrokeStyle(scene.getScaledValue(2), 0xb1b1b1);
        container.add(cell);
      }
    }
  }

  private static circles(
  scene: BaseScene,
  container: Phaser.GameObjects.Container,
  fraction: Fraction,
  cardKey?: string
): void {
  const colorGroup = [{fill: 0xB100D9, stroke: 0x000000}, {fill: 0x0030D4, stroke: 0x000000}];
  const selectedColor = cardKey === 'leftCard' ? colorGroup[0] : colorGroup[1];
  const filledCells = fraction.numerator;
  // Configuration for circles
  const circleDiameter = scene.getScaledValue(20);
  const radius = circleDiameter / 2;
  const gap = scene.getScaledValue(7);
  const maxWidth = scene.getScaledValue(270); // Maximum container width
  const circlesPerRow = Math.floor((maxWidth + gap) / (circleDiameter + gap));
  // Calculate layout dimensions
  const rows = Math.ceil(filledCells / circlesPerRow);
  const totalHeight = rows * circleDiameter + (rows - 1) * gap;

  for (let i = 0; i < filledCells; i++) {
    const row = Math.floor(i / circlesPerRow);
    const col = i % circlesPerRow;
    // const circlesInThisRow = Math.min(circlesPerRow, filledCells - row * circlesPerRow);
    // const thisRowWidth = circlesInThisRow * circleDiameter + (circlesInThisRow - 1) * gap;

    // Center each circle within its row and position rows vertically
    const x = col * (circleDiameter + gap) - maxWidth / 2 + radius;
    const y = row * (circleDiameter + gap) - totalHeight / 2 + radius;

    const circle = scene.add.circle(x, y, radius, selectedColor.fill, 1);
    circle.setStrokeStyle(2, selectedColor.stroke);
    container.add(circle);
  }
}

  private static createPizzaVisual(
    scene: BaseScene,
    container: Phaser.GameObjects.Container,
    fraction: Fraction
  ): void {
    const { numerator, denominator } = fraction;
    const radius = 110;

    // Create pizza base
    const base = scene.addCircle(0, 0, radius, 0xfff4d6);
    base.setStrokeStyle(6, 0xff9500);
    container.add(base);

    // Create pizza slices
    for (let i = 0; i < denominator; i++) {
      const isFilled = i < numerator;
      const startAngle = (i / denominator) * 2 * Math.PI;
      const endAngle = ((i + 1) / denominator) * 2 * Math.PI;

      const slice = scene.add.graphics();
      slice.fillStyle(isFilled ? 0xffb347 : 0xeaeaea, 1);
      slice.lineStyle(scene.getScaledValue(3), 0xff9500);

      slice.beginPath();
      slice.moveTo(0, 0);
      slice.lineTo(
        scene.getScaledValue(Math.cos(startAngle) * radius),
        scene.getScaledValue(Math.sin(startAngle) * radius)
      );
      slice.arc(0, 0, scene.getScaledValue(radius), startAngle, endAngle);
      slice.closePath();
      slice.fillPath();
      slice.strokePath();

      container.add(slice);
    }

    // Create center circle
    const center = scene.addCircle(0, 0, 8, 0xffe8b6);
    center.setStrokeStyle(scene.getScaledValue(3), 0xff9500);
    container.add(center);
  }

  private static createRectangleVisual(
    scene: BaseScene,
    container: Phaser.GameObjects.Container,
    fraction: Fraction
  ): void {
    const { numerator, denominator } = fraction;
    const width = 250;
    const height = 50;
    const segmentWidth = width / denominator;

    // Create background container
    const background = scene.addRectangle(0, 0, width, height, 0xf4fbf6);
    background.setStrokeStyle(scene.getScaledValue(3), 0x3aa65e);
    container.add(background);

    // Create segments
    for (let i = 0; i < denominator; i++) {
      const isFilled = i < numerator;
      const x = i * segmentWidth - width / 2 + segmentWidth / 2;

      const segment = scene.addRectangle(
        x,
        0,
        segmentWidth,
        height,
        isFilled ? 0x5fd687 : 0xeaeaea
      );
      segment.setStrokeStyle(scene.getScaledValue(3), 0x3aa65e);
      container.add(segment);
    }
  }
}

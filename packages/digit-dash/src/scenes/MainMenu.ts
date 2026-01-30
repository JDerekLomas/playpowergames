import { BaseScene, ButtonHelper, GameConfigManager, i18n, ScoreHelper, ExpressionUtils, TextOverlay, ButtonOverlay, announceToScreenReader, AnalyticsHelper } from '@k8-games/sdk';
import { MechanicsManager } from '../mechanics/Mechanic';

// Check if browser supports named capture groups in regex (not supported in Safari < 16.4)
function supportsNamedCaptureGroups(): boolean {
  try {
    new RegExp('(?<test>test)');
    return true;
  } catch {
    return false;
  }
}

const SUPPORTS_NAMED_GROUPS = supportsNamedCaptureGroups();

// Tracks completed levels (clears on reload)
const completedLevels: Set<number> = new Set();

// main menu scene
export class MainMenu extends BaseScene {
  private mechanics!: MechanicsManager;
  // Scroll / layout config for accessibility auto-scroll
  private cardsContainer?: Phaser.GameObjects.Container;
  private scrollMinY: number = 0;
  private enableScroll: boolean = false;
  private cellHeight: number = 0;
  private gapY: number = 0;
  private visibleRows: number = 2;
  private cols: number = 3;

  // set scene key
  constructor() {
    super('MainMenu');
  }

  // build menu UI
  create() {
    const { width, height } = this.display;

    this.addImage(width / 2, height / 2, 'main_menu_bg')
      .setOrigin(0.5)
      .setDepth(-1);
    const selectLevelText = this.addText(width / 2, 70, i18n.t('common.selectLevel'), {
      font: '800 42px Exo',
      color: '#ffffff',
    }).setOrigin(0.5);
    new TextOverlay(this, selectLevelText,{
      label: i18n.t('common.selectLevel'),
      tag: "h1",
      role: "heading"
    }); 
  // Announce screen purpose to screen readers
  announceToScreenReader(i18n.t('common.selectLevel'), 'polite');

    this.mechanics = new MechanicsManager();
    const count = this.mechanics.getMechanicCount();
    const completed = completedLevels;

    // Grid layout
    const cols = 3; // keep in sync with this.cols
    this.cols = cols;
    const sideMargin = Math.max(40, Math.floor(width * 0.08));
    const gapX = Math.max(20, Math.floor(width * 0.025));
  const gapY = Math.max(24, Math.floor(height * 0.035));
  this.gapY = gapY;
    const usableW = width - sideMargin * 2 - gapX * (cols - 1);
    const cellW = Math.floor(usableW / cols);
    const cellH = Math.floor(cellW * 0.72); // book is wider than tall
    this.cellHeight = cellH;
    const topY = 140; // below the title

    const itemsYStart = topY + Math.floor(cellH / 2);

    // Scrollable container setup (if more than 6 books)
    const maxVisibleItems = 6;
  const enableScroll = count > maxVisibleItems;
  this.enableScroll = enableScroll;
    const visibleRows = 2; // corresponds to 6 items at 3 columns
    this.visibleRows = visibleRows;
    const contentRows = Math.ceil(count / cols);
    const contentHeight = contentRows * (cellH + gapY) - gapY;
    const visibleHeight = visibleRows * (cellH + gapY) - gapY;
    // Container origin at (0,0); cards will use scaled coordinates like original layout
    const cardsContainer = this.add.container(0, 0);
    this.cardsContainer = cardsContainer;
    let minScrollY = 0;
    // Mask + scrolling only if needed
    const maskX = sideMargin;
    const maskY = itemsYStart - cellH / 2;
    if (enableScroll) {
      // Padding around mask so hover offsets & right/bottom edges not cropped
      const padTop = 34;
      const padBottom = 58; // more bottom slack
      const padLeft = 12;
      const padRight = 40; // extra right slack for hover shift
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.01); // transparent interactive area
      g.fillRect(
        this.getScaledValue(maskX - padLeft),
        this.getScaledValue(maskY - padTop),
        this.getScaledValue(usableW + padLeft + padRight),
        this.getScaledValue(visibleHeight + padTop + padBottom),
      );
      const mask = g.createGeometryMask();
      cardsContainer.setMask(mask);
      // Scroll limits (container moves negative to reveal lower rows)
      const visibleBottom = this.getScaledValue(maskY + visibleHeight + padBottom);
      const contentBottom = this.getScaledValue(itemsYStart - cellH / 2 + contentHeight);
      minScrollY = Math.min(0, visibleBottom - contentBottom);
      // Give a little extra overscroll so bottom row isn't flush with edge
      const bottomExtra = this.getScaledValue(32);
  minScrollY = Math.min(0, minScrollY - bottomExtra);
  this.scrollMinY = minScrollY;
      // Drag scrolling zone (same padded region, scaled)
      const scrollZone = this.add
        .zone(
          this.getScaledValue(maskX + usableW / 2),
          this.getScaledValue(maskY + (visibleHeight + padBottom - padTop) / 2),
          this.getScaledValue(usableW + padLeft + padRight),
          this.getScaledValue(visibleHeight + padTop + padBottom),
        )
        .setOrigin(0.5)
        .setInteractive();
      // Put scroll zone behind cards so card zones receive pointer events first
      scrollZone.setDepth(-10);
      let dragging = false;
      let startY = 0;
      let startContainerY = 0;
      let userInteracted = false; // cancels hint animation if user acts
      scrollZone.on('pointerdown', (p: any) => {
        userInteracted = true;
        dragging = true;
        startY = p.y;
        startContainerY = cardsContainer.y;
      });
      this.input.on('pointerup', () => {
        dragging = false;
      });
      this.input.on('pointermove', (p: any) => {
        if (!dragging) return;
        userInteracted = true;
        const dy = p.y - startY;
        cardsContainer.y = Phaser.Math.Clamp(startContainerY + dy, minScrollY, 0);
      });
      // Wheel scrolling
      this.input.on('wheel', (pointer: any, _objs: any, _dx: number, deltaY: number) => {
        const left = this.getScaledValue(maskX - padLeft);
        const right = this.getScaledValue(maskX + usableW + padRight);
        const top = this.getScaledValue(maskY - padTop);
        const bottom = this.getScaledValue(maskY + visibleHeight + padBottom);
        if (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom) {
          userInteracted = true;
          cardsContainer.y = Phaser.Math.Clamp(cardsContainer.y - deltaY * 0.4, minScrollY, 0);
        }
      });

      // Initial scroll hint: brief automatic scroll down then back up to indicate more content.
      this.time.delayedCall(650, () => {
        if (userInteracted) return; // user already scrolled
        const travel = Math.min(Math.abs(minScrollY) * 0.3, this.getScaledValue(180));
        const targetY = Phaser.Math.Clamp(-travel, minScrollY, 0);
        if (targetY === 0) return; // nothing to show
        const tween = this.tweens.add({
          targets: cardsContainer,
          y: targetY,
          duration: 520,
          ease: 'Quad.InOut',
          yoyo: true,
          hold: 300,
          onUpdate: () => {
            if (userInteracted) {
              tween.stop();
              cardsContainer.y = Phaser.Math.Clamp(cardsContainer.y, minScrollY, 0);
            }
          },
          onYoyo: () => {
            if (userInteracted) {
              tween.stop();
              cardsContainer.y = Phaser.Math.Clamp(cardsContainer.y, minScrollY, 0);
            }
          },
          onComplete: () => {
            /* ensure ends at 0 (top) unless user moved */ if (!userInteracted) cardsContainer.y = 0;
          },
        });
      });
    }

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = sideMargin + col * (cellW + gapX) + cellW / 2;
      const y = itemsYStart + row * (cellH + gapY);
      const m = this.mechanics.getMechanic(i);
      const label = m?.label || `Level ${i + 1}`;
      // Place card at scaled coordinates inside scrolling container (restores original spacing)
      const card = this.add.container(this.getScaledValue(x), this.getScaledValue(y));
      const isComplete = completed.has(i + 1);
      const spriteKey = isComplete ? 'book_check' : 'book';
      const book = this.addImage(0, 0, spriteKey).setOrigin(0.5);
      const baseScale = cellW / Math.max(book.width, book.height);
      const scaleBoost = 1.08;
      book.setScale(baseScale * scaleBoost);
      card.add(book);
      const defaultColor = '#C47E44';
      const selectedColor = '#FFFFFF';
      const color = isComplete ? selectedColor : defaultColor;
      const findPrefix = i18n.t('game.findPrefix') || 'Find';
      const core = label.replace(new RegExp('^' + findPrefix + '\\s+', 'i'), '').trim();
      const wordCount = core.split(/\s+/).filter(Boolean).length;
      const line1 = this.addText(0, 10, findPrefix, { font: '800 26px Exo', color }).setOrigin(0.5);
      const wrapWidth = Math.max(80, book.displayWidth * 0.8);
      let line2: Phaser.GameObjects.Text | Phaser.GameObjects.Container;
      const fractionPattern = /\d+\/\d+/;
      // Use ExpressionUtils only if browser supports named capture groups (Safari 16.4+)
      // Otherwise fall back to simple text rendering to avoid regex errors on older iPads
      if (fractionPattern.test(label) && SUPPORTS_NAMED_GROUPS) {
        const colorNum = parseInt(color.replace('#', '0x'), 16);
        const expr = new ExpressionUtils(this, 0, 0, label, {
          font: '800 21px Exo',
          fontColor: colorNum,
          spacing: 10,
          fractionLinePadding: 18,
          alignment: 'center',
        });
        line2 = expr.getContainer().setName('line2');
        (line2 as any).dd_expression = expr; // marker for hover recolor
        const maxLineWidth = book.displayWidth * 0.78;
        const bounds = (line2 as any).getBounds();
        if (bounds.width > maxLineWidth) {
          const scaleFactor = maxLineWidth / bounds.width;
          line2.setScale(scaleFactor);
        }
        card.add(line2);
      } else {
        const line2Style: any =
          wordCount > 2
            ? { font: '700 26px Exo', color, wordWrap: { width: wrapWidth } }
            : { font: '800 26px Exo', color };
        line2 = this.addText(0, 0, label, line2Style).setOrigin(0.5);
        card.add(line2);
      }
      card.add(line1);
      const positionText = () => {
        const bx = book.x;
        const by = book.y;
        const h = book.displayHeight;
        line1.x = bx;
        line2.x = bx;
        line1.y = by - h * 0.07;
        line2.y = by + h * 0.07;
      };
      positionText();
  const zone = this.add
        .zone(0, 0, book.displayWidth, book.displayHeight)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      card.add(zone);
  // Provide explicit size to the container so accessibility overlay can align correctly
  card.setSize(book.displayWidth, book.displayHeight);
      const applyState = (hovered: boolean) => {
        if (hovered) book.setTexture('book_selected');
        else if (isComplete) book.setTexture('book_check');
        else book.setTexture('book');
        book.setX(6);
        book.setY(-22);
        positionText();
        const colC = hovered || isComplete ? selectedColor : defaultColor;
        (line1 as any).setColor(colC);
        if (line2 instanceof Phaser.GameObjects.Text) {
          (line2 as any).setColor(colC);
        } else {
          if ((line2 as any).dd_expression) {
            // Traverse children to recolor texts & fraction lines
            const colNum = parseInt(colC.replace('#', '0x'), 16);
            const recolor = (obj: any) => {
              if (obj instanceof Phaser.GameObjects.Text) obj.setColor(colC);
              else if (obj instanceof Phaser.GameObjects.Rectangle) obj.setFillStyle(colNum);
              else if (obj.list) obj.list.forEach(recolor);
            };
            recolor(line2);
          } else {
            const textParts: Phaser.GameObjects.Text[] = (line2 as any).dd_textParts || [];
            for (const t of textParts) (t as any).setColor(colC);
            const fracC = (line2 as any).dd_fractionContainer as Phaser.GameObjects.Container | undefined;
            if (fracC) {
              const fTexts: Phaser.GameObjects.Text[] = (fracC as any).dd_fractionTexts || [];
              for (const t of fTexts) (t as any).setColor(colC);
              const vinc = (fracC as any).dd_vinculum as Phaser.GameObjects.Rectangle | undefined;
              if (vinc) {
                const hexToNum = (c: string) => parseInt(c.replace('#', '0x'), 16);
                vinc.setFillStyle(hexToNum(colC));
              }
            }
          }
        }
      };
      zone.on('pointerover', () => {
        if (!isComplete) applyState(true);
      });
      zone.on('pointerout', () => {
        if (!isComplete) applyState(false);
      });

      // Shared activation handler for mouse/keyboard
      const handleActivate = () => {
        this.audioManager.playSoundEffect('button_click');
        if ((card as any).dd_clicking) return;
        (card as any).dd_clicking = true;
        this.tweens.add({
          targets: card,
          scaleX: 0.94,
          scaleY: 0.94,
          duration: 70,
          ease: 'Quad.Out',
          yoyo: true,
          onComplete: () => {
            (card as any).dd_clicking = false;
            this.scene.start('GameScene', { level: i + 1, scoreHelper: new ScoreHelper(2) });
          },
        });
      };
      zone.on('pointerdown', handleActivate);

      // Add accessibility overlay for keyboard and screen readers
      const a11yLabel = label;
      new ButtonOverlay(this, card, {
        label: a11yLabel,
        onKeyDown: handleActivate,
        onFocus: () => {
          this.ensureCardVisible(i);
          // Show hover visuals when focused via keyboard
          applyState(true);
        },
        onBlur: () => {
          // Remove hover visuals when focus leaves (unless complete keeps its own style)
          applyState(false);
        },
        // Do not change visuals on focus/blur to avoid UI deltas
      });
      applyState(false);
      cardsContainer.add(card);
    }

    if (this.shouldShowMultiverseButton()) {
      const titleY = 70;
      const multBtn = ButtonHelper.createButton({
        scene: this,
        imageKeys: { default: 'btn_default', hover: 'btn_hover', pressed: 'btn_pressed' },
        text: i18n.t('menu.backToMultiverse'),
        label: i18n.t('menu.backToMultiverse'),
        textStyle: { font: '800 20px Exo', color: '#ffffff' },
        imageScale: 0.7,
        raisedOffset: 3.5,
        x: width - 200,
        y: titleY - 5,
        onClick: () => {
          this.audioManager.playSoundEffect('button_click');
          this.audioManager.stopAllSoundEffects();
          this.audioManager.stopBackgroundMusic();

          const analyticsHelper = AnalyticsHelper.getInstance();
          if (analyticsHelper) {
              analyticsHelper.endLevelSession();
          }

          if (completedLevels.size > 0) {
            window.parent.postMessage({ 
              type: 'GAME_COMPLETED',
              gameName: 'digit_dash'
            }, '*');
          }

          window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        },
      });
      multBtn.setDepth(1);
    }

    this.audioManager.initialize(this);
  }

  // Ensure focused card is within current visible 2-row window; scroll in full-page (6 items) increments.
  private ensureCardVisible(index: number) {
    if (!this.enableScroll || !this.cardsContainer) return;
    const rowsPerPage = this.visibleRows;
    const targetRow = Math.floor(index / this.cols);
    const targetPageTopRow = Math.floor(targetRow / rowsPerPage) * rowsPerPage; // start row of page
    // Current top row (approx) from container.y
    const perRowOffset = this.getScaledValue(this.cellHeight + this.gapY);
    const currentTopRow = Math.round(-this.cardsContainer.y / (perRowOffset === 0 ? 1 : perRowOffset));
    if (currentTopRow === targetPageTopRow) return; // already visible page
    // Compute desired y (negative)
    const newY = -this.getScaledValue(targetPageTopRow * (this.cellHeight + this.gapY));
    const clampedY = Phaser.Math.Clamp(newY, this.scrollMinY, 0);
    if (this.cardsContainer.y === clampedY) return;
    this.tweens.add({
      targets: this.cardsContainer,
      y: clampedY,
      duration: 220,
      ease: 'Quad.Out'
    });
  }
  // preload menu assets
  static _preload(scene: BaseScene) {
    scene.load.setPath('assets/images/main_menu');
    scene.load.image('main_menu_bg', 'main_menu_bg.png');
    scene.load.image('book', 'book.png');
    scene.load.image('book_selected', 'book_selected.png');
    scene.load.image('book_check', 'book_check.png');

    // Button assets
    scene.load.setPath('assets/components/button/images/blue');
    scene.load.image('btn_default', 'btn_default.png');
    scene.load.image('btn_hover', 'btn_hover.png');
    scene.load.image('btn_pressed', 'btn_pressed.png');
    scene.load.setPath('assets/components/button/audios');
    scene.load.audio('button_click', 'button_click.mp3');
  }

  // multiverse button logic
  public shouldShowMultiverseButton(): boolean {
    try {
      const gameConfigManager = GameConfigManager.getInstance();
      const topic = gameConfigManager.get('topic');
      const multiverseTopics = ['grade3_topic2', 'grade3_topic3', 'multiverse_multiplication'];
      if (topic && multiverseTopics.includes(topic)) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}

// mark level completed
export function markLevelCompleted(level: number) {
  completedLevels.add(level);
}

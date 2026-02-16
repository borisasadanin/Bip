import Phaser from 'phaser';
import { CONFIG } from '../config';

export class Hud {
  private readonly p1Text: Phaser.GameObjects.Text;
  private readonly p2Text: Phaser.GameObjects.Text;
  private readonly overlay: Phaser.GameObjects.Container;
  private readonly overlayText: Phaser.GameObjects.Text;
  private readonly overlayHint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: `${CONFIG.UI.SCORE_FONT_SIZE}px`,
      stroke: '#0b1b3a',
      strokeThickness: CONFIG.UI.TEXT_STROKE
    };

    this.p1Text = scene.add
      .text(CONFIG.UI.SCORE_MARGIN_X, CONFIG.UI.SCORE_MARGIN_Y, 'P1: 0', { ...baseStyle, color: '#FF4444' })
      .setDepth(CONFIG.DEPTH.HUD)
      .setScrollFactor(0);
    this.p2Text = scene.add
      .text(CONFIG.DESIGN_WIDTH - CONFIG.UI.SCORE_MARGIN_X, CONFIG.UI.SCORE_MARGIN_Y, 'P2: 0', { ...baseStyle, color: '#FFA500' })
      .setOrigin(1, 0)
      .setDepth(CONFIG.DEPTH.HUD)
      .setScrollFactor(0);

    this.overlayText = scene.add
      .text(CONFIG.DESIGN_WIDTH / 2, CONFIG.DESIGN_HEIGHT / 2 - CONFIG.UI.OVERLAY_OFFSET_Y, '', {
        fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
        fontSize: `${CONFIG.UI.WIN_FONT_SIZE}px`,
        color: '#ffffff',
        stroke: '#0b1b3a',
        strokeThickness: CONFIG.UI.WIN_STROKE
      })
      .setOrigin(0.5);

    this.overlayHint = scene.add
      .text(CONFIG.DESIGN_WIDTH / 2, CONFIG.DESIGN_HEIGHT / 2 + CONFIG.UI.OVERLAY_OFFSET_Y, 'Press R to Restart', {
        fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
        fontSize: `${CONFIG.UI.WIN_HINT_FONT_SIZE}px`,
        color: '#ffffff',
        stroke: '#0b1b3a',
        strokeThickness: CONFIG.UI.TEXT_STROKE
      })
      .setOrigin(0.5);

    this.overlay = scene.add.container(0, 0, [this.overlayText, this.overlayHint]);
    this.overlay.setDepth(CONFIG.DEPTH.OVERLAY);
    this.overlay.setAlpha(0);
    this.overlay.setScrollFactor(0);
  }

  setScores(p1: number, p2: number) {
    this.p1Text.setText(`P1: ${p1}`);
    this.p2Text.setText(`P2: ${p2}`);
  }

  showWinner(playerLabel: string) {
    this.overlayText.setText(`${playerLabel} Wins!`);
    this.overlay.setAlpha(0);
    this.overlay.scene.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: CONFIG.UI.OVERLAY_FADE_MS,
      ease: 'Sine.easeOut'
    });
  }
}

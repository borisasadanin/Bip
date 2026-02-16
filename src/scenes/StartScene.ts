import Phaser from 'phaser';
import { CONFIG } from '../config';

export class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    // Sky gradient background
    const gfx = this.add.graphics();
    const skyHeight = CONFIG.DESIGN_HEIGHT * CONFIG.SKY_HEIGHT_RATIO;
    gfx.fillGradientStyle(CONFIG.COLORS.SPACE, CONFIG.COLORS.SPACE, CONFIG.COLORS.SKY_TOP, CONFIG.COLORS.SKY_TOP, 1);
    gfx.fillRect(0, 0, CONFIG.DESIGN_WIDTH, skyHeight);
    gfx.fillStyle(CONFIG.COLORS.SKY_TOP, 1);
    gfx.fillRect(0, skyHeight, CONFIG.DESIGN_WIDTH, CONFIG.DESIGN_HEIGHT - skyHeight);

    const cx = CONFIG.DESIGN_WIDTH / 2;

    // Title
    this.add.text(cx, 140, 'Biplane Bash', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '72px',
      color: '#ffffff',
      stroke: '#0b1b3a',
      strokeThickness: 8
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 210, 'Pop balloons. Score for your opponent. First to 20 wins!', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '22px',
      color: '#d0e8ff',
      stroke: '#0b1b3a',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Player 1 controls
    const p1Y = 320;
    this.add.text(cx - 200, p1Y, 'Player 1', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '32px',
      color: '#FFA500',
      stroke: '#0b1b3a',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(cx - 200, p1Y + 50, '\u2191 \u2193  Arrow Keys', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#0b1b3a',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Player 2 controls
    this.add.text(cx + 200, p1Y, 'Player 2', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '32px',
      color: '#FF4444',
      stroke: '#0b1b3a',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(cx + 200, p1Y + 50, 'W  S  Keys', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#0b1b3a',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Tips
    this.add.text(cx, 460, 'Big balloons crash your plane!', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '20px',
      color: '#ffcc66',
      stroke: '#0b1b3a',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(cx, 495, 'Dive to gain speed. Climb too steep and you stall!', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '20px',
      color: '#ffcc66',
      stroke: '#0b1b3a',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Start prompt (blinking)
    const startText = this.add.text(cx, 590, 'Press SPACE to start', {
      fontFamily: '"Baloo 2", "Comic Sans MS", cursive',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#0b1b3a',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Listen for SPACE
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}

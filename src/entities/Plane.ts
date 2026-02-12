import Phaser from 'phaser';
import { CONFIG } from '../config';
import { degToRad, lerpExp, normalizeAngle, wrap } from '../utils/math';

export enum PlaneState {
  GROUNDED = 'GROUNDED',
  FLYING = 'FLYING',
  STALLED = 'STALLED',
  CRASHED = 'CRASHED'
}

export type PlaneInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export class Plane extends Phaser.Physics.Arcade.Sprite {
  public state: PlaneState = PlaneState.GROUNDED;
  public inCloud = false;
  public onCrash?: (x: number, y: number) => void;

  private readonly startX: number;
  private readonly startFacing: number;
  private readonly textureForwardAngle: number;

  private speed = 0;
  private heading = 0;
  private targetHeading = 0;
  private facing = 1;

  private stallVelocityX = 0;
  private stallVelocityY = 0;
  private takeoffGrace = 0;
  private lastVelocityX = 0;
  private lastVelocityY = 0;
  private groundRunDistance = 0;
  private boostLocked = false;

  private propeller?: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    startFacing: number,
    textureForwardAngle = 0,
    showPropeller = true
  ) {
    super(scene, x, y, textureKey);

    this.startX = x;
    this.startFacing = startFacing;
    this.textureForwardAngle = textureForwardAngle;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONFIG.DEPTH.PLANE);
    this.setOrigin(0.5, 0.5);
    const scale = (CONFIG.PLANE.HEIGHT / this.height) * 1.5;
    this.setScale(scale);
    this.body.setAllowGravity(false);
    this.applyPlaneHitbox();

    this.facing = startFacing;

    if (showPropeller) {
      this.propeller = scene.add.image(this.x, this.y, 'propeller');
      this.propeller.setDepth(CONFIG.DEPTH.PLANE + 1);
    }

    this.resetToStart();
  }

  static createTexture(scene: Phaser.Scene, key: string, bodyColor: number, stripeColor: number) {
    if (scene.textures.exists(key)) return;

    const gfx = scene.add.graphics();
    const width = CONFIG.PLANE.WIDTH;
    const height = CONFIG.PLANE.HEIGHT;

    gfx.fillStyle(bodyColor, 1);
    gfx.fillRoundedRect(8, 14, 70, 16, 8);
    gfx.fillRoundedRect(18, 4, 52, 10, 6);

    gfx.fillStyle(stripeColor, 1);
    gfx.fillRect(28, 16, 14, 12);
    gfx.fillRect(48, 16, 14, 12);

    gfx.fillStyle(bodyColor, 1);
    gfx.fillRoundedRect(20, 26, 48, 8, 4);

    gfx.fillStyle(0x3f3f3f, 1);
    gfx.fillCircle(78, 22, 6);

    gfx.fillStyle(bodyColor, 1);
    gfx.fillTriangle(8, 16, 0, 10, 0, 22);

    gfx.generateTexture(key, width, height);
    gfx.destroy();
  }

  static createPropellerTexture(scene: Phaser.Scene) {
    if (scene.textures.exists('propeller')) return;

    const gfx = scene.add.graphics();
    gfx.fillStyle(0x1b1b1b, 1);
    gfx.fillRoundedRect(0, 5, 18, 4, 2);
    gfx.generateTexture('propeller', 18, 14);
    gfx.destroy();
  }

  update(dt: number, input: PlaneInput, worldWidth: number, groundY: number) {
    if (this.state === PlaneState.CRASHED) return;

    const planeHalfHeight = CONFIG.PLANE.HEIGHT * 0.5;

    if (this.state === PlaneState.GROUNDED) {
      this.setY(groundY - planeHalfHeight + CONFIG.PLANE.GROUND_WHEEL_OFFSET);

      if (input.up) {
        this.speed = Math.min(
          this.speed + CONFIG.PLANE.GROUND_ACCEL * dt,
          CONFIG.PLANE.MAX_SPEED
        );
      } else {
        // Decelerate when not holding throttle
        this.speed = Math.max(this.speed - CONFIG.PLANE.GROUND_ACCEL * dt, 0);
      }

      if (this.speed >= CONFIG.PLANE.MAX_SPEED) {
        this.state = PlaneState.FLYING;
        this.takeoffGrace = CONFIG.PLANE.TAKEOFF_GRACE_MS / 1000;
        this.heading = CONFIG.PLANE.TAKEOFF_ANGLE;
        this.targetHeading = CONFIG.PLANE.TAKEOFF_ANGLE;
        this.groundRunDistance = 0;
        this.boostLocked = false;
      } else {
        this.targetHeading = 0;
        this.heading = lerpExp(this.heading, this.targetHeading, CONFIG.PLANE.TURN_SMOOTHING, dt);
      }

      this.body.setVelocity(this.facing * this.speed, 0);
      this.lastVelocityX = this.body.velocity.x;
      this.lastVelocityY = this.body.velocity.y;
    } else if (this.state === PlaneState.FLYING) {
      if (input.up) {
        this.targetHeading += CONFIG.PLANE.TURN_RATE * dt;
      }
      if (input.down) {
        this.targetHeading -= CONFIG.PLANE.TURN_RATE * dt;
      }

      this.heading = lerpExp(this.heading, this.targetHeading, CONFIG.PLANE.TURN_SMOOTHING, dt);

      const normalizedHeading = normalizeAngle(this.heading);
      const noseDown =
        normalizedHeading >= CONFIG.PLANE.BOOST_ANGLE_MIN &&
        normalizedHeading <= CONFIG.PLANE.BOOST_ANGLE_MAX;
      const noseUp =
        normalizedHeading >= CONFIG.PLANE.CLIMB_ANGLE_MIN &&
        normalizedHeading <= CONFIG.PLANE.CLIMB_ANGLE_MAX;
      const boostMax = CONFIG.PLANE.MAX_SPEED * CONFIG.PLANE.BOOST_MAX_RATIO;
      const climbTarget = CONFIG.PLANE.MAX_SPEED * CONFIG.PLANE.CLIMB_MIN_RATIO;

      if (!this.boostLocked && noseDown) {
        // Diving: only way to gain speed
        const targetSpeed = boostMax;
        this.speed = lerpExp(this.speed, targetSpeed, CONFIG.PLANE.BOOST_SPEED_SMOOTHING, dt);
      } else if (noseUp) {
        // Climbing: lose speed
        const targetSpeed = climbTarget;
        this.speed = lerpExp(this.speed, targetSpeed, CONFIG.PLANE.CLIMB_SPEED_SMOOTHING, dt);
      }
      // Otherwise: keep current speed (no automatic acceleration)

      if (this.speed <= CONFIG.PLANE.MAX_SPEED * 0.3) {
        this.enterStall();
      }

      const absHeading = Math.abs(this.heading);
      if (absHeading >= 70 && absHeading <= 110) {
        this.speed = Math.max(0, this.speed - CONFIG.PLANE.LOOP_DECEL * dt);
      }

      if (this.state === PlaneState.FLYING) {
        const angleDeg = this.getWorldAngle();
        const angleRad = degToRad(angleDeg);
        const vx = Math.cos(angleRad) * this.speed;
        const vy = -Math.sin(angleRad) * this.speed;

        if (this.y <= 0) {
          this.enterStall();
        }

        if (this.state === PlaneState.FLYING) {
          const lowSpeedThreshold = CONFIG.PLANE.MAX_SPEED * CONFIG.PLANE.LOW_SPEED_RATIO;
          if (this.speed < lowSpeedThreshold) {
            this.body.setVelocity(vx, Math.max(vy, CONFIG.PLANE.LOW_SPEED_FALL));
          } else {
            this.body.setVelocity(vx, vy);
          }
          this.lastVelocityX = this.body.velocity.x;
          this.lastVelocityY = this.body.velocity.y;
        } else {
          this.body.setVelocity(0, this.stallVelocityY);
        }
      }
    } else if (this.state === PlaneState.STALLED) {
      if (input.up) {
        this.targetHeading += CONFIG.PLANE.TURN_RATE * dt;
      }
      if (input.down) {
        this.targetHeading -= CONFIG.PLANE.TURN_RATE * dt;
      }

      this.heading = lerpExp(this.heading, this.targetHeading, CONFIG.PLANE.TURN_SMOOTHING, dt);

      const stallAccel = CONFIG.PLANE.GROUND_ACCEL * CONFIG.PLANE.STALL_ACCEL_RATIO;
      this.stallVelocityY = Math.min(
        this.stallVelocityY + stallAccel * dt,
        CONFIG.PLANE.MAX_SPEED
      );

      const worldAngle = normalizeAngle(this.getWorldAngle());
      const noseDown = worldAngle >= CONFIG.PLANE.BOOST_ANGLE_MIN
        && worldAngle <= CONFIG.PLANE.BOOST_ANGLE_MAX;

      let recovered = false;
      if (noseDown) {
        // Nose pointing down: convert falling energy into forward speed
        const boostMax = CONFIG.PLANE.MAX_SPEED * CONFIG.PLANE.BOOST_MAX_RATIO;
        this.speed = lerpExp(this.speed, boostMax, CONFIG.PLANE.BOOST_SPEED_SMOOTHING, dt);

        if (this.speed >= CONFIG.PLANE.MAX_SPEED * 0.3) {
          this.state = PlaneState.FLYING;
          this.boostLocked = false;
          recovered = true;
        }
      }

      if (!recovered) {
        this.stallVelocityX = lerpExp(this.stallVelocityX, 0, CONFIG.PLANE.STALL_X_DAMPING, dt);
        this.body.setVelocity(this.stallVelocityX, this.stallVelocityY);
      }
      this.lastVelocityX = this.body.velocity.x;
      this.lastVelocityY = this.body.velocity.y;
    }

    if (this.takeoffGrace > 0) {
      this.takeoffGrace = Math.max(0, this.takeoffGrace - dt);
    }

    this.setRotation(degToRad(-(normalizeAngle(this.getWorldAngle()) - this.textureForwardAngle)));
    this.updatePropeller(dt);

    this.setX(wrap(this.x, 0, worldWidth));

    const groundContactY = groundY - planeHalfHeight + CONFIG.PLANE.GROUND_WHEEL_OFFSET;
    if (
      this.state !== PlaneState.GROUNDED &&
      this.takeoffGrace <= 0 &&
      this.y >= groundContactY
    ) {
      this.crash();
    }
  }

  crash() {
    if (this.state === PlaneState.CRASHED) return;

    this.state = PlaneState.CRASHED;
    this.speed = 0;
    this.body?.setVelocity(0, 0);
    this.setAlpha(CONFIG.PLANE.CRASH_ALPHA);
    this.setVisible(false);
    this.onCrash?.(this.x, this.y);

    this.spawnCrashPieces(() => {
      this.resetToStart();
    });
  }

  resetToStart() {
    this.state = PlaneState.GROUNDED;
    this.speed = 0;
    this.heading = 0;
    this.targetHeading = 0;
    this.facing = this.startFacing;
    this.setPosition(this.startX, CONFIG.GROUND_Y - CONFIG.PLANE.HEIGHT * 0.5 + CONFIG.PLANE.GROUND_WHEEL_OFFSET);
    this.setAlpha(1);
    this.setVisible(true);
    this.body?.setVelocity(0, 0);
    this.inCloud = false;
    this.takeoffGrace = 0;
    this.stallVelocityX = 0;
    this.stallVelocityY = 0;
    this.lastVelocityX = 0;
    this.lastVelocityY = 0;
    this.groundRunDistance = 0;
    this.boostLocked = false;
  }

  destroy(fromScene?: boolean) {
    this.propeller?.destroy();
    super.destroy(fromScene);
  }

  setInCloud(value: boolean) {
    if (this.state === PlaneState.CRASHED) return;
    this.inCloud = value;
    this.setAlpha(value ? CONFIG.PLANE.CLOUD_ALPHA : 1);
  }

  private enterStall() {
    if (this.state === PlaneState.CRASHED) return;
    this.state = PlaneState.STALLED;
    this.speed = 0;
    this.stallVelocityX = this.body.velocity.x;
    this.stallVelocityY = 0;
    this.targetHeading = this.heading;
    this.body.setVelocity(0, 0);
    this.boostLocked = true;
  }

  private spawnCrashPieces(onAllLanded: () => void) {
    const source = this.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const sourceWidth = source.width || this.texture.width;
    const sourceHeight = source.height || this.texture.height;
    const slices = 5;
    const sliceWidth = sourceWidth / slices;
    const sliceDisplayWidth = this.displayWidth / slices;
    const sliceDisplayHeight = this.displayHeight;

    const topLeftX = this.x - this.displayWidth * 0.5;
    const topLeftY = this.y - this.displayHeight * 0.5;

    let landedCount = 0;

    for (let i = 0; i < slices; i += 1) {
      const textureKey = `crash-${this.texture.key}-${this.scene.time.now}-${i}`;
      const canvasTex = this.scene.textures.createCanvas(textureKey, Math.ceil(sliceWidth), sourceHeight);
      const ctx = canvasTex.getContext();
      ctx.drawImage(
        source as CanvasImageSource,
        i * sliceWidth,
        0,
        sliceWidth,
        sourceHeight,
        0,
        0,
        sliceWidth,
        sourceHeight
      );
      canvasTex.refresh();

      const piece = this.scene.add.image(0, 0, textureKey);
      piece.setOrigin(0.5, 0.5);
      piece.setDepth(CONFIG.DEPTH.PLANE);
      piece.setDisplaySize(sliceDisplayWidth, sliceDisplayHeight);

      const fallSpeed = Phaser.Math.FloatBetween(180, 480);
      const driftSpeed = this.lastVelocityX;
      const initialVy = this.lastVelocityY;
      const targetY = CONFIG.GROUND_Y - piece.displayHeight * 0.5 + CONFIG.PLANE.GROUND_WHEEL_OFFSET;

      piece.setPosition(
        topLeftX + (i + 0.5) * sliceDisplayWidth,
        topLeftY + sliceDisplayHeight * 0.5
      );

      const g = fallSpeed;
      const startX = piece.x;
      const startY = piece.y;
      const startAngle = piece.angle;
      const spinSpeed = Phaser.Math.FloatBetween(-540, 540);
      const vx = driftSpeed;
      const vy0 = initialVy;
      const startTime = this.scene.time.now;

      const timer = this.scene.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const elapsed = (this.scene.time.now - startTime) / 1000;
          const x = startX + vx * elapsed;
          const y = startY + vy0 * elapsed + 0.5 * g * elapsed * elapsed;
          const width = CONFIG.DESIGN_WIDTH;
          let wrappedX = x;
          if (wrappedX < 0) wrappedX = ((wrappedX % width) + width) % width;
          if (wrappedX > width) wrappedX = wrappedX % width;
          piece.x = wrappedX;
          piece.y = y;
          piece.angle = startAngle + spinSpeed * elapsed;

          if (piece.y >= targetY) {
            piece.y = targetY;
            timer.remove(false);
            landedCount += 1;
            piece.destroy();
            this.scene.textures.remove(textureKey);
            if (landedCount >= slices) {
              onAllLanded();
            }
          }
        }
      });
    }
  }

  private getWorldAngle() {
    return this.getWorldAngleForFacing(this.facing, this.heading);
  }

  private applyPlaneHitbox() {
    const w = this.displayWidth * CONFIG.PLANE.HITBOX_SCALE_X;
    const h = this.displayHeight * CONFIG.PLANE.HITBOX_SCALE_Y;
    const offsetX = (this.displayWidth - w) * 0.5 + this.displayWidth * CONFIG.PLANE.HITBOX_OFFSET_X;
    const offsetY = (this.displayHeight - h) * 0.5 + this.displayHeight * CONFIG.PLANE.HITBOX_OFFSET_Y;
    this.body.setSize(w, h, false);
    this.body.setOffset(offsetX, offsetY);
  }

  getNosePosition(): { x: number; y: number } {
    const angleRad = degToRad(this.getWorldAngle());
    const noseOffset = this.displayWidth * CONFIG.PLANE.NOSE_OFFSET_RATIO;
    return {
      x: this.x + Math.cos(angleRad) * noseOffset,
      y: this.y - Math.sin(angleRad) * noseOffset
    };
  }

  private getWorldAngleForFacing(facing: number, heading: number) {
    if (facing >= 0) return heading;
    return 180 - heading;
  }

  private updatePropeller(dt: number) {
    if (!this.propeller) return;
    const angleRad = degToRad(this.getWorldAngle());
    const noseOffset = this.displayWidth * CONFIG.PLANE.NOSE_OFFSET_RATIO;

    this.propeller.setPosition(
      this.x + Math.cos(angleRad) * noseOffset,
      this.y - Math.sin(angleRad) * noseOffset
    );

    if (this.state === PlaneState.FLYING) {
      this.propeller.rotation += dt * CONFIG.PLANE.PROPELLER_SPEED_FLYING;
      this.propeller.setVisible(true);
    } else {
      this.propeller.rotation += dt * CONFIG.PLANE.PROPELLER_SPEED_IDLE;
      this.propeller.setVisible(this.state !== PlaneState.CRASHED);
    }
  }
}

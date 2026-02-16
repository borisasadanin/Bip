export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

export const lerpExp = (from: number, to: number, smoothing: number, dt: number) =>
  lerp(from, to, 1 - Math.exp(-smoothing * dt));

export const wrap = (value: number, min: number, max: number) => {
  // NOTE(low logic risk): this wrap is a "snap to the other side" implementation, not a modulo wrap.
  // If value overshoots by a large amount (e.g. unusual delta/velocity), you may see discontinuous jumps.
  // This project already clamps dt, so the practical risk is low, but consider a modulo-based wrap if reusing elsewhere.
  if (value < min) return max;
  if (value > max) return min;
  return value;
};

export const normalizeAngle = (deg: number) => {
  if (!isFinite(deg)) return 0;
  let angle = ((deg + 180) % 360);
  if (angle < 0) angle += 360;
  return angle - 180;
};

export const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const randRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

# Biplane Bash

Two-player arcade biplane duel built with TypeScript + Phaser 3 (no audio).

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Controls

- Player 1: Arrow keys
- Player 2: WASD
- Restart after win: R

## Notes

- Flip (left/right) locks out additional flips until the 0.3s flip finishes. Pitch input is ignored during the flip for a cleaner feel.
- World scale is based on 1280×720 and fits the browser using Phaser Scale.FIT + autoCenter.

## Structure

- `src/main.ts`
- `src/scenes/GameScene.ts`
- `src/entities/Plane.ts`
- `src/entities/Balloon.ts`
- `src/entities/Cloud.ts`
- `src/entities/Obstacle.ts`
- `src/ui/Hud.ts`
- `src/utils/math.ts`
- `src/config.ts`

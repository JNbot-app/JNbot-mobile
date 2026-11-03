jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import React from 'react';
import { BotMovement, HeadAim } from './BotMovement';
import { movementToAim, aimToRotation } from './botAim';

describe('BotMovement', () => {
  it('exports valid components without evaluation errors', () => {
    expect(typeof BotMovement).toBe('function');
    expect(typeof HeadAim).toBe('function');
  });

  it('renders movement directional controls and head look container', () => {
    const onAction = jest.fn();
    const element = BotMovement({
      connected: true,
      movement: {
        forward: true,
        back: false,
        left: false,
        right: false,
        jump: false,
        sprint: false,
        sneak: false,
        fly: false,
        isPathfinding: false,
        yaw: 0,
        pitch: 0,
      },
      onAction,
    });
    const serialized = JSON.stringify(element);

    expect(serialized).toContain('Forward');
    expect(serialized).toContain('Back');
    expect(serialized).toContain('Left');
    expect(serialized).toContain('Right');
    expect(serialized).toContain('Stop movement');
  });
});

describe('head aim conversion', () => {
  it('starts at a finite north-facing angle before movement arrives', () => {
    expect(movementToAim(undefined)).toEqual({ yaw: 0, pitch: 0 });
    expect(movementToAim({ yaw: Number.NaN, pitch: Number.NaN })).toEqual({ yaw: 0, pitch: 0 });
  });

  it('uses the same yaw sign as the map and bot action', () => {
    expect(movementToAim({ yaw: -Math.PI / 2, pitch: 0 })).toEqual({ yaw: 90, pitch: 0 });
    expect(aimToRotation({ yaw: 90, pitch: 0 }).yaw).toBeCloseTo(-Math.PI / 2);
  });
});

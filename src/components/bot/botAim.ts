import type { BotMovementPacket } from "../../store/types";

export type Aim = { yaw: number; pitch: number };

const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (radians: number) => Math.round(radians * 180 / Math.PI);
const wrap = (value: number) => ((value % 360) + 360) % 360;

export function movementToAim(movement: Pick<BotMovementPacket, "yaw" | "pitch"> | undefined): Aim {
  const yaw = typeof movement?.yaw === "number" && Number.isFinite(movement.yaw) ? movement.yaw : 0;
  const pitch = typeof movement?.pitch === "number" && Number.isFinite(movement.pitch) ? movement.pitch : 0;
  return { yaw: wrap(degrees(-yaw)), pitch: degrees(pitch) };
}

export function aimToRotation(aim: Aim): Aim {
  return { yaw: radians(-aim.yaw), pitch: radians(aim.pitch) };
}

import { getBlockColorMap } from "./blockColors";

export type WorldPosition = { x: number; y?: number; z: number };
export type MapEntity = { id: number; kind: "player" | "mob"; name: string; x: number; y: number | null; z: number };
export type MapMovement = { yaw: number; jump: boolean; sneak: boolean; sprint: boolean; forward: boolean; back: boolean; left: boolean; right: boolean; isPathfinding: boolean };
export type WorldChunks = Record<string, number[]>;

export type ChunkUpdate = {
  type: "load" | "unload";
  x: number;
  z: number;
  chunk?: unknown;
};

export type WorldMapSnapshot = {
  chunks: WorldChunks;
  player: WorldPosition;
};

export type WorldMapImage = {
  uri: string;
  bounds: { minX: number; minZ: number; width: number; height: number };
  chunkCount: number;
};

export type CachedWorldMap = {
  chunks: WorldChunks;
  player: WorldPosition;
  image: WorldMapImage;
};

type WorldMapBounds = WorldMapImage["bounds"];

export { getBlockColorMap, resolveMinecraftVersion } from "./blockColors";

const CHUNK_SIZE = 16;
const PACKED_VALUES_PER_CHUNK = (CHUNK_SIZE * CHUNK_SIZE) / 2;
const DEFAULT_BLOCK_COLOR = "#7d7d7d";
const MAX_CACHED_WORLDS = 3;
const worldMapCache = new Map<string, CachedWorldMap>();
const renderedImageCache = new WeakMap<WorldChunks, Map<string, WorldMapImage | null>>();

const SHADE_COLORS: Record<string, string> = {
  hl1: "rgba(255, 255, 255, 0.09)",
  hl2: "rgba(255, 255, 255, 0.18)",
  hl3: "rgba(255, 255, 255, 0.26)",
  sh1: "rgba(0, 0, 0, 0.11)",
  sh2: "rgba(0, 0, 0, 0.22)",
  sh3: "rgba(0, 0, 0, 0.32)",
};
const CLIFF_EDGE_COLOR = "rgba(0, 0, 0, 0.45)";

export function getWorldTileHeight(chunks: WorldChunks, x: number, z: number): number | undefined {
  "worklet";
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkZ = Math.floor(z / CHUNK_SIZE);
  const data = chunks[`${chunkX},${chunkZ}`];
  if (!data || data.length < 256) return undefined;
  const col = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const row = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const index = row * CHUNK_SIZE + col;
  const packed = data[128 + (index >> 1)] ?? 0;
  return col % 2 === 0 ? packed >> 16 : ((packed & 0xffff) << 16) >> 16;
}

function numberArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>, Number);
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  // Node buffers cross the remote JSON/WebRTC boundary in this shape.
  if (Array.isArray(record.data)) return record.data.map(Number);

  return Object.keys(record)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => Number(record[key]));
}

export function normalizeChunkDump(value: unknown): WorldMapSnapshot {
  const [rawChunks, rawPositions, rawPlayer] = Array.isArray(value) ? value : [];
  const chunks: WorldChunks = {};
  const positions = Array.isArray(rawPositions) ? rawPositions : [];
  const chunkList = Array.isArray(rawChunks) ? rawChunks : [];

  positions.forEach((position, index) => {
    if (!Array.isArray(position)) return;
    const x = Number(position[0]);
    const z = Number(position[1]);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      chunks[`${x},${z}`] = numberArray(chunkList[index]);
    }
  });

  const player = numberArray(rawPlayer);
  return {
    chunks,
    player: {
      x: Number.isFinite(player[0]) ? player[0] : 0,
      y: Number.isFinite(player[1]) ? player[1] : undefined,
      z: Number.isFinite(player[2]) ? player[2] : 0,
    },
  };
}

export function applyChunkUpdate(chunks: WorldChunks, update: ChunkUpdate): WorldChunks {
  const key = `${update.x},${update.z}`;
  if (update.type === "unload") {
    if (!(key in chunks)) return chunks;
    const next = { ...chunks };
    delete next[key];
    return next;
  }

  return { ...chunks, [key]: numberArray(update.chunk) };
}

export function getCachedWorldMap(key: string): CachedWorldMap | undefined {
  const cached = worldMapCache.get(key);
  if (!cached) return undefined;
  worldMapCache.delete(key);
  worldMapCache.set(key, cached);
  return cached;
}

export function cacheWorldMap(key: string, value: CachedWorldMap): void {
  worldMapCache.delete(key);
  worldMapCache.set(key, value);
  if (worldMapCache.size <= MAX_CACHED_WORLDS) return;
  const oldestKey = worldMapCache.keys().next().value;
  if (oldestKey !== undefined) worldMapCache.delete(oldestKey);
}

export function worldToMapPoint(
  bounds: WorldMapBounds,
  position: Pick<WorldPosition, "x" | "z">,
  pixelsPerBlock = 1,
) {
  return {
    x: (position.x - bounds.minX) * pixelsPerBlock,
    y: (position.z - bounds.minZ) * pixelsPerBlock,
  };
}

export function mapPointToWorld(
  bounds: WorldMapBounds,
  point: { x: number; y: number },
  pixelsPerBlock = 1,
): WorldPosition {
  "worklet";
  return {
    x: Math.floor(bounds.minX + point.x / pixelsPerBlock),
    z: Math.floor(bounds.minZ + point.y / pixelsPerBlock),
  };
}

export const MIN_MAP_SCALE = 0.25;
export const MAX_MAP_SCALE = 6;
export const DEFAULT_MAP_SCALE = 1;
export const MAP_ZOOM_STEP = 1.5;

export function clampCamera(
  val: number,
  contentSize: number,
  viewportSize: number,
  scale: number,
  edgeReveal = 40,
): number {
  "worklet";
  if (viewportSize <= 0) return val;
  const edgeBuffer = Math.max(0, (viewportSize / 2 - edgeReveal) / scale);
  const min = -edgeBuffer;
  const max = contentSize + edgeBuffer;
  if (min > max) {
    return contentSize / 2;
  }
  return Math.max(min, Math.min(max, val));
}

export function calculateMapTransform(
  camX: number,
  camY: number,
  scale: number,
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  "worklet";
  const tx = viewportWidth / 2 - camX * scale - (contentWidth / 2) * (1 - scale);
  const ty = viewportHeight / 2 - camY * scale - (contentHeight / 2) * (1 - scale);
  return { translateX: tx, translateY: ty, scale };
}

export function screenToWorldPosition(
  screenPoint: { x: number; y: number },
  camera: { x: number; y: number },
  scale: number,
  viewport: { width: number; height: number },
  bounds: WorldMapBounds,
  pixelsPerBlock = 1,
): WorldPosition {
  "worklet";
  const contentX = camera.x + (screenPoint.x - viewport.width / 2) / scale;
  const contentY = camera.y + (screenPoint.y - viewport.height / 2) / scale;
  const localX = contentX / pixelsPerBlock;
  const localZ = contentY / pixelsPerBlock;
  return mapPointToWorld(bounds, { x: localX, y: localZ });
}

export function worldToScreenPosition(
  worldPos: Pick<WorldPosition, "x" | "z">,
  camera: { x: number; y: number },
  scale: number,
  viewport: { width: number; height: number },
  bounds: WorldMapBounds,
  pixelsPerBlock = 1,
) {
  "worklet";
  const mapPoint = worldToMapPoint(bounds, worldPos, pixelsPerBlock);
  return {
    x: viewport.width / 2 + (mapPoint.x - camera.x) * scale,
    y: viewport.height / 2 + (mapPoint.y - camera.y) * scale,
  };
}

export function buildWorldMapSvg(chunks: WorldChunks, version?: string): WorldMapImage | null {
  const versionKey = version ?? "";
  const cachedByVersion = renderedImageCache.get(chunks);
  if (cachedByVersion?.has(versionKey)) return cachedByVersion.get(versionKey) ?? null;

  const entries: Array<{ x: number; z: number; data: number[] }> = [];
  let minChunkX = Infinity;
  let minChunkZ = Infinity;
  let maxChunkX = -Infinity;
  let maxChunkZ = -Infinity;
  const chunkMap = new Map<string, number[]>();

  for (const [key, data] of Object.entries(chunks)) {
    const [x, z] = key.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    entries.push({ x, z, data });
    chunkMap.set(`${x},${z}`, data);
    minChunkX = Math.min(minChunkX, x);
    minChunkZ = Math.min(minChunkZ, z);
    maxChunkX = Math.max(maxChunkX, x);
    maxChunkZ = Math.max(maxChunkZ, z);
  }
  if (!entries.length) {
    const images = cachedByVersion ?? new Map<string, WorldMapImage | null>();
    images.set(versionKey, null);
    renderedImageCache.set(chunks, images);
    return null;
  }

  function getTileHeight(data: number[] | undefined, col: number, row: number): number | undefined {
    if (!data || data.length < 256) return undefined;
    const index = row * CHUNK_SIZE + col;
    const packed = data[128 + (index >> 1)] ?? 0;
    return col % 2 === 0 ? packed >> 16 : ((packed & 0xffff) << 16) >> 16;
  }

  const minX = minChunkX * CHUNK_SIZE;
  const minZ = minChunkZ * CHUNK_SIZE;
  const width = (maxChunkX - minChunkX + 1) * CHUNK_SIZE;
  const height = (maxChunkZ - minChunkZ + 1) * CHUNK_SIZE;

  const colorMap = getBlockColorMap(version);
  const colorPaths = new Map<string, string[]>();
  const shadePaths = new Map<string, string[]>();
  const cliffSegments: string[] = [];

  for (const chunk of entries) {
    const chunkX = chunk.x * CHUNK_SIZE - minX;
    const chunkZ = chunk.z * CHUNK_SIZE - minZ;
    const packedLength = Math.min(chunk.data.length, PACKED_VALUES_PER_CHUNK);
    const hasHeights = chunk.data.length >= 256;
    const northData = hasHeights ? chunkMap.get(`${chunk.x},${chunk.z - 1}`) : undefined;
    const westData = hasHeights ? chunkMap.get(`${chunk.x - 1},${chunk.z}`) : undefined;
    const southData = hasHeights ? chunkMap.get(`${chunk.x},${chunk.z + 1}`) : undefined;
    const eastData = hasHeights ? chunkMap.get(`${chunk.x + 1},${chunk.z}`) : undefined;

    for (let row = 0; row < CHUNK_SIZE; row++) {
      let runColor: string | null = null;
      let runStart = 0;
      let runShade: string | null = null;
      let runShadeStart = 0;

      for (let column = 0; column <= CHUNK_SIZE; column++) {
        let color: string | null = null;
        let shade: string | null = null;
        const packedIndex = row * (CHUNK_SIZE / 2) + Math.floor(column / 2);

        if (column < CHUNK_SIZE && packedIndex < packedLength) {
          const packed = chunk.data[packedIndex] >>> 0;
          const block = column % 2 === 0 ? packed >>> 16 : packed & 0xffff;
          if (block !== 0) {
            color = colorMap[block] ?? DEFAULT_BLOCK_COLOR;

            if (hasHeights) {
              const curY = getTileHeight(chunk.data, column, row);
              if (curY !== undefined) {
                const northY = row > 0
                  ? getTileHeight(chunk.data, column, row - 1)
                  : getTileHeight(northData, column, CHUNK_SIZE - 1) ?? curY;
                const westY = column > 0
                  ? getTileHeight(chunk.data, column - 1, row)
                  : getTileHeight(westData, CHUNK_SIZE - 1, row) ?? curY;

                const slope = 0.6 * (curY - (northY ?? curY)) + 0.4 * (curY - (westY ?? curY));
                let step = 0;
                if (slope >= 2.5) step = 3;
                else if (slope >= 1.4) step = 2;
                else if (slope >= 0.25) step = 1;
                else if (slope <= -2.5) step = -3;
                else if (slope <= -1.4) step = -2;
                else if (slope <= -0.25) step = -1;

                if (step === 1) shade = "hl1";
                else if (step === 2) shade = "hl2";
                else if (step >= 3) shade = "hl3";
                else if (step === -1) shade = "sh1";
                else if (step === -2) shade = "sh2";
                else if (step <= -3) shade = "sh3";

                // Cliff edge cues (drops >= 2 blocks)
                const southY = row < CHUNK_SIZE - 1
                  ? getTileHeight(chunk.data, column, row + 1)
                  : getTileHeight(southData, column, 0) ?? curY;
                const eastY = column < CHUNK_SIZE - 1
                  ? getTileHeight(chunk.data, column + 1, row)
                  : getTileHeight(eastData, 0, row) ?? curY;

                const gx = chunkX + column;
                const gy = chunkZ + row;
                if (curY - (southY ?? curY) >= 2) {
                  cliffSegments.push(`M${gx} ${gy + 0.88}h1v0.12h-1z`);
                }
                if (curY - (eastY ?? curY) >= 2) {
                  cliffSegments.push(`M${gx + 0.88} ${gy}h0.12v1h-0.12z`);
                }
                if ((northY ?? curY) - curY >= 2) {
                  cliffSegments.push(`M${gx} ${gy}h1v0.12h-1z`);
                }
                if ((westY ?? curY) - curY >= 2) {
                  cliffSegments.push(`M${gx} ${gy}h0.12v1h-0.12z`);
                }
              }
            }
          }
        }

        if (color !== runColor) {
          if (runColor) {
            const runLength = column - runStart;
            const segments = colorPaths.get(runColor) ?? [];
            segments.push(`M${chunkX + runStart} ${chunkZ + row}h${runLength}v1h-${runLength}z`);
            colorPaths.set(runColor, segments);
          }
          runColor = color;
          runStart = column;
        }

        if (shade !== runShade) {
          if (runShade) {
            const runLength = column - runShadeStart;
            const segments = shadePaths.get(runShade) ?? [];
            segments.push(`M${chunkX + runShadeStart} ${chunkZ + row}h${runLength}v1h-${runLength}z`);
            shadePaths.set(runShade, segments);
          }
          runShade = shade;
          runShadeStart = column;
        }
      }
    }
  }

  let paintedPaths = "";
  for (const [color, segments] of colorPaths) {
    paintedPaths += `<path fill="${color}" d="${segments.join("")}"/>`;
  }
  for (const [shadeKey, segments] of shadePaths) {
    const fill = SHADE_COLORS[shadeKey];
    if (fill && segments.length) {
      paintedPaths += `<path fill="${fill}" d="${segments.join("")}"/>`;
    }
  }
  if (cliffSegments.length) {
    paintedPaths += `<path fill="${CLIFF_EDGE_COLOR}" d="${cliffSegments.join("")}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#08090a"/>${paintedPaths}</svg>`;
  const uri = typeof globalThis.btoa === "function"
    ? `data:image/svg+xml;base64,${globalThis.btoa(svg)}`
    : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = {
    uri,
    bounds: { minX, minZ, width, height },
    chunkCount: entries.length,
  };
  const images = cachedByVersion ?? new Map<string, WorldMapImage | null>();
  images.set(versionKey, image);
  renderedImageCache.set(chunks, images);
  return image;
}

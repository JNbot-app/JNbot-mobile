import {
  applyChunkUpdate,
  buildWorldMapSvg,
  calculateMapTransform,
  clampCamera,
  mapPointToWorld,
  normalizeChunkDump,
  resolveMinecraftVersion,
  screenToWorldPosition,
  worldToMapPoint,
  worldToScreenPosition,
  getWorldTileHeight,
} from "./worldMap";




describe("world map data", () => {
  const decodeSvg = (uri: string) => {
    const base64Prefix = "data:image/svg+xml;base64,";
    return uri.startsWith(base64Prefix)
      ? globalThis.atob(uri.slice(base64Prefix.length))
      : decodeURIComponent(uri.slice(uri.indexOf(",") + 1));
  };

  it("normalizes chunk dumps and player position", () => {
    expect(normalizeChunkDump([[[65538]], [[2, -3]], [34, 70, -45]])).toEqual({
      chunks: { "2,-3": [65538] },
      player: { x: 34, y: 70, z: -45 },
    });
  });

  it("normalizes remotely serialized buffers", () => {
    expect(normalizeChunkDump([[[1]], [[0, 0]], { type: "Buffer", data: [4, 70, 7] }]).player)
      .toEqual({ x: 4, y: 70, z: 7 });
    expect(applyChunkUpdate({}, {
      type: "load",
      x: 1,
      z: 2,
      chunk: { type: "Buffer", data: [3, 4] },
    })).toEqual({ "1,2": [3, 4] });
  });

  it("applies load and unload updates immutably", () => {
    const loaded = applyChunkUpdate({}, { type: "load", x: 1, z: 2, chunk: [3] });
    expect(loaded).toEqual({ "1,2": [3] });
    expect(applyChunkUpdate(loaded, { type: "unload", x: 1, z: 2 })).toEqual({});
  });

  it("renders every loaded chunk without extending past 16 rows", () => {
    const chunks = Object.fromEntries(
      Array.from({ length: 26 }, (_, index) => [`${index},0`, [65538]]),
    );
    const result = buildWorldMapSvg(chunks);
    expect(result?.bounds).toEqual({ minX: 0, minZ: 0, width: 416, height: 16 });
    expect(result?.chunkCount).toBe(26);

    const overflowing = Array(256).fill(0);
    overflowing[128] = 2;
    const svg = decodeSvg(buildWorldMapSvg({ "0,0": overflowing })!.uri);
    expect(svg).not.toContain("M0 16");
  });

  it("collapses adjacent blocks into compact horizontal runs", () => {
    const uniformChunk = Array(128).fill((1 << 16) | 1);
    const image = buildWorldMapSvg({ "0,0": uniformChunk })!;
    const svg = decodeSvg(image.uri);

    expect(svg.match(/h16v1h-16z/g)).toHaveLength(16);
    expect(image.uri.length).toBeLessThan(1_000);
  });

  it("reuses a completed render while the chunk snapshot is unchanged", () => {
    const chunks = { "0,0": [(1 << 16) | 1] };
    expect(buildWorldMapSvg(chunks, "1.21.1")).toBe(buildWorldMapSvg(chunks, "1.21.1"));
  });

  it("renders authentic Minecraft block texture colors for known blocks across versions", () => {
    // 1.21 test: stone (1) -> #7d7d7d, grass_block (8) -> #476d3d, water (35) -> #4f66a1
    const testChunk21 = Array(256).fill(0);
    testChunk21[0] = (1 << 16) | 8; // (0,0)=stone, (1,0)=grass_block
    testChunk21[1] = (35 << 16) | 0; // (2,0)=water
    const svg21 = decodeSvg(buildWorldMapSvg({ "0,0": testChunk21 }, "1.21.1")!.uri);
    expect(svg21).toContain('fill="#7d7d7d"');
    expect(svg21).toContain('fill="#476d3d"');
    expect(svg21).toContain('fill="#4f66a1"');

    // 1.18 test: water in 1.18 is block id 26 -> #283bf3
    const testChunk18 = Array(256).fill(0);
    testChunk18[0] = (26 << 16) | 1;
    const svg18 = decodeSvg(buildWorldMapSvg({ "0,0": testChunk18 }, "1.18.2")!.uri);
    expect(svg18).toContain('fill="#283bf3"');
    expect(svg18).toContain('fill="#7d7d7d"');
  });

  it("resolves Minecraft version to nearest compatible texture set", () => {
    expect(resolveMinecraftVersion("1.21.4")).toBe("1.21");
    expect(resolveMinecraftVersion("1.20.2")).toBe("1.18");
    expect(resolveMinecraftVersion("1.19")).toBe("1.18");
    expect(resolveMinecraftVersion("1.18.2")).toBe("1.18");
    expect(resolveMinecraftVersion("1.17.1")).toBe("1.16");
    expect(resolveMinecraftVersion("1.16.5")).toBe("1.16");
    expect(resolveMinecraftVersion("1.12.2")).toBe("1.8");
    expect(resolveMinecraftVersion("1.8.9")).toBe("1.8");
    expect(resolveMinecraftVersion()).toBe("1.21");
  });


  it("maps negative player and pointer positions without losing chunk offsets", () => {
    const bounds = { minX: -32, minZ: -48, width: 48, height: 64 };
    expect(worldToMapPoint(bounds, { x: -17.25, z: -32.5 }, 4)).toEqual({
      x: 59,
      y: 62,
    });
    expect(mapPointToWorld(bounds, { x: 59, y: 62 }, 4)).toEqual({
      x: -18,
      z: -33,
    });
  });

  it("extracts tile heights including negative coordinates", () => {
    const chunk = Array(256).fill(0);
    chunk[128] = ((64 & 0xffff) << 16) | (-50 & 0xffff);

    const chunks = { "0,0": chunk };
    expect(getWorldTileHeight(chunks, 0, 0)).toBe(64);
    expect(getWorldTileHeight(chunks, 1, 0)).toBe(-50);
    expect(getWorldTileHeight(chunks, 5, 5)).toBe(0);
    expect(getWorldTileHeight(chunks, 100, 100)).toBeUndefined();
  });

  it("applies directional hillshading and cliff highlights when heights are present", () => {
    const chunk = Array(256).fill(0);
    chunk[0] = (1 << 16) | 1;
    chunk[8] = (1 << 16) | 0;
    chunk[128] = (64 << 16) | 65;
    chunk[128 + 8] = 62 << 16;

    const svg = decodeSvg(buildWorldMapSvg({ "0,0": chunk }, "1.21.1")!.uri);
    expect(svg).toContain('fill="rgba(255, 255, 255, 0.09)"');
    expect(svg).toContain('fill="rgba(0, 0, 0, 0.45)"');
  });

  describe("zoom and viewport transforms", () => {
    const bounds = { minX: -32, minZ: -48, width: 64, height: 64 };
    const viewport = { width: 400, height: 300 };
    const pixelsPerBlock = 4;
    const contentWidth = bounds.width * pixelsPerBlock; // 256
    const contentHeight = bounds.height * pixelsPerBlock; // 256

    it("clamps camera position safely within bounds based on scale and reveal margins", () => {
      // Scale 1: edgeBuffer = (400 / 2 - 40) / 1 = 160. min = -160, max = 256 + 160 = 416
      expect(clampCamera(100, contentWidth, viewport.width, 1)).toBe(100);
      expect(clampCamera(-200, contentWidth, viewport.width, 1)).toBe(-160);
      expect(clampCamera(500, contentWidth, viewport.width, 1)).toBe(416);

      // Higher zoom restricts the camera range in content space:
      // Scale 2: edgeBuffer = (400 / 2 - 40) / 2 = 80. min = -80, max = 256 + 80 = 336
      expect(clampCamera(-100, contentWidth, viewport.width, 2)).toBe(-80);
      expect(clampCamera(400, contentWidth, viewport.width, 2)).toBe(336);

      // Gracefully handles 0 viewport size
      expect(clampCamera(100, contentWidth, 0, 1)).toBe(100);
    });

    it("calculates transform that aligns camera point to viewport center at any scale", () => {
      const camera = { x: 128, y: 128 }; // center of content

      // At scale 1
      const transform1 = calculateMapTransform(
        camera.x,
        camera.y,
        1,
        contentWidth,
        contentHeight,
        viewport.width,
        viewport.height,
      );
      expect(transform1).toEqual({
        translateX: viewport.width / 2 - camera.x,
        translateY: viewport.height / 2 - camera.y,
        scale: 1,
      });

      // At scale 2.5
      const transform2 = calculateMapTransform(
        camera.x,
        camera.y,
        2.5,
        contentWidth,
        contentHeight,
        viewport.width,
        viewport.height,
      );
      // Center of content (128, 128) transformed:
      // screenX = contentWidth / 2 + translateX + (128 - contentWidth / 2) * scale
      // = 128 + translateX + 0 = 128 + (200 - 128*2.5 - 128*(1 - 2.5)) = 128 + 200 - 320 + 192 = 200 (viewport.width / 2)
      const screenCenterX = contentWidth / 2 + transform2.translateX;
      const screenCenterY = contentHeight / 2 + transform2.translateY;
      expect(screenCenterX).toBe(viewport.width / 2);
      expect(screenCenterY).toBe(viewport.height / 2);
    });

    it("converts screen tap coordinates to world positions at varying zoom levels", () => {
      const camera = { x: 64, y: 64 };
      const centerScreen = { x: viewport.width / 2, y: viewport.height / 2 };

      // Tap at viewport center should always select the camera position
      const worldCenter1 = screenToWorldPosition(
        centerScreen,
        camera,
        1,
        viewport,
        bounds,
        pixelsPerBlock,
      );
      const worldCenter2 = screenToWorldPosition(
        centerScreen,
        camera,
        3,
        viewport,
        bounds,
        pixelsPerBlock,
      );
      expect(worldCenter1).toEqual(worldCenter2);
      expect(worldCenter1).toEqual({
        x: bounds.minX + camera.x / pixelsPerBlock, // -32 + 16 = -16
        z: bounds.minZ + camera.y / pixelsPerBlock, // -48 + 16 = -32
      });

      // When zoomed in 2x, tapping 8 pixels right on screen should equal 1 block (4px * 2)
      const tappedScreen = { x: centerScreen.x + 8, y: centerScreen.y };
      const tappedWorld = screenToWorldPosition(
        tappedScreen,
        camera,
        2,
        viewport,
        bounds,
        pixelsPerBlock,
      );
      expect(tappedWorld.x).toBe(worldCenter1.x + 1);
      expect(tappedWorld.z).toBe(worldCenter1.z);
    });

    it("inverts world to screen coordinates consistently", () => {
      const camera = { x: 100, y: 120 };
      const scale = 2.5;
      const worldTarget = { x: -10, z: -25 };

      const screenPos = worldToScreenPosition(
        worldTarget,
        camera,
        scale,
        viewport,
        bounds,
        pixelsPerBlock,
      );
      const convertedWorld = screenToWorldPosition(
        screenPos,
        camera,
        scale,
        viewport,
        bounds,
        pixelsPerBlock,
      );

      expect(convertedWorld.x).toBe(worldTarget.x);
      expect(convertedWorld.z).toBe(worldTarget.z);
    });
  });
});

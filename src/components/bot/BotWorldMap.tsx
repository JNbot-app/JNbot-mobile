import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  type SharedValue,
} from "react-native-reanimated";
import type { JNbotClient } from "../../client/JNbotClient";
import type { ActiveBot } from "../../store/types";
import { get } from "../../store/store";
import {
  applyChunkUpdate,
  buildWorldMapSvg,
  cacheWorldMap,
  calculateMapTransform,
  clampCamera,
  DEFAULT_MAP_SCALE,
  MAP_ZOOM_STEP,
  MAX_MAP_SCALE,
  MIN_MAP_SCALE,
  getCachedWorldMap,
  normalizeChunkDump,
  screenToWorldPosition,
  worldToMapPoint,
  getWorldTileHeight,
  type ChunkUpdate,
  type WorldChunks,
  type WorldMapImage,
  type WorldPosition,
  type MapEntity,
  type MapMovement,
} from "../../features/worldMap";
import { Badge, Button, Card, Txt } from "../ui";
import { colors, radii, spacing, palette } from "../../theme/theme";

type Props = {
  bot: ActiveBot;
  client: JNbotClient;
  disabled: boolean;
};

const BLOCK_SIZE = 4;
const MAP_EDGE_REVEAL = 40;
const CHUNK_UPDATE_INTERVAL_MS = 250;
const EMPTY_MAP_MOVEMENT: MapMovement = { yaw: 0, jump: false, sneak: false, sprint: false, forward: false, back: false, left: false, right: false, isPathfinding: false };

export function BotWorldMap({ bot, client, disabled }: Props) {
  const cacheKey = `${bot.RUNTIME_PROFILE_ID ?? ""}:${bot.INSTANCE_ID}:${bot.botId}:${bot.version}`;
  const initialCache = useMemo(() => getCachedWorldMap(cacheKey), [cacheKey]);
  const botRef = useRef(bot);
  botRef.current = bot;
  const [chunks, setChunks] = useState<WorldChunks>(() => initialCache?.chunks ?? {});
  const [player, setPlayer] = useState<WorldPosition>(() => initialCache?.player ?? { x: 0, z: 0 });
  const [movement, setMovement] = useState<MapMovement>(() => get().botMovement[bot.botId] ?? EMPTY_MAP_MOVEMENT);
  const [moving, setMoving] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [entitiesEnabled, setEntitiesEnabled] = useState(false);
  const [entities, setEntities] = useState<MapEntity[]>([]);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selected, setSelected] = useState<WorldPosition | null>(null);
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
  const pendingUpdates = useRef<ChunkUpdate[]>([]);
  const updateJournal = useRef<ChunkUpdate[]>([]);
  const collectingUpdates = useRef(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMovement(get().botMovement[bot.botId] ?? EMPTY_MAP_MOVEMENT);
  }, [bot.botId, bot.MESSAGE_ADDRESS]);

  const flushChunkUpdates = useCallback(() => {
    updateTimer.current = null;
    const updates = pendingUpdates.current.splice(0);
    if (!updates.length) return;
    setChunks((current) => updates.reduce(applyChunkUpdate, current));
  }, []);

  const queueChunkUpdate = useCallback((update: ChunkUpdate) => {
    pendingUpdates.current.push(update);
    if (collectingUpdates.current) updateJournal.current.push(update);
    if (!updateTimer.current) {
      updateTimer.current = setTimeout(flushChunkUpdates, CHUNK_UPDATE_INTERVAL_MS);
    }
  }, [flushChunkUpdates]);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError("");
    updateJournal.current = [];
    collectingUpdates.current = true;
    try {
      const dump = await client.botAction<unknown>(botRef.current, "getChunkDump", [], true);
      const snapshot = normalizeChunkDump(dump);
      const currentUpdates = updateJournal.current;
      collectingUpdates.current = false;
      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = null;
      pendingUpdates.current = [];
      setChunks(currentUpdates.reduce(applyChunkUpdate, snapshot.chunks));
      setPlayer(snapshot.player);
      setSelected(null);
      setFocusRequest((request) => request + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The world map could not be loaded.");
    } finally {
      collectingUpdates.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => {
    const unsubscribeChunks = client.subscribeBot(bot, "chunks", (value) => {
      const update = value as ChunkUpdate;
      if (
        (update?.type === "load" || update?.type === "unload")
        && Number.isFinite(update.x)
        && Number.isFinite(update.z)
      ) {
        queueChunkUpdate(update);
      }
    });
    const updatePosition = (value: unknown, shouldFocus = false) => {
      if (!Array.isArray(value)) return;
      const [x, y, z] = value.map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      if (!shouldFocus && (x !== latestCacheValue.current.player.x || z !== latestCacheValue.current.player.z)) {
        setMoving(true);
        if (motionTimer.current) clearTimeout(motionTimer.current);
        motionTimer.current = setTimeout(() => setMoving(false), 500);
      }
      if (!shouldFocus && Number.isFinite(y) && y > (latestCacheValue.current.player.y ?? y)) {
        setJumping(true);
        if (jumpTimer.current) clearTimeout(jumpTimer.current);
        jumpTimer.current = setTimeout(() => setJumping(false), 450);
      }
      setPlayer({ x, y, z });
      if (shouldFocus) setFocusRequest((request) => request + 1);
    };
    const unsubscribeMovement = client.subscribeBot(bot, "movement", updatePosition);
    const unsubscribeForcedMove = client.subscribeBot(
      bot,
      "force-move",
      (value) => updatePosition(value, true),
    );
    const unsubscribeMovementState = client.subscribeBot(bot, "movement-state", (value) => {
      if (!value || typeof value !== "object") return;
      const state = value as MapMovement;
      if (Number.isFinite(state.yaw)) setMovement(state);
    });

    void load();
    return () => {
      unsubscribeChunks();
      unsubscribeMovement();
      unsubscribeForcedMove();
      unsubscribeMovementState();
      if (motionTimer.current) clearTimeout(motionTimer.current);
      motionTimer.current = null;
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      jumpTimer.current = null;
      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = null;
      pendingUpdates.current = [];
      updateJournal.current = [];
      collectingUpdates.current = false;
    };
  }, [bot.botId, bot.MESSAGE_ADDRESS, client, load, queueChunkUpdate]);

  useEffect(() => {
    if (!entitiesEnabled) return;
    const unsubscribe = client.subscribeBot(bot, "map-entities", (value) => {
      if (!Array.isArray(value)) return;
      const snapshot = value.filter((entity): entity is MapEntity =>
        entity !== null && typeof entity === "object" &&
        typeof entity.id === "number" &&
        (entity.kind === "player" || entity.kind === "mob") &&
        typeof entity.name === "string" &&
        Number.isFinite(entity.x) && Number.isFinite(entity.z),
      );
      setEntities(snapshot);
      setSelectedEntityId((current) => snapshot.some((entity) => entity.id === current) ? current : null);
    });
    return () => {
      unsubscribe();
      setEntities((current) => current.length ? [] : current);
      setSelectedEntityId(null);
    };
  }, [bot.botId, bot.MESSAGE_ADDRESS, client, entitiesEnabled]);

  const map = useMemo(() => buildWorldMapSvg(chunks, bot.version), [chunks, bot.version]);
  const latestCacheValue = useRef({ chunks, player, map });
  latestCacheValue.current = { chunks, player, map };

  useEffect(() => () => {
    const latest = latestCacheValue.current;
    if (latest.map) {
      cacheWorldMap(cacheKey, {
        chunks: latest.chunks,
        player: latest.player,
        image: latest.map,
      });
    }
  }, [cacheKey]);
  const selectedEntity = entities.find((entity) => entity.id === selectedEntityId);
  const selectDestination = useCallback((x: number, z: number, radius: number) => {
    const entity = entitiesRef.current.find((candidate) => Math.hypot(candidate.x - x, candidate.z - z) <= radius);
    if (entity) {
      setSelectedEntityId(entity.id);
      setSelected(null);
      return;
    }
    setSelectedEntityId(null);
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const y = getWorldTileHeight(latestCacheValue.current.chunks, blockX, blockZ);
    setSelected({ x: blockX, y, z: blockZ });
  }, []);

  if (loading && !map) {
    return (
      <Card style={styles.stateCard}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Txt variant="heading">Loading world map</Txt>
        <Txt variant="muted" style={styles.centered}>Reading nearby chunks from {bot.username}…</Txt>
      </Card>
    );
  }

  if (!map) {
    return (
      <Card style={styles.stateCard}>
        <Ionicons name={error ? "warning-outline" : "map-outline"} size={42} color={error ? colors.warning : colors.textFaint} />
        <Txt variant="heading">{error ? "Map unavailable" : "No chunks loaded"}</Txt>
        <Txt variant="muted" style={styles.centered}>{error || "Move the bot into the world, then try again."}</Txt>
        <Button title="Try again" variant="secondary" onPress={() => void load()} />
      </Card>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <View style={styles.titleGroup}>
          <Txt variant="heading">World map</Txt>
        </View>
        <Badge label={`${map.chunkCount} chunks`} />
        <MapIconButton
          accessibilityLabel="Focus map on player"
          icon="locate-outline"
          onPress={() => setFocusRequest((request) => request + 1)}
        />
        <MapIconButton
          accessibilityLabel="Refresh world map"
          icon="refresh"
          loading={refreshing || loading}
          onPress={() => void load(true)}
        />
      </View>

      <View style={styles.entityToggle}>
        <Txt variant="label">Entities</Txt>
        <Switch
          accessibilityLabel="Show entities"
          value={entitiesEnabled}
          onValueChange={setEntitiesEnabled}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <WorldMapViewport
        map={map}
        player={player}
        movement={movement}
        moving={moving}
        jumping={jumping}
        entities={entities}
        selected={selected}
        focusRequest={focusRequest}
        onSelect={selectDestination}
      />

      {selected ? (
        <View style={styles.destinationBar}>
          <View style={styles.titleGroup}>
            <Txt variant="label">Selected destination</Txt>
            <Txt>X {selected.x} · {selected.y !== undefined ? `Y ${selected.y} · ` : ""}Z {selected.z}</Txt>
          </View>
          <Button
            title="Walk here"
            disabled={disabled}
            onPress={() => {
              void client.botAction(bot, "startPathFinder", [{ x: selected.x, z: selected.z }]);
              setSelected(null);
            }}
          />
        </View>
      ) : null}
      {selectedEntity && entitiesEnabled ? (
        <View style={styles.destinationBar}>
          <View style={styles.titleGroup}>
            <Txt variant="label">{selectedEntity.name}</Txt>
            <Txt variant="muted">{selectedEntity.kind === "player" ? "Player" : "Mob"} · X {selectedEntity.x} · {selectedEntity.y === null ? "" : `Y ${selectedEntity.y} · `}Z {selectedEntity.z}</Txt>
          </View>
          <MapIconButton accessibilityLabel="Close entity details" icon="close" onPress={() => setSelectedEntityId(null)} />
        </View>
      ) : null}
    </View>
  );
}

function WorldMapViewport({
  map,
  player,
  movement,
  moving,
  jumping,
  entities,
  selected,
  focusRequest,
  onSelect,
}: {
  map: WorldMapImage;
  player: WorldPosition;
  movement: MapMovement;
  moving: boolean;
  jumping: boolean;
  entities: MapEntity[];
  selected: WorldPosition | null;
  focusRequest: number;
  onSelect: (x: number, z: number, radius: number) => void;
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentWidthVal = useSharedValue(0);
  const contentHeightVal = useSharedValue(0);

  const scale = useSharedValue(DEFAULT_MAP_SCALE);
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const dragStartCamX = useSharedValue(0);
  const dragStartCamY = useSharedValue(0);
  const pinchStartScale = useSharedValue(DEFAULT_MAP_SCALE);
  const focalContentX = useSharedValue(0);
  const focalContentY = useSharedValue(0);

  const previousLayout = useRef<{
    minX: number;
    minZ: number;
    viewportWidth: number;
    viewportHeight: number;
    focusRequest: number;
  } | null>(null);

  const contentWidth = map.bounds.width * BLOCK_SIZE;
  const contentHeight = map.bounds.height * BLOCK_SIZE;

  const imageSource = useMemo(() => ({ uri: map.uri }), [map.uri]);

  useEffect(() => {
    contentWidthVal.value = contentWidth;
    contentHeightVal.value = contentHeight;
    viewportWidth.value = viewport.width;
    viewportHeight.value = viewport.height;
  }, [contentHeight, contentHeightVal, contentWidth, contentWidthVal, viewport.height, viewport.width, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (!viewport.width || !viewport.height) return;
    const previous = previousLayout.current;
    const isInitial = !previous;
    const isExplicitFocus = previous && previous.focusRequest !== focusRequest;

    if (isInitial || isExplicitFocus) {
      const playerPoint = worldToMapPoint(map.bounds, player, BLOCK_SIZE);
      const targetX = clampCamera(playerPoint.x, contentWidth, viewport.width, scale.value, MAP_EDGE_REVEAL);
      const targetY = clampCamera(playerPoint.y, contentHeight, viewport.height, scale.value, MAP_EDGE_REVEAL);
      if (isExplicitFocus) {
        camX.value = withTiming(targetX, { duration: 250 });
        camY.value = withTiming(targetY, { duration: 250 });
      } else {
        camX.value = targetX;
        camY.value = targetY;
      }
    } else {
      const deltaX = (previous.minX - map.bounds.minX) * BLOCK_SIZE;
      const deltaZ = (previous.minZ - map.bounds.minZ) * BLOCK_SIZE;
      camX.value = clampCamera(camX.value + deltaX, contentWidth, viewport.width, scale.value, MAP_EDGE_REVEAL);
      camY.value = clampCamera(camY.value + deltaZ, contentHeight, viewport.height, scale.value, MAP_EDGE_REVEAL);
    }

    previousLayout.current = {
      minX: map.bounds.minX,
      minZ: map.bounds.minZ,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      focusRequest,
    };
  }, [contentHeight, contentWidth, focusRequest, map.bounds.minX, map.bounds.minZ, player.x, player.z, viewport.height, viewport.width]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .maxPointers(1)
        .onBegin(() => {
          dragStartCamX.value = camX.value;
          dragStartCamY.value = camY.value;
        })
        .onUpdate((event) => {
          const nextCamX = dragStartCamX.value - event.translationX / scale.value;
          const nextCamY = dragStartCamY.value - event.translationY / scale.value;
          camX.value = clampCamera(nextCamX, contentWidthVal.value, viewportWidth.value, scale.value, MAP_EDGE_REVEAL);
          camY.value = clampCamera(nextCamY, contentHeightVal.value, viewportHeight.value, scale.value, MAP_EDGE_REVEAL);
        }),
    [camX, camY, contentHeightVal, contentWidthVal, dragStartCamX, dragStartCamY, scale, viewportHeight, viewportWidth],
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((event) => {
          pinchStartScale.value = scale.value;
          focalContentX.value = camX.value + (event.focalX - viewportWidth.value / 2) / scale.value;
          focalContentY.value = camY.value + (event.focalY - viewportHeight.value / 2) / scale.value;
        })
        .onUpdate((event) => {
          const targetScale = Math.max(
            MIN_MAP_SCALE,
            Math.min(MAX_MAP_SCALE, pinchStartScale.value * event.scale),
          );
          scale.value = targetScale;
          const nextCamX = focalContentX.value - (event.focalX - viewportWidth.value / 2) / targetScale;
          const nextCamY = focalContentY.value - (event.focalY - viewportHeight.value / 2) / targetScale;
          camX.value = clampCamera(nextCamX, contentWidthVal.value, viewportWidth.value, targetScale, MAP_EDGE_REVEAL);
          camY.value = clampCamera(nextCamY, contentHeightVal.value, viewportHeight.value, targetScale, MAP_EDGE_REVEAL);
        }),
    [camX, camY, contentHeightVal, contentWidthVal, focalContentX, focalContentY, pinchStartScale, scale, viewportHeight, viewportWidth],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((event, success) => {
        if (!success) return;
        const world = screenToWorldPosition(
          { x: event.x, y: event.y },
          { x: camX.value, y: camY.value },
          scale.value,
          { width: viewportWidth.value, height: viewportHeight.value },
          map.bounds,
          BLOCK_SIZE,
        );
        if (
          world.x < map.bounds.minX ||
          world.x >= map.bounds.minX + map.bounds.width ||
          world.z < map.bounds.minZ ||
          world.z >= map.bounds.minZ + map.bounds.height
        ) {
          return;
        }
        const x = map.bounds.minX + (camX.value + (event.x - viewportWidth.value / 2) / scale.value) / BLOCK_SIZE;
        const z = map.bounds.minZ + (camY.value + (event.y - viewportHeight.value / 2) / scale.value) / BLOCK_SIZE;
        runOnJS(onSelect)(x, z, 12 / (BLOCK_SIZE * scale.value));
      }),
    [camX, camY, map.bounds, onSelect, scale, viewportHeight, viewportWidth],
  );

  const gesture = useMemo(
    () => Gesture.Exclusive(Gesture.Simultaneous(pan, pinch), tap),
    [pan, pinch, tap],
  );

  const mapStyle = useAnimatedStyle(() => {
    const transform = calculateMapTransform(
      camX.value,
      camY.value,
      scale.value,
      contentWidthVal.value,
      contentHeightVal.value,
      viewportWidth.value,
      viewportHeight.value,
    );
    return {
      transform: [
        { translateX: transform.translateX },
        { translateY: transform.translateY },
        { scale: transform.scale },
      ],
    };
  });

  const zoomTo = useCallback((targetScale: number) => {
    const clampedScale = Math.max(MIN_MAP_SCALE, Math.min(MAX_MAP_SCALE, targetScale));
    scale.value = withTiming(clampedScale, { duration: 180 });
    const nextCamX = clampCamera(camX.value, contentWidth, viewport.width, clampedScale, MAP_EDGE_REVEAL);
    const nextCamY = clampCamera(camY.value, contentHeight, viewport.height, clampedScale, MAP_EDGE_REVEAL);
    camX.value = withTiming(nextCamX, { duration: 180 });
    camY.value = withTiming(nextCamY, { duration: 180 });
  }, [camX, camY, contentHeight, contentWidth, scale, viewport.height, viewport.width]);

  const handleZoomIn = useCallback(() => {
    zoomTo(Number((scale.value * MAP_ZOOM_STEP).toFixed(2)));
  }, [scale, zoomTo]);

  const handleZoomOut = useCallback(() => {
    zoomTo(Number((scale.value / MAP_ZOOM_STEP).toFixed(2)));
  }, [scale, zoomTo]);

  const handleZoomReset = useCallback(() => {
    zoomTo(DEFAULT_MAP_SCALE);
  }, [zoomTo]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  return (
    <View
      accessible
      accessibilityRole="imagebutton"
      accessibilityLabel="Minecraft world map. Drag or pinch to explore, or tap to choose a destination."
      onLayout={onLayout}
      style={styles.mapFrame}
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="none"
            style={[styles.mapContent, { width: contentWidth, height: contentHeight }, mapStyle]}
          >
            <Image
              source={imageSource}
              cachePolicy="memory"
              contentFit="fill"
              priority="high"
              style={StyleSheet.absoluteFill}
            />
            {entities.map((entity) => {
              const point = worldToMapPoint(map.bounds, entity, BLOCK_SIZE);
              return (
                <View
                  key={entity.id}
                  style={[
                    styles.entityMarker,
                    { left: point.x, top: point.y, backgroundColor: entity.kind === "player" ? colors.primary : colors.warning },
                  ]}
                />
              );
            })}
            <PlayerMapMarker
              scale={scale}
              movement={movement}
              moving={moving}
              jumping={jumping}
              {...worldToMapPoint(map.bounds, player, BLOCK_SIZE)}
            />
            {selected ? (
              <MapMarker
                scale={scale}
                {...worldToMapPoint(
                  map.bounds,
                  { x: selected.x + 0.5, z: selected.z + 0.5 },
                  BLOCK_SIZE,
                )}
              />
            ) : null}
          </Animated.View>
        </View>
      </GestureDetector>

      <View pointerEvents="none" style={styles.coordinates}>
        <Txt variant="faint" style={styles.coordinateText}>X {Math.floor(player.x)} · {player.y !== undefined ? `Y ${Math.floor(player.y)} · ` : ""}Z {Math.floor(player.z)}</Txt>
      </View>

      <View style={styles.zoomControls}>
        <Pressable
          accessibilityLabel="Zoom in on map"
          accessibilityRole="button"
          onPress={handleZoomIn}
          style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed]}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityLabel="Reset map zoom"
          accessibilityRole="button"
          onPress={handleZoomReset}
          style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed]}
        >
          <Ionicons name="contract-outline" size={16} color={colors.textMuted} />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          accessibilityLabel="Zoom out on map"
          accessibilityRole="button"
          onPress={handleZoomOut}
          style={({ pressed }) => [styles.zoomButton, pressed && styles.zoomButtonPressed]}
        >
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function MapIconButton({
  accessibilityLabel,
  icon,
  loading = false,
  onPress,
}: {
  accessibilityLabel: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, (pressed || loading) && styles.iconButtonPressed]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : <Ionicons name={icon} size={20} color={colors.text} />}
    </Pressable>
  );
}

function MapMarker({
  x,
  y,
  scale,
}: {
  x: number;
  y: number;
  scale: SharedValue<number>;
}) {
  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.destination,
        { left: x, top: y },
        markerStyle,
      ]}
    >
    </Animated.View>
  );
}

function PlayerMapMarker({ x, y, scale, movement, moving, jumping }: {
  x: number;
  y: number;
  scale: SharedValue<number>;
  movement: MapMovement;
  moving: boolean;
  jumping: boolean;
}) {
  const stride = useSharedValue(0);
  const isJumping = jumping || movement.jump;
  const walking = moving || Boolean(movement.forward || movement.back || movement.left || movement.right || movement.isPathfinding);

  useEffect(() => {
    cancelAnimation(stride);
    if (walking) {
      stride.value = -1;
      stride.value = withRepeat(withTiming(1, { duration: movement.sprint ? 120 : 180 }), -1, true);
    } else {
      stride.value = 0;
    }
    return () => cancelAnimation(stride);
  }, [walking, movement.sprint, stride]);

  const markerStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.value }] }));
  const leftLegStyle = useAnimatedStyle(() => ({ transform: [{ translateY: stride.value * 3 }] }));
  const rightLegStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -stride.value * 3 }] }));
  const leftArmStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -stride.value * 3.2 }] }));
  const rightArmStyle = useAnimatedStyle(() => ({ transform: [{ translateY: stride.value * 3.2 }] }));

  return (
    <Animated.View style={[styles.avatarAnchor, { left: x, top: y }, markerStyle]}>
      {/* 3D ground drop shadow */}
      <View style={styles.avatarShadow} />
      {/* 3D top-down Steve avatar */}
      <View style={[styles.avatarSprite, { transform: [{ translateY: isJumping ? -6 : 0 }, { rotate: `${-movement.yaw || 0}rad` }] }]}>
        <Animated.View style={[styles.avatarLeftLeg, leftLegStyle]} />
        <Animated.View style={[styles.avatarRightLeg, rightLegStyle]} />
        <View style={styles.avatarLegShadow} />
        <View style={[styles.avatarBody, movement.sneak && styles.avatarSneak]} />
        <View style={styles.avatarCollar} />
        <Animated.View style={[styles.avatarLeftArm, leftArmStyle]} />
        <Animated.View style={[styles.avatarRightArm, rightArmStyle]} />
        <View style={styles.avatarHeadShadow} />
        <View style={styles.avatarHead} />
        <View style={styles.avatarHairHighlight} />
        <View style={styles.avatarSkin} />
        <View style={styles.avatarLeftEye} />
        <View style={styles.avatarRightEye} />
        <View style={styles.avatarNose} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  toolbar: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  entityToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleGroup: { flex: 1 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.surfaceAlt },
  iconButtonPressed: { opacity: 0.55 },
  stateCard: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  centered: { textAlign: "center", maxWidth: 280 },
  mapFrame: { height: 360, overflow: "hidden", borderRadius: radii.lg, backgroundColor: "#08090a", borderWidth: 1, borderColor: colors.border },
  mapContent: { position: "absolute", left: 0, top: 0 },
  coordinates: { position: "absolute", left: spacing.sm, bottom: spacing.sm, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radii.sm, backgroundColor: colors.overlay },
  coordinateText: { color: "#fff", fontVariant: ["tabular-nums"] },
  zoomControls: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  zoomButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonPressed: {
    backgroundColor: colors.surfaceHover,
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  destination: { position: "absolute", width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: 8, borderWidth: 3, borderColor: palette.white, backgroundColor: colors.primary },
  entityMarker: { position: "absolute", width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: 4, borderWidth: 1, borderColor: colors.primaryOn },
  avatarAnchor: { position: "absolute", width: 18, height: 18, marginLeft: -9, marginTop: -9 },
  avatarShadow: { position: "absolute", left: 1.5, top: 4, width: 15, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.38)" },
  avatarSprite: { width: 18, height: 18 },
  // 3D Top-down Steve avatar
  avatarLeftLeg: { position: "absolute", left: 4.5, top: 6, width: 4, height: 4, backgroundColor: "#27234b", borderTopWidth: 2, borderTopColor: "#39373c" },
  avatarRightLeg: { position: "absolute", left: 9.5, top: 6, width: 4, height: 4, backgroundColor: "#27234b", borderTopWidth: 2, borderTopColor: "#39373c" },
  avatarLegShadow: { position: "absolute", left: 4.5, top: 6, width: 9, height: 4, backgroundColor: "rgba(0,0,0,0.28)" },
  avatarBody: { position: "absolute", left: 4.5, top: 6, width: 9, height: 4, backgroundColor: "#15979b", borderTopWidth: 1, borderTopColor: "#22b4ba", borderBottomWidth: 1, borderBottomColor: "#0c6f73" },
  avatarSneak: { transform: [{ translateY: -2 }] },
  avatarCollar: { position: "absolute", left: 7.5, top: 6, width: 3, height: 1.5, backgroundColor: "#b67d59" },
  avatarLeftArm: { position: "absolute", left: 0.5, top: 6, width: 4, height: 4, backgroundColor: "#b67d59", borderTopWidth: 2.5, borderTopColor: "#15979b" },
  avatarRightArm: { position: "absolute", left: 13.5, top: 6, width: 4, height: 4, backgroundColor: "#b67d59", borderTopWidth: 2.5, borderTopColor: "#15979b" },
  avatarHeadShadow: { position: "absolute", left: 5, top: 8.5, width: 8, height: 3, backgroundColor: "rgba(0,0,0,0.32)" },
  avatarHead: { position: "absolute", left: 5, top: 3.5, width: 8, height: 7.5, backgroundColor: "#4a321e", borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.22)", borderRightWidth: 1, borderRightColor: "rgba(0,0,0,0.32)" },
  avatarHairHighlight: { position: "absolute", left: 6, top: 4.5, width: 3, height: 2, backgroundColor: "#5c3d25" },
  avatarSkin: { position: "absolute", left: 6.5, top: 2.5, width: 5, height: 1.2, backgroundColor: "#b67d59" },
  avatarLeftEye: { position: "absolute", left: 6, top: 2, width: 1.8, height: 0.9, backgroundColor: "#385a8c", borderLeftWidth: 1, borderLeftColor: "#f5f5f5" },
  avatarRightEye: { position: "absolute", left: 10.2, top: 2, width: 1.8, height: 0.9, backgroundColor: "#385a8c", borderRightWidth: 1, borderRightColor: "#f5f5f5" },
  avatarNose: { position: "absolute", left: 8.3, top: 2.3, width: 1.4, height: 0.6, backgroundColor: "#65402e" },
  destinationBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface },
});

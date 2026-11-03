import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MCAvatar } from '../MCAvatar';
import { colors, radii, spacing } from '../../theme/theme';

/** Full-body skin render on a tinted stage, falling back to the head avatar. */
export function PlayerSkin({ username, uri }: { username: string; uri?: string }) {
  const [failed, setFailed] = React.useState(false);
  const source = uri ?? `https://crafthead.net/armor/body/${encodeURIComponent(username)}`;

  React.useEffect(() => setFailed(false), [source]);

  return (
    <View style={styles.stage}>
      {!failed ? (
        <Image
          source={{ uri: source }}
          style={styles.skinImage}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <MCAvatar username={username} size={84} radius={radii.lg} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    minHeight: 180,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  skinImage: {
    width: 140,
    height: 170,
  },
  avatarFallback: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

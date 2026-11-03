import { StyleSheet } from "react-native";
import { colors, radii } from "../../theme/theme";

export const { triggerInputStyle } = StyleSheet.create({
  triggerInputStyle: {
    minHeight: 46,
    color: colors.text,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
});

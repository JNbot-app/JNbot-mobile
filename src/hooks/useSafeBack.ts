import { useCallback } from "react";
import { useRouter, type Href } from "expo-router";
import { useNavigation } from "@react-navigation/native";

export function useSafeBack(fallback: Href = "/(app)/dashboard") {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace(fallback);
    }
  }, [fallback, navigation, router]);
}


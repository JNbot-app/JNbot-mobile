import { useCallback, useState } from "react";
import { useFeedback } from "../components/AppFeedback";

export function useAsyncAction() {
  const { showMessage } = useFeedback();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(action: () => Promise<T>, successMessage?: string) => {
      if (busy) return undefined;
      setBusy(true);
      try {
        const result = await action();
        if (successMessage) showMessage(successMessage, "success");
        return result;
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "The action could not be completed.",
          "error",
        );
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [busy, showMessage],
  );
  return { busy, run };
}

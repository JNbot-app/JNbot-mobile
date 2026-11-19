import { useCallback, useRef, useState } from 'react';

const GROUP_MS = 800;
const MAX_STEPS = 200;

/**
 * Text with an undo history. Quick successive edits are grouped into one step,
 * like typing a word; `group: false` (pasted keys, AI rewrites) always starts a step.
 */
export function useUndoableText(initial = '') {
  const [text, setText] = useState(initial);
  const current = useRef(initial);
  const past = useRef<string[]>([]);
  const lastEdit = useRef(0);

  const commit = useCallback((next: string) => {
    current.current = next;
    setText(next);
  }, []);

  const change = useCallback((next: string, group = true) => {
    if (next === current.current) return;
    const now = Date.now();
    if (!group || now - lastEdit.current > GROUP_MS) {
      past.current = [...past.current.slice(1 - MAX_STEPS), current.current];
    }
    lastEdit.current = group ? now : 0;
    commit(next);
  }, [commit]);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    lastEdit.current = 0;
    if (previous !== undefined) commit(previous);
  }, [commit]);

  /** Starts a fresh history, after loading or saving. */
  const reset = useCallback((next: string) => {
    past.current = [];
    lastEdit.current = 0;
    commit(next);
  }, [commit]);

  return { text, change, undo, reset, canUndo: past.current.length > 0 };
}

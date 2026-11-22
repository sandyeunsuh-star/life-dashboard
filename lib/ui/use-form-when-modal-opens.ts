"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `sync` when `open` becomes true or when `entityKey` changes while open.
 * Does not re-run when unrelated parent props change during an open session.
 */
export function useFormWhenModalOpens(
  open: boolean,
  entityKey: string | undefined,
  sync: () => void,
): void {
  const wasOpenRef = useRef(false);
  const lastEntityKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const justOpened = !wasOpenRef.current;
    const entityChanged = entityKey !== lastEntityKeyRef.current;
    wasOpenRef.current = true;
    lastEntityKeyRef.current = entityKey;

    if (justOpened || entityChanged) {
      sync();
    }
  }, [open, entityKey, sync]);
}
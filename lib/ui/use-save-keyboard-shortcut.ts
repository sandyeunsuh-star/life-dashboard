"use client";

import { useEffect, useRef } from "react";

export function useSaveKeyboardShortcut(
  enabled: boolean,
  disabled: boolean,
  onSave: () => void,
): void {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "s") return;

      event.preventDefault();
      event.stopPropagation();

      if (disabled) return;

      onSaveRef.current();
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [enabled, disabled]);
}
"use client";

import type { FormEvent } from "react";
import { useEffect, useRef } from "react";

/** Same path as clicking Save — bypasses `requestSubmit()` / disabled submit button quirks. */
export function invokeFormSubmitHandler<E extends HTMLElement = HTMLElement>(
  handler: (event: FormEvent<E>) => void | Promise<void>,
): void {
  void handler({
    preventDefault: () => {},
    stopPropagation: () => {},
  } as FormEvent<E>);
}

function isModSaveKey(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey)) return false;
  if (event.key.toLowerCase() === "s") return true;
  if (event.key === "Enter") return true;
  return false;
}

/**
 * ⌘S / Ctrl+S and ⌘↵ / Ctrl+↵ while a modal is open — capture on `window` so the
 * browser never opens Save Page before our handler runs.
 */
export function useSaveKeyboardShortcut(
  enabled: boolean,
  disabled: boolean,
  onSave: () => void,
): void {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!isModSaveKey(event)) return;

      event.preventDefault();
      event.stopPropagation();

      if (disabledRef.current) return;

      onSaveRef.current();
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [enabled]);
}
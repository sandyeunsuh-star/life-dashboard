"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getModKeySnapshot(): string {
  if (typeof navigator === "undefined") return "⌘";
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? "⌘" : "Ctrl+";
}

function getServerSnapshot(): string {
  return "⌘";
}

export function SaveShortcutHint() {
  const mod = useSyncExternalStore(
    subscribe,
    getModKeySnapshot,
    getServerSnapshot,
  );

  return (
    <span className="ml-1.5 text-[10px] font-normal text-white/55" aria-hidden>
      {mod}S · {mod}↵
    </span>
  );
}
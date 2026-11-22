"use client";

import { X } from "lucide-react";

type TagPillProps = {
  tag: string;
  active?: boolean;
  onClick?: (tag: string) => void;
  onRemove?: (tag: string) => void;
  size?: "sm" | "md";
};

export function TagPill({
  tag,
  active = false,
  onClick,
  onRemove,
  size = "sm",
}: TagPillProps) {
  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs"
      : "px-2 py-0.5 text-[10px]";

  const base = `inline-flex max-w-full items-center gap-1 rounded-full font-medium text-zinc-900 transition ${sizeClass}`;

  if (onRemove && !onClick) {
    return (
      <span
        className={`${base} ${
          active
            ? "border border-zinc-900 bg-zinc-900 text-white"
            : "border border-zinc-300 bg-zinc-50"
        }`}
      >
        <span className="truncate">{tag}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className={`rounded-full p-0.5 ${
            active
              ? "text-white hover:bg-zinc-800"
              : "text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
          }`}
          aria-label={`Remove tag ${tag}`}
        >
          <X className="size-3" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(tag);
      }}
      className={`${base} ${
        active
          ? "border border-zinc-900 bg-zinc-900 text-white"
          : "border border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
      }`}
    >
      <span className="truncate">{tag}</span>
      {active && onRemove ? (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="rounded-full p-0.5 hover:bg-zinc-800"
        >
          <X className="size-3" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}
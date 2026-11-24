"use client";

import type { TidyIconKey } from "@/lib/tidy/constants";
import { TIDY_ICON_OPTIONS } from "@/lib/tidy/constants";

type IconPickerProps = {
  value: TidyIconKey | string;
  onChange: (key: TidyIconKey) => void;
};

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
      {TIDY_ICON_OPTIONS.map((option) => {
        const selected = option.key === value;
        const Icon = option.icon;
        return (
          <button
            key={option.key}
            type="button"
            title={option.label}
            onClick={() => onChange(option.key)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
              selected
                ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/15"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <span
              className={`flex size-9 items-center justify-center rounded-lg ${option.tint}`}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="line-clamp-1 text-[10px] font-medium text-zinc-600">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
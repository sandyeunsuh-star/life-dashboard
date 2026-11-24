"use client";

import { TIDY_BUNDLE_PRESETS } from "@/lib/tidy/constants";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type BundleTagPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function BundleTagPicker({ value, onChange }: BundleTagPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className={formLabelClass}>Temptation bundle (optional)</span>
      <div className="flex flex-wrap gap-2">
        {TIDY_BUNDLE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(value === preset ? "" : preset)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              value === preset
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Custom bundle…"
        className={formInputMdClass}
      />
    </div>
  );
}
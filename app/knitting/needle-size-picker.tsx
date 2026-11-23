"use client";

import { useMemo } from "react";

import {
  parseNeedleSizeField,
  serializeNeedleSize,
  STANDARD_NEEDLE_SIZES,
} from "@/lib/knitting/needle-sizes";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type NeedleSizePickerProps = {
  value: string;
  onChange: (serialized: string) => void;
  id?: string;
};

export function NeedleSizePicker({ value, onChange, id }: NeedleSizePickerProps) {
  const { selected, legacy } = useMemo(
    () => parseNeedleSizeField(value),
    [value],
  );

  function commit(nextSelected: string[], nextLegacy: string) {
    onChange(serializeNeedleSize(nextSelected, nextLegacy));
  }

  function addSize(size: string) {
    if (!size || selected.includes(size)) return;
    commit([...selected, size], legacy);
  }

  function removeSize(size: string) {
    commit(
      selected.filter((s) => s !== size),
      legacy,
    );
  }

  const available = STANDARD_NEEDLE_SIZES.filter((s) => !selected.includes(s));

  return (
    <div className="flex flex-col gap-2">
      <span className={formLabelClass} id={id ? `${id}-label` : undefined}>
        Needle size
      </span>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((size) => (
            <span
              key={size}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-zinc-800"
            >
              {size}
              <button
                type="button"
                onClick={() => removeSize(size)}
                className="inline-flex size-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900"
                aria-label={`Remove ${size}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <select
        value=""
        onChange={(e) => {
          addSize(e.target.value);
        }}
        className={formInputMdClass}
        aria-labelledby={id ? `${id}-label` : undefined}
      >
        <option value="" disabled>
          Add needle size…
        </option>
        {available.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={legacy}
        onChange={(e) => commit(selected, e.target.value)}
        className={formInputMdClass}
        placeholder="Custom sizes (optional), e.g. legacy free-text"
      />
    </div>
  );
}
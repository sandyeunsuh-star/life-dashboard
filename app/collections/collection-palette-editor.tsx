"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useId, useState } from "react";

import {
  contrastTextOnHex,
  dedupePalette,
  hexDisplayCode,
  normalizeHexColor,
  parseHexColorsFromText,
} from "@/lib/supabase/metadata/palette";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type CollectionPaletteEditorProps = {
  value: string[];
  onChange: (palette: string[]) => void;
  idPrefix?: string;
};

function movePaletteColor(colors: string[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= colors.length) return colors;
  const next = [...colors];
  const temp = next[index]!;
  next[index] = next[target]!;
  next[target] = temp;
  return next;
}

export function CollectionPaletteEditor({
  value,
  onChange,
  idPrefix = "palette",
}: CollectionPaletteEditorProps) {
  const hexInputId = useId();
  const [draft, setDraft] = useState("");
  const [picker, setPicker] = useState("#000000");

  function appendColors(candidates: string[]) {
    const next = dedupePalette([...value, ...candidates]);
    onChange(next);
  }

  function addFromDraft() {
    const parsed = parseHexColorsFromText(draft);
    if (parsed.length === 0) {
      const single = normalizeHexColor(draft);
      if (single) appendColors([single]);
    } else {
      appendColors(parsed);
    }
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
      <div>
        <p className={formLabelClass}>Color palette</p>
        <p className="mt-0.5 text-xs text-zinc-600">
          Add HEX codes (`#CDEBED` or `cdebed`). Paste multiple values separated by spaces or commas.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <label htmlFor={hexInputId} className="sr-only">
            HEX color
          </label>
          <input
            id={hexInputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFromDraft();
              }
            }}
            placeholder="#CDEBED"
            className={formInputMdClass}
          />
        </div>

        <label
          htmlFor={`${idPrefix}-color-picker`}
          className="flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
        >
          <span className="text-xs font-medium">Pick</span>
          <input
            id={`${idPrefix}-color-picker`}
            type="color"
            value={picker}
            onChange={(e) => setPicker(e.target.value)}
            className="size-8 cursor-pointer border-0 bg-transparent p-0"
            aria-label="Pick color visually"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            const fromPicker = normalizeHexColor(picker);
            if (fromPicker) appendColors([fromPicker]);
          }}
          className="h-11 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Add pick
        </button>

        <button
          type="button"
          onClick={addFromDraft}
          className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add
        </button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-900">Preview</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {value.map((hex, index) => (
              <li
                key={`${hex}-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2"
              >
                <div
                  className="relative h-14 w-full overflow-hidden rounded-md"
                  style={{ backgroundColor: hex }}
                >
                  <span
                    className="absolute inset-x-0 bottom-1 text-center font-mono text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: contrastTextOnHex(hex) }}
                  >
                    {hexDisplayCode(hex)}
                  </span>
                </div>

                <span className="truncate font-mono text-xs font-medium text-zinc-900">
                  {hex}
                </span>

                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onChange(movePaletteColor(value, index, -1))}
                    className="rounded-lg border border-zinc-300 p-1.5 text-zinc-900 disabled:opacity-40"
                    aria-label="Move left"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === value.length - 1}
                    onClick={() => onChange(movePaletteColor(value, index, 1))}
                    className="rounded-lg border border-zinc-300 p-1.5 text-zinc-900 disabled:opacity-40"
                    aria-label="Move right"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(value.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="rounded-lg border border-zinc-300 p-1.5 text-zinc-900 hover:bg-zinc-50"
                    aria-label={`Remove ${hex}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
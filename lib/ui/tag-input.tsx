"use client";

import { useId, useMemo, useRef, useState } from "react";

import { dedupeTrimmedStrings } from "@/lib/supabase/dedupe-strings";
import {
  hasTagCaseInsensitive,
  type TagSuggestion,
} from "@/lib/supabase/items/tag-suggestions";
import { formLabelClass } from "@/lib/ui/form-styles";
import { TagPill } from "@/lib/ui/tag-pill";

type TagInputProps = {
  id?: string;
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: TagSuggestion[];
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
};

function commitDraft(
  value: string[],
  onChange: (tags: string[]) => void,
  draft: string,
) {
  const parts = draft
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return;
  onChange(dedupeTrimmedStrings([...value, ...parts]));
}

export function TagInput({
  id: idProp,
  label,
  value,
  onChange,
  suggestions = [],
  disabled = false,
  placeholder = "Type a tag and press Enter…",
  helperText,
}: TagInputProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-autocomplete`;
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const autocomplete = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return suggestions
      .filter(
        (s) =>
          s.tag.toLowerCase().includes(q) &&
          !hasTagCaseInsensitive(value, s.tag),
      )
      .slice(0, 8);
  }, [draft, suggestions, value]);

  const quickSuggestions = useMemo(() => {
    return suggestions
      .filter((s) => !hasTagCaseInsensitive(value, s.tag))
      .slice(0, 10);
  }, [suggestions, value]);

  function addTag(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (hasTagCaseInsensitive(value, trimmed)) {
      setDraft("");
      return;
    }
    onChange(dedupeTrimmedStrings([...value, trimmed]));
    setDraft("");
    setMenuOpen(false);
  }

  function removeTag(tag: string) {
    const lower = tag.toLowerCase();
    onChange(value.filter((t) => t.toLowerCase() !== lower));
  }

  function removeLastTag() {
    if (value.length === 0) return;
    onChange(value.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className={formLabelClass}>
          {label}
        </label>
      ) : null}

      <div
        className={`relative rounded-lg border border-zinc-300 bg-white px-2 py-2 text-zinc-900 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400 ${
          disabled ? "opacity-60" : ""
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((tag, index) => (
            <TagPill
              key={`${tag}-${index}`}
              tag={tag}
              size="md"
              onRemove={disabled ? undefined : removeTag}
            />
          ))}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            disabled={disabled}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setMenuOpen(true);
            }}
            onFocus={() => setMenuOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setMenuOpen(false), 120);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                if (draft.trim()) {
                  commitDraft(value, onChange, draft);
                  setDraft("");
                }
                return;
              }
              if (e.key === "Backspace" && !draft) {
                e.preventDefault();
                removeLastTag();
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            role="combobox"
            aria-expanded={menuOpen && autocomplete.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
        </div>

        {menuOpen && autocomplete.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {autocomplete.map((entry) => (
              <li key={entry.tag.toLowerCase()} role="presentation">
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(entry.tag)}
                >
                  <span>{entry.tag}</span>
                  <span className="text-xs text-zinc-600">{entry.count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {quickSuggestions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-700">
            Suggested / Recent tags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickSuggestions.map((entry) => (
              <button
                key={entry.tag.toLowerCase()}
                type="button"
                disabled={disabled}
                onClick={() => addTag(entry.tag)}
                className="rounded-full border border-dashed border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-900 hover:border-zinc-400 hover:bg-white disabled:opacity-60"
              >
                {entry.tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {helperText ? (
        <p className="text-xs text-zinc-600">{helperText}</p>
      ) : null}
    </div>
  );
}
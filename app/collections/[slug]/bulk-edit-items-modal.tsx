"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { createBrowserClientInstance } from "@/lib/supabase/client";
import { dedupeTrimmedStrings } from "@/lib/supabase/dedupe-strings";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  ADD_NEW_OPTION,
  DEFAULT_ITEM_TYPES,
  METADATA_SEASONS,
  METADATA_YEARS,
} from "@/lib/supabase/metadata/constants";
import { buildPublished } from "@/lib/supabase/metadata/schema";
import {
  getMetadataSuggestionsFromItems,
  getMetadataSuggestionsFromMetadataRecords,
  mergeMetadataSuggestions,
  type ItemMetadataSuggestions,
} from "@/lib/supabase/metadata/suggestions";
import { listUserCollectionMetadataRecords } from "@/lib/supabase/queries/collections";
import {
  bulkUpdateCollectionItems,
  listUserItemMetadataRecords,
} from "@/lib/supabase/queries/items";
import type { Item } from "@/lib/supabase/types/item";
import { TagInput } from "@/lib/ui/tag-input";
import { useTagSuggestions } from "@/lib/ui/use-tag-suggestions";
import { formInputMdClass } from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

function FieldApplyToggle({
  id,
  label,
  checked,
  onChange,
  children,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-zinc-400 text-zinc-900"
        />
        {label}
      </label>
      <div
        className={
          checked ? "" : "pointer-events-none opacity-40"
        }
      >
        {children}
      </div>
    </div>
  );
}

type BulkEditItemsModalProps = {
  open: boolean;
  selectedCount: number;
  selectedIds: string[];
  suggestionItems: Item[];
  onClose: () => void;
  onSaved: (items: Item[]) => void;
};

export function BulkEditItemsModal({
  open,
  selectedCount,
  selectedIds,
  suggestionItems,
  onClose,
  onSaved,
}: BulkEditItemsModalProps) {
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [applyType, setApplyType] = useState(false);
  const [typeValue, setTypeValue] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  const [applyTagsAdd, setApplyTagsAdd] = useState(false);
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);

  const [applyTagsReplace, setApplyTagsReplace] = useState(false);
  const [tagsToReplace, setTagsToReplace] = useState<string[]>([]);
  const tagSuggestions = useTagSuggestions(open, suggestionItems);

  const [applyCompany, setApplyCompany] = useState(false);
  const [companyValue, setCompanyValue] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState("");

  const [applyDesigner, setApplyDesigner] = useState(false);
  const [designerValue, setDesignerValue] = useState("");

  const [applyPublished, setApplyPublished] = useState(false);
  const [publishedSeason, setPublishedSeason] = useState("");
  const [publishedYear, setPublishedYear] = useState("");

  const [extraSuggestions, setExtraSuggestions] =
    useState<ItemMetadataSuggestions | null>(null);

  const suggestions = useMemo(() => {
    const base = getMetadataSuggestionsFromItems(suggestionItems);
    return extraSuggestions
      ? mergeMetadataSuggestions(base, extraSuggestions)
      : base;
  }, [suggestionItems, extraSuggestions]);

  const typeOptions = useMemo(
    () =>
      Array.from(new Set([...DEFAULT_ITEM_TYPES, ...suggestions.types])).sort(),
    [suggestions.types],
  );

  useEffect(() => {
    if (!open) return;

    setApplyType(false);
    setTypeValue("");
    setApplyTagsAdd(false);
    setTagsToAdd([]);
    setApplyTagsReplace(false);
    setTagsToReplace([]);
    setApplyCompany(false);
    setCompanyValue("");
    setApplyDesigner(false);
    setDesignerValue("");
    setApplyPublished(false);
    setPublishedSeason("");
    setPublishedYear("");
    setError(null);
    setLoading(false);

    void (async () => {
      const supabase = createBrowserClientInstance();
      const [collectionsRes, itemsRes] = await Promise.all([
        listUserCollectionMetadataRecords(supabase),
        listUserItemMetadataRecords(supabase),
      ]);
      setExtraSuggestions(
        mergeMetadataSuggestions(
          getMetadataSuggestionsFromMetadataRecords(
            collectionsRes.data ?? [],
          ),
          getMetadataSuggestionsFromMetadataRecords(itemsRes.data ?? []),
        ),
      );
    })();
  }, [open]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (
        !applyType &&
        !applyTagsAdd &&
        !applyTagsReplace &&
        !applyCompany &&
        !applyDesigner &&
        !applyPublished
      ) {
        setError("Turn on at least one field to apply.");
        return;
      }

      setLoading(true);
      setError(null);

      const published = applyPublished
        ? buildPublished(publishedSeason, publishedYear)
        : undefined;

      const supabase = createBrowserClientInstance();
      const { data, error: bulkError } = await bulkUpdateCollectionItems(
        supabase,
        {
          itemIds: selectedIds,
          applyType,
          type: typeValue || newType,
          applyTagsAdd,
          tagsToAdd: dedupeTrimmedStrings(tagsToAdd),
          applyTagsReplace,
          tagsReplace: dedupeTrimmedStrings(tagsToReplace),
          applyCompany,
          company: companyValue || newCompany,
          applyDesigner,
          designer: designerValue,
          applyPublished,
          published,
        },
      );

      setLoading(false);

      if (bulkError) {
        setError(formatSupabaseError(bulkError));
        return;
      }

      onSaved(data ?? []);
      onClose();
    },
    [
      applyCompany,
      applyDesigner,
      applyPublished,
      applyTagsAdd,
      applyTagsReplace,
      applyType,
      companyValue,
      designerValue,
      newCompany,
      newType,
      onClose,
      onSaved,
      publishedSeason,
      publishedYear,
      selectedIds,
      tagsToAdd,
      tagsToReplace,
      typeValue,
    ],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSubmit);
  }, [handleSubmit]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overscroll-contain p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 z-[60] bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[70] flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              Get Info
            </h2>
            <p className="mt-1 text-sm text-zinc-700">
              {selectedCount} item{selectedCount === 1 ? "" : "s"} selected — only checked fields will change.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-700" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="flex flex-col gap-3">
            <FieldApplyToggle
              id="bulk-apply-type"
              label="Type"
              checked={applyType}
              onChange={setApplyType}
            >
              <select
                value={addingType ? ADD_NEW_OPTION : typeValue}
                onChange={(e) => {
                  if (e.target.value === ADD_NEW_OPTION) {
                    setAddingType(true);
                    return;
                  }
                  setAddingType(false);
                  setTypeValue(e.target.value);
                }}
                className={formInputMdClass}
              >
                <option value="">Select type…</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value={ADD_NEW_OPTION}>+ Add new type…</option>
              </select>
              {addingType ? (
                <input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className={`mt-2 ${formInputMdClass}`}
                  placeholder="New type"
                />
              ) : null}
            </FieldApplyToggle>

            <FieldApplyToggle
              id="bulk-apply-tags-add"
              label="Tags to add"
              checked={applyTagsAdd}
              onChange={setApplyTagsAdd}
            >
              <TagInput
                id="bulk-tags-add"
                value={tagsToAdd}
                onChange={setTagsToAdd}
                suggestions={tagSuggestions}
                disabled={!applyTagsAdd}
                placeholder="Add tags to selection…"
              />
            </FieldApplyToggle>

            <FieldApplyToggle
              id="bulk-apply-tags-replace"
              label="Tags to replace (replaces all tags)"
              checked={applyTagsReplace}
              onChange={setApplyTagsReplace}
            >
              <TagInput
                id="bulk-tags-replace"
                value={tagsToReplace}
                onChange={setTagsToReplace}
                suggestions={tagSuggestions}
                disabled={!applyTagsReplace}
                placeholder="New tag set for selection…"
                helperText="Replaces every selected item's tags with this set."
              />
            </FieldApplyToggle>

            <FieldApplyToggle
              id="bulk-apply-company"
              label="Company override"
              checked={applyCompany}
              onChange={setApplyCompany}
            >
              <select
                value={addingCompany ? ADD_NEW_OPTION : companyValue}
                onChange={(e) => {
                  if (e.target.value === ADD_NEW_OPTION) {
                    setAddingCompany(true);
                    return;
                  }
                  setAddingCompany(false);
                  setCompanyValue(e.target.value);
                }}
                className={formInputMdClass}
              >
                <option value="">Select company…</option>
                {suggestions.companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
                <option value={ADD_NEW_OPTION}>+ Add new company…</option>
              </select>
              {addingCompany ? (
                <input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className={`mt-2 ${formInputMdClass}`}
                  placeholder="New company"
                />
              ) : null}
            </FieldApplyToggle>

            <FieldApplyToggle
              id="bulk-apply-designer"
              label="Designer override"
              checked={applyDesigner}
              onChange={setApplyDesigner}
            >
              <input
                list="bulk-designer-suggestions"
                value={designerValue}
                onChange={(e) => setDesignerValue(e.target.value)}
                className={formInputMdClass}
                placeholder="Designer name"
              />
              <datalist id="bulk-designer-suggestions">
                {suggestions.designers.map((designer) => (
                  <option key={designer} value={designer} />
                ))}
              </datalist>
            </FieldApplyToggle>

            <FieldApplyToggle
              id="bulk-apply-published"
              label="Published season / year override"
              checked={applyPublished}
              onChange={setApplyPublished}
            >
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={publishedSeason}
                  onChange={(e) => setPublishedSeason(e.target.value)}
                  className={formInputMdClass}
                >
                  <option value="">Season</option>
                  {METADATA_SEASONS.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
                <select
                  value={publishedYear}
                  onChange={(e) => setPublishedYear(e.target.value)}
                  className={formInputMdClass}
                >
                  <option value="">Year</option>
                  {METADATA_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </FieldApplyToggle>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? (
                "Applying…"
              ) : (
                <>
                  Apply to selection
                  <SaveShortcutHint />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
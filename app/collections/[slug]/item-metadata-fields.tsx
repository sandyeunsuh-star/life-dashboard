"use client";

import { useMemo, useState } from "react";

import {
  ADD_NEW_OPTION,
  DEFAULT_ITEM_TYPES,
  METADATA_SEASONS,
  METADATA_YEARS,
} from "@/lib/supabase/metadata/constants";
import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import {
  buildPublished,
  parsePublished,
  type ItemMetadata,
} from "@/lib/supabase/metadata/schema";
import {
  getMetadataSuggestionsFromItems,
  type ItemMetadataSuggestions,
} from "@/lib/supabase/metadata/suggestions";
import type { Item } from "@/lib/supabase/types/item";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { selectStringValue } from "@/lib/ui/select-string-value";

type ItemMetadataFieldsProps = {
  value: ItemMetadata;
  onChange: (next: ItemMetadata) => void;
  collectionMetadata: import("@/lib/supabase/types/collection-metadata").CollectionMetadataRecord;
  suggestionItems: Item[];
  showFileName?: boolean;
  showOverrides?: boolean;
  extraSuggestions?: ItemMetadataSuggestions;
};

export function ItemMetadataFields({
  value,
  onChange,
  collectionMetadata,
  suggestionItems,
  showFileName = false,
  showOverrides = true,
  extraSuggestions,
}: ItemMetadataFieldsProps) {
  const fromItems = useMemo(
    () => getMetadataSuggestionsFromItems(suggestionItems),
    [suggestionItems],
  );

  const suggestions: ItemMetadataSuggestions = extraSuggestions
    ? {
        companies: Array.from(
          new Set([...fromItems.companies, ...extraSuggestions.companies]),
        ).sort(),
        designers: Array.from(
          new Set([...fromItems.designers, ...extraSuggestions.designers]),
        ).sort(),
        types: Array.from(
          new Set([...fromItems.types, ...extraSuggestions.types]),
        ).sort(),
        published: fromItems.published,
      }
    : fromItems;

  const album = parseCollectionMetadata(collectionMetadata);

  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  const overridePublished = parsePublished(value.published);

  const companyOptions = useMemo(() => {
    const base = suggestions.companies;
    const current = value.company?.trim();
    if (current && !base.includes(current)) {
      return [current, ...base];
    }
    return base;
  }, [suggestions.companies, value.company]);

  const typeOptions = useMemo(() => {
    const base = Array.from(
      new Set([...DEFAULT_ITEM_TYPES, ...suggestions.types]),
    ).sort();
    const current = value.type?.trim();
    if (current && !base.includes(current)) {
      return [current, ...base];
    }
    return base;
  }, [suggestions.types, value.type]);

  const yearOptions = useMemo(() => {
    if (overridePublished.year && !METADATA_YEARS.includes(overridePublished.year)) {
      return [overridePublished.year, ...METADATA_YEARS];
    }
    return METADATA_YEARS;
  }, [overridePublished.year]);

  function patch(partial: Partial<ItemMetadata>) {
    onChange({ ...value, ...partial });
  }

  function onCompanySelect(selected: string) {
    if (selected === ADD_NEW_OPTION) {
      setAddingCompany(true);
      return;
    }
    setAddingCompany(false);
    patch({ company: selected || undefined });
  }

  function onTypeSelect(selected: string) {
    if (selected === ADD_NEW_OPTION) {
      setAddingType(true);
      return;
    }
    setAddingType(false);
    patch({ type: selected || undefined });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className={formLabelClass}>Album defaults</p>
        <p className="mt-1 text-sm text-zinc-900">
          {album.company || album.designer || album.published
            ? [
                album.company && `Company: ${album.company}`,
                album.designer && `Designer: ${album.designer}`,
                album.published && `Published: ${album.published}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "No album metadata set. Use Collection Info to add kit details."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meta-type" className={formLabelClass}>
          Type
        </label>
        <select
          id="meta-type"
          value={
            addingType ? ADD_NEW_OPTION : selectStringValue(value.type)
          }
          onChange={(e) => onTypeSelect(e.target.value)}
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
            onBlur={() => {
              const trimmed = newType.trim();
              if (trimmed) {
                patch({ type: trimmed });
                setAddingType(false);
                setNewType("");
              }
            }}
            placeholder="New type"
            className={formInputMdClass}
          />
        ) : null}
      </div>

      {showFileName && value.file_name ? (
        <div className="flex flex-col gap-1.5">
          <span className={formLabelClass}>File name</span>
          <p className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900">
            {value.file_name}
          </p>
        </div>
      ) : null}

      {showOverrides ? (
        <div className="flex flex-col gap-4 border-t border-zinc-100 pt-4">
          <p className="text-sm font-medium text-zinc-900">
            Overrides{" "}
            <span className="font-normal text-zinc-600">(optional)</span>
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="meta-company-override" className={formLabelClass}>
              Company override
            </label>
            <select
              id="meta-company-override"
              value={
                addingCompany
                  ? ADD_NEW_OPTION
                  : selectStringValue(value.company)
              }
              onChange={(e) => onCompanySelect(e.target.value)}
              className={formInputMdClass}
            >
              <option value="">Use album default</option>
              {companyOptions.map((company) => (
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
                onBlur={() => {
                  const trimmed = newCompany.trim();
                  if (trimmed) {
                    patch({ company: trimmed });
                    setAddingCompany(false);
                    setNewCompany("");
                  }
                }}
                placeholder="New company name"
                className={formInputMdClass}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta-season-override" className={formLabelClass}>
                Season override
              </label>
              <select
                id="meta-season-override"
                value={selectStringValue(overridePublished.season)}
                onChange={(e) => {
                  const season = e.target.value;
                  patch({
                    published: buildPublished(season, overridePublished.year),
                  });
                }}
                className={formInputMdClass}
              >
                <option value="">Use album</option>
                {METADATA_SEASONS.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta-year-override" className={formLabelClass}>
                Year override
              </label>
              <select
                id="meta-year-override"
                value={selectStringValue(overridePublished.year)}
                onChange={(e) => {
                  const year = e.target.value;
                  patch({
                    published: buildPublished(overridePublished.season, year),
                  });
                }}
                className={formInputMdClass}
              >
                <option value="">Use album</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="meta-designer-override" className={formLabelClass}>
              Designer override
            </label>
            <input
              id="meta-designer-override"
              list="designer-suggestions-override"
              value={value.designer ?? ""}
              onChange={(e) => patch({ designer: e.target.value || undefined })}
              className={formInputMdClass}
              placeholder="Leave blank to use album default"
            />
            <datalist id="designer-suggestions-override">
              {suggestions.designers.map((designer) => (
                <option key={designer} value={designer} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                company: undefined,
                designer: undefined,
                published: undefined,
              })
            }
            className="text-left text-sm font-medium text-zinc-900 underline"
          >
            Clear all overrides
          </button>
        </div>
      ) : null}
    </div>
  );
}
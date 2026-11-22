"use client";

import { useMemo, useState } from "react";

import {
  ADD_NEW_OPTION,
  DEFAULT_ITEM_TYPES,
  METADATA_SEASONS,
  METADATA_YEARS,
} from "@/lib/supabase/metadata/constants";
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

type ItemMetadataFieldsProps = {
  value: ItemMetadata;
  onChange: (next: ItemMetadata) => void;
  collectionName: string;
  suggestionItems: Item[];
  showFileName?: boolean;
};

export function ItemMetadataFields({
  value,
  onChange,
  collectionName,
  suggestionItems,
  showFileName = false,
}: ItemMetadataFieldsProps) {
  const suggestions: ItemMetadataSuggestions = useMemo(
    () => getMetadataSuggestionsFromItems(suggestionItems),
    [suggestionItems],
  );

  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState("");

  const published = parsePublished(value.published);
  const companyOptions = suggestions.companies;
  const typeOptions = Array.from(
    new Set([...DEFAULT_ITEM_TYPES, ...suggestions.types]),
  ).sort();

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="meta-company" className={formLabelClass}>
          Company
        </label>
        <select
          id="meta-company"
          value={addingCompany ? ADD_NEW_OPTION : value.company ?? ""}
          onChange={(e) => onCompanySelect(e.target.value)}
          className={formInputMdClass}
        >
          <option value="">Select company…</option>
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
              if (trimmed) patch({ company: trimmed });
            }}
            placeholder="New company name"
            className={formInputMdClass}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={formLabelClass}>Collection</span>
        <span className="inline-flex w-fit rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-900">
          {collectionName}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="meta-season" className={formLabelClass}>
            Season
          </label>
          <select
            id="meta-season"
            value={published.season}
            onChange={(e) =>
              patch({
                published: buildPublished(e.target.value, published.year),
              })
            }
            className={formInputMdClass}
          >
            <option value="">Season</option>
            {METADATA_SEASONS.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="meta-year" className={formLabelClass}>
            Year
          </label>
          <select
            id="meta-year"
            value={published.year}
            onChange={(e) =>
              patch({
                published: buildPublished(published.season, e.target.value),
              })
            }
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meta-designer" className={formLabelClass}>
          Designer
        </label>
        <input
          id="meta-designer"
          list="designer-suggestions"
          value={value.designer ?? ""}
          onChange={(e) => patch({ designer: e.target.value || undefined })}
          className={formInputMdClass}
          placeholder="Designer name"
        />
        <datalist id="designer-suggestions">
          {suggestions.designers.map((designer) => (
            <option key={designer} value={designer} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meta-type" className={formLabelClass}>
          Type
        </label>
        <select
          id="meta-type"
          value={addingType ? ADD_NEW_OPTION : value.type ?? ""}
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
              if (trimmed) patch({ type: trimmed });
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
    </div>
  );
}
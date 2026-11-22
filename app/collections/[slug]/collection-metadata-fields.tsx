"use client";

import { useMemo, useState } from "react";

import {
  ADD_NEW_OPTION,
  METADATA_SEASONS,
  METADATA_YEARS,
} from "@/lib/supabase/metadata/constants";
import {
  buildPublished,
  parsePublished,
  type CollectionMetadata,
} from "@/lib/supabase/metadata/collection-schema";
import type { ItemMetadataSuggestions } from "@/lib/supabase/metadata/suggestions";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { selectStringValue } from "@/lib/ui/select-string-value";

type CollectionMetadataFieldsProps = {
  value: CollectionMetadata;
  onChange: (next: CollectionMetadata) => void;
  suggestions: ItemMetadataSuggestions;
  idPrefix?: string;
};

export function CollectionMetadataFields({
  value,
  onChange,
  suggestions,
  idPrefix = "album",
}: CollectionMetadataFieldsProps) {
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const published = parsePublished(value.published);
  const companyOptions = useMemo(() => {
    const base = suggestions.companies;
    const current = value.company?.trim();
    if (current && !base.includes(current)) {
      return [current, ...base];
    }
    return base;
  }, [suggestions.companies, value.company]);

  const yearOptions = useMemo(() => {
    if (published.year && !METADATA_YEARS.includes(published.year)) {
      return [published.year, ...METADATA_YEARS];
    }
    return METADATA_YEARS;
  }, [published.year]);

  function patch(partial: Partial<CollectionMetadata>) {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-company`} className={formLabelClass}>
          Company
        </label>
        <select
          id={`${idPrefix}-company`}
          value={
            addingCompany
              ? ADD_NEW_OPTION
              : selectStringValue(value.company)
          }
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
          <label htmlFor={`${idPrefix}-season`} className={formLabelClass}>
            Season
          </label>
          <select
            id={`${idPrefix}-season`}
            value={selectStringValue(published.season)}
            onChange={(e) => {
              const season = e.target.value;
              patch({
                published: buildPublished(season, published.year),
              });
            }}
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
          <label htmlFor={`${idPrefix}-year`} className={formLabelClass}>
            Year
          </label>
          <select
            id={`${idPrefix}-year`}
            value={selectStringValue(published.year)}
            onChange={(e) => {
              const year = e.target.value;
              patch({
                published: buildPublished(published.season, year),
              });
            }}
            className={formInputMdClass}
          >
            <option value="">Year</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-designer`} className={formLabelClass}>
          Designer
        </label>
        <input
          id={`${idPrefix}-designer`}
          list={`${idPrefix}-designer-suggestions`}
          value={value.designer ?? ""}
          onChange={(e) => patch({ designer: e.target.value || undefined })}
          className={formInputMdClass}
          placeholder="Designer name"
        />
        <datalist id={`${idPrefix}-designer-suggestions`}>
          {suggestions.designers.map((designer) => (
            <option key={designer} value={designer} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-4">
        <label htmlFor={`${idPrefix}-drive-folder`} className={formLabelClass}>
          Google Drive folder link
        </label>
        <input
          id={`${idPrefix}-drive-folder`}
          type="url"
          value={value.drive_folder_url ?? ""}
          onChange={(e) =>
            patch({ drive_folder_url: e.target.value || undefined })
          }
          placeholder="https://drive.google.com/drive/folders/..."
          className={formInputMdClass}
        />
        <p className="text-xs text-zinc-600">
          Link to the kit&apos;s main folder in Google Drive (set manually so
          subfolder imports won&apos;t overwrite it).
        </p>
      </div>
    </div>
  );
}
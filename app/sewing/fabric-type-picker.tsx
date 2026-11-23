"use client";

import { useMemo } from "react";

import { FABRIC_TYPES } from "@/lib/sewing/constants";
import {
  parseFabricTypeField,
  serializeFabricTypes,
} from "@/lib/sewing/fabric-types";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type FabricTypePickerProps = {
  value: string;
  onChange: (serialized: string) => void;
};

export function FabricTypePicker({ value, onChange }: FabricTypePickerProps) {
  const { selected, legacy } = useMemo(
    () => parseFabricTypeField(value),
    [value],
  );

  function commit(nextSelected: string[], nextLegacy: string) {
    onChange(serializeFabricTypes(nextSelected, nextLegacy));
  }

  function toggle(type: string) {
    if (selected.includes(type)) {
      commit(
        selected.filter((t) => t !== type),
        legacy,
      );
    } else {
      commit([...selected, type], legacy);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={formLabelClass}>Fabric type</span>
      <div className="flex flex-wrap gap-1.5">
        {FABRIC_TYPES.map((type) => {
          const active = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              className={[
                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
              ].join(" ")}
            >
              {type}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={legacy}
        onChange={(e) => commit(selected, e.target.value)}
        className={formInputMdClass}
        placeholder="Other fabric notes (optional)"
      />
    </div>
  );
}
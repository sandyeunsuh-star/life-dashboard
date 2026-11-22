"use client";

import { hasTagCaseInsensitive } from "@/lib/supabase/items/tag-suggestions";
import { TagPill } from "@/lib/ui/tag-pill";

type ItemTagPillsProps = {
  tags: string[];
  activeFilterTags?: string[];
  onToggleFilter?: (tag: string) => void;
  className?: string;
  maxVisible?: number;
};

export function ItemTagPills({
  tags,
  activeFilterTags = [],
  onToggleFilter,
  className = "",
  maxVisible,
}: ItemTagPillsProps) {
  if (tags.length === 0) return null;

  const visible = maxVisible ? tags.slice(0, maxVisible) : tags;
  const overflow = maxVisible && tags.length > maxVisible ? tags.length - maxVisible : 0;

  return (
    <div
      className={`flex flex-wrap gap-1 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {visible.map((tag, index) => (
        <TagPill
          key={`${tag}-${index}`}
          tag={tag}
          active={hasTagCaseInsensitive(activeFilterTags, tag)}
          onClick={
            onToggleFilter
              ? (selected) => {
                  onToggleFilter(selected);
                }
              : undefined
          }
        />
      ))}
      {overflow > 0 ? (
        <span className="text-[10px] text-zinc-600">+{overflow}</span>
      ) : null}
    </div>
  );
}
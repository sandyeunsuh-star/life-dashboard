"use client";

export type SewingSection = "library" | "wishlist";

type SewingSectionTabsProps = {
  active: SewingSection;
  libraryCount: number;
  wishlistCount: number;
  onChange: (section: SewingSection) => void;
};

export function SewingSectionTabs({
  active,
  libraryCount,
  wishlistCount,
  onChange,
}: SewingSectionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Sewing Corner library or wishlist"
      className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1"
    >
      <TabButton
        active={active === "library"}
        onClick={() => onChange("library")}
        label={`My Library (${libraryCount})`}
      />
      <TabButton
        active={active === "wishlist"}
        onClick={() => onChange("wishlist")}
        label={`Wishlist (${wishlistCount})`}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "rounded-md px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-white text-zinc-900 shadow-sm"
          : "text-zinc-600 hover:text-zinc-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
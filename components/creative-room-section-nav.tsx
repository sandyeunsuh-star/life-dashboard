"use client";

import Link from "next/link";

export const CREATIVE_ROOM_SECTIONS = [
  {
    id: "collections",
    label: "Collections",
    href: "/designer",
  },
  {
    id: "knitting",
    label: "Knitting Corner",
    href: "/designer/knitting",
  },
] as const;

export type CreativeRoomSectionId =
  (typeof CREATIVE_ROOM_SECTIONS)[number]["id"];

function pillClass(active: boolean) {
  return [
    "rounded-full px-3 py-1 text-xs font-medium transition",
    active
      ? "bg-zinc-900 text-white"
      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
  ].join(" ");
}

type CreativeRoomSectionNavProps = {
  active: CreativeRoomSectionId;
};

export function CreativeRoomSectionNav({
  active,
}: CreativeRoomSectionNavProps) {
  return (
    <nav
      className="mb-8 flex flex-wrap items-center gap-2"
      aria-label="Creative Room sections"
    >
      {CREATIVE_ROOM_SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={isActive ? "page" : undefined}
            className={pillClass(isActive)}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
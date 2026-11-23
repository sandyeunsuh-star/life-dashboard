"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/app/sign-out-button";

function navLinkClass(active: boolean) {
  return [
    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
    active
      ? "bg-zinc-900 text-white"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  ].join(" ");
}

export function TopNav() {
  const pathname = usePathname() ?? "/";

  const weeklyActive = pathname === "/";
  const designerActive =
    pathname === "/designer" || pathname.startsWith("/collections/");

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            className="shrink-0 text-sm font-bold tracking-tight text-zinc-900"
          >
            LIFE
          </Link>
          <nav
            className="flex items-center gap-1"
            aria-label="Primary"
          >
            <Link href="/" className={navLinkClass(weeklyActive)}>
              Weekly
            </Link>
            <Link href="/designer" className={navLinkClass(designerActive)}>
              I Am a Designer
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
import { connection } from "next/server";
import { Suspense } from "react";

import { CollectionsDashboard } from "@/app/collections-dashboard";
import { SignOutButton } from "@/app/sign-out-button";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { listCollections } from "@/lib/supabase/queries/collections";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function HomeContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const { data: collections, error } = await listCollections(supabase);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (
    <>
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            Life Dashboard
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <CollectionsDashboard collections={collections ?? []} />
      </main>
    </>
  );
}

function HomeFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <Suspense fallback={<HomeFallback />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
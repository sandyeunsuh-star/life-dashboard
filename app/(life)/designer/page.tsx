import { connection } from "next/server";
import { Suspense } from "react";

import { CollectionsDashboard } from "@/app/collections-dashboard";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { listCollectionsForDashboard } from "@/lib/supabase/queries/collections";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function DesignerContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const { data: collections, error } =
    await listCollectionsForDashboard(supabase);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <CollectionsDashboard collections={collections ?? []} />
    </main>
  );
}

function DesignerFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default function DesignerPage() {
  return (
    <Suspense fallback={<DesignerFallback />}>
      <DesignerContent />
    </Suspense>
  );
}
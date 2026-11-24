import { connection } from "next/server";
import { Suspense } from "react";

import { CurrentsDashboard } from "@/app/currents/currents-dashboard";
import { currentPeriodYm } from "@/lib/currents/period";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { listCurrentsEntries } from "@/lib/supabase/queries/currents";
import { listDigitalPapersForCurrents } from "@/lib/supabase/queries/currents-papers";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function CurrentsContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const [entriesResult, papersResult] = await Promise.all([
    listCurrentsEntries(supabase),
    listDigitalPapersForCurrents(supabase),
  ]);

  if (entriesResult.error) {
    throw new Error(formatSupabaseError(entriesResult.error));
  }
  if (papersResult.error) {
    throw new Error(formatSupabaseError(papersResult.error));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 bg-[#F7F5F2] px-6 py-10 pb-28">
      <CurrentsDashboard
        initialEntries={entriesResult.data ?? []}
        serverCurrentYm={currentPeriodYm()}
        digitalPapers={papersResult.data ?? []}
      />
    </main>
  );
}

function CurrentsFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#F7F5F2] py-24">
      <p className="text-sm text-stone-500">Loading…</p>
    </div>
  );
}

export default function CurrentsPage() {
  return (
    <Suspense fallback={<CurrentsFallback />}>
      <CurrentsContent />
    </Suspense>
  );
}
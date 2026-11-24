import { connection } from "next/server";
import { Suspense } from "react";

import { VaultDashboard } from "@/app/vault/vault-dashboard";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { fetchVaultSnapshot } from "@/lib/supabase/queries/vault";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function VaultContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const { data, error } = await fetchVaultSnapshot(supabase);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 pb-28">
      <VaultDashboard
        initial={
          data ?? {
            items: [],
            pausedCount: 0,
            pendingRewardPoints: 0,
            keptSafeKrw: 0,
            keptSafeUsd: 0,
          }
        }
      />
    </main>
  );
}

function VaultFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={<VaultFallback />}>
      <VaultContent />
    </Suspense>
  );
}
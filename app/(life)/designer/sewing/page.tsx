import { connection } from "next/server";
import { Suspense } from "react";

import { SewingCornerDashboard } from "@/app/sewing/sewing-corner-dashboard";
import { CreativeRoomSectionNav } from "@/components/creative-room-section-nav";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  listSewingDesigners,
  listSewingPatterns,
} from "@/lib/supabase/queries/sewing-patterns";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function SewingContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const [patternsResult, designersResult] = await Promise.all([
    listSewingPatterns(supabase),
    listSewingDesigners(supabase),
  ]);

  if (patternsResult.error) {
    throw new Error(formatSupabaseError(patternsResult.error));
  }
  if (designersResult.error) {
    throw new Error(formatSupabaseError(designersResult.error));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <CreativeRoomSectionNav active="sewing" />
      <SewingCornerDashboard
        initialPatterns={patternsResult.data ?? []}
        designerSuggestions={designersResult.data ?? []}
      />
    </main>
  );
}

function SewingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default function SewingCornerPage() {
  return (
    <Suspense fallback={<SewingFallback />}>
      <SewingContent />
    </Suspense>
  );
}
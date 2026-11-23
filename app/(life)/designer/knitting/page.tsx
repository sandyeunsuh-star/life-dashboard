import { connection } from "next/server";
import { Suspense } from "react";

import { KnittingCornerDashboard } from "@/app/knitting/knitting-corner-dashboard";
import { CreativeRoomSectionNav } from "@/components/creative-room-section-nav";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  listKnittingDesigners,
  listKnittingPatterns,
} from "@/lib/supabase/queries/knitting-patterns";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function KnittingContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const [patternsResult, designersResult] = await Promise.all([
    listKnittingPatterns(supabase),
    listKnittingDesigners(supabase),
  ]);

  if (patternsResult.error) {
    throw new Error(formatSupabaseError(patternsResult.error));
  }
  if (designersResult.error) {
    throw new Error(formatSupabaseError(designersResult.error));
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <CreativeRoomSectionNav active="knitting" />
      <KnittingCornerDashboard
        initialPatterns={patternsResult.data ?? []}
        designerSuggestions={designersResult.data ?? []}
      />
    </main>
  );
}

function KnittingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default function KnittingCornerPage() {
  return (
    <Suspense fallback={<KnittingFallback />}>
      <KnittingContent />
    </Suspense>
  );
}
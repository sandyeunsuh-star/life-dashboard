import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionDetail } from "@/app/collections/[slug]/collection-detail";
import { SignOutButton } from "@/app/sign-out-button";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { getCollectionBySlug } from "@/lib/supabase/queries/collections";
import { listItemsByCollection } from "@/lib/supabase/queries/items";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

async function CollectionContent({ slug }: { slug: string }) {
  await connection();

  const supabase = await createServerClientInstance();
  const { data: collection, error } = await getCollectionBySlug(supabase, slug);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  if (!collection) {
    notFound();
  }

  const { data: items, error: itemsError } = await listItemsByCollection(
    supabase,
    collection.id,
  );

  if (itemsError) {
    throw new Error(formatSupabaseError(itemsError));
  }

  return (
    <>
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Collections
          </Link>
          <SignOutButton />
        </div>
      </header>

      <CollectionDetail collection={collection} initialItems={items ?? []} />
    </>
  );
}

function CollectionFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <Suspense fallback={<CollectionFallback />}>
        <CollectionContent slug={slug} />
      </Suspense>
    </div>
  );
}
export type GratitudeDraftFields = {
  favorite_thing?: string | null;
  glimmer_1?: string | null;
  glimmer_2?: string | null;
  glimmer_3?: string | null;
};

export function gratitudeHasSaveableContent(fields: GratitudeDraftFields): boolean {
  const values = [
    fields.favorite_thing,
    fields.glimmer_1,
    fields.glimmer_2,
    fields.glimmer_3,
  ];
  return values.some((v) => Boolean(v?.trim()));
}

export function gratitudeReasonSnippet(fields: GratitudeDraftFields): string {
  return (
    fields.favorite_thing?.trim() ||
    fields.glimmer_1?.trim() ||
    fields.glimmer_2?.trim() ||
    fields.glimmer_3?.trim() ||
    "Gratitude"
  );
}
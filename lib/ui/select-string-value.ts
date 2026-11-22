/** Controlled `<select value={…}>` must always be a string. */
export function selectStringValue(value: string | null | undefined): string {
  return value ?? "";
}
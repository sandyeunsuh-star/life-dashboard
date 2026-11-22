function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 3 && /^[a-z]+$/.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function compactTitleCase(value: string): string {
  if (!value.includes(" ") && value.length > 0) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return toTitleCase(value);
}

/**
 * Guess a display title from a Drive / upload file name.
 * Saves exact `file_name` separately in metadata.
 */
export type GuessItemTitleOptions = {
  company?: string;
};

export function guessItemTitleFromFileName(
  fileName: string,
  collectionName: string,
  options?: GuessItemTitleOptions,
): { title: string; file_name: string } {
  const file_name = fileName;

  let stem = stripExtension(fileName)
    .replace(/[_]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const collection = collectionName.trim();
  if (collection) {
    stem = stem
      .replace(new RegExp(escapeRegex(collection), "gi"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const company = options?.company?.trim();
  if (company) {
    stem = stem
      .replace(new RegExp(escapeRegex(company), "gi"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  stem = stem.replace(/^ac\s+[a-z0-9]+\s*/i, "").trim();

  const parts = stem.split(" ").filter(Boolean);
  const kitIndex = parts.findIndex((part) =>
    /pp\d+$/i.test(part) || /^[a-z]+\d{1,4}$/i.test(part),
  );

  if (kitIndex >= 0 && kitIndex < parts.length - 1) {
    stem = parts.slice(kitIndex + 1).join(" ");
  } else if (parts.length > 2 && /^ac/i.test(stripExtension(fileName))) {
    stem = parts[parts.length - 1] ?? stem;
  }

  stem = stem.replace(/\s+/g, " ").trim();
  const title = compactTitleCase(stem) || "Untitled item";

  return { title, file_name };
}
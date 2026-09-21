import type { Dictionary } from "@/lib/i18n";
import type { Mark } from "@/lib/types";

// Kategorie ukládáme jako stálý klíč a překládáme až při zobrazení,
// aby značka dávala smysl ve všech jazycích.
export const CATEGORY_KEYS = ["content", "fix", "localization", "new", "formal"] as const;

export function categoryLabel(key: string | null, t: Dictionary): string | null {
  switch (key) {
    case "content":
      return t.catContent;
    case "fix":
      return t.catFix;
    case "localization":
      return t.catLocalization;
    case "new":
      return t.catNewPart;
    case "formal":
      return t.catFormal;
    default:
      return key; // starší kategorie psané volně rukou
  }
}

// Pořadí čtení: stránka, pak shora dolů, pak zleva doprava.
export function sortMarks(marks: Mark[]): Mark[] {
  return [...marks].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
}

export function numberMarks(marks: Mark[]): Record<string, number> {
  const numbers: Record<string, number> = {};
  sortMarks(marks).forEach((mark, index) => {
    numbers[mark.id] = index + 1;
  });
  return numbers;
}

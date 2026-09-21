import fs from 'node:fs';
import path from 'node:path';
import type { CategoryCode } from './categories';

const DATA_DIR = path.join(process.cwd(), 'data');

function readIfExists(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

/** Odstraní YAML frontmatter ze začátku Markdownu (pro vložení do promptu). */
function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

export interface CatalogContent {
  prehled: string;
  vsechnyKarty: string;
}

/**
 * Deterministický výběr: načte destilovanou vrstvu (přehled + všechny karty)
 * pro danou kategorii. Tyto texty se vkládají do system promptu (ne RAG).
 */
export function loadCategoryContent(code: CategoryCode): CatalogContent {
  const base = path.join(DATA_DIR, 'cards', code);
  const prehled = readIfExists(path.join(base, '_prehled.md'));
  const all = readIfExists(path.join(base, '_all.md'));
  if (!prehled || !all) {
    throw new Error(`Katalog pro kategorii "${code}" nebyl nalezen v data/cards/${code}/.`);
  }
  return {
    prehled: stripFrontmatter(prehled),
    vsechnyKarty: all.trim(),
  };
}

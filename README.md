# Katalog podpůrných opatření — data + asistent pro pedagogy

Technická specifikace pro tým. Repozitář obsahuje **strojově zpracovaný Katalog podpůrných opatření** (Michalík, Baslerová, Felcmanová a kol.) ve dvou datových vrstvách a **konverzační prototyp pro pedagogy** (Next.js), který nad těmito daty staví. Data jsou zároveň připravená pro nasazení do aplikace **Tiny** (tiny.school).

---

## 1. K čemu to je

Jsme AI dětem, z.s. Katalog podpůrných opatření je odborný zdroj, jak individualizovat výuku pro žáky se speciálními vzdělávacími potřebami (SVP). Chceme ho zpřístupnit skrz LLM ve dvou produktech:

1. **Prototyp pro pedagogy** *(v tomto repu, běží)* — učitel si povídá s chatbotem, ten mu radí s konkrétním žákem a rovnou tvoří materiály (pracovní listy, zadání, postupy). Vychází výhradně z katalogu.
2. **Chatboti v Tiny** *(návrh integrace níže)* — výukoví chatboti (Opakovací parťák, Zvědavý mimoň, Argumentační partner ad.) si povídají přímo s dětmi. **Katalog se do konverzace s dítětem nevkládá.** Slouží offline jako zdroj pro vygenerování krátkého **individualizačního profilu žáka**, který se přibalí k system promptu chatbota.

Oba produkty potřebují stejná data, ale v jiné podobě — proto **dvě vrstvy**: věrná (zdroj pravdy) a destilovaná (vejde se do promptů).

---

## 2. Datový model — dvě vrstvy

Katalog má 9 částí: **obecnou** (`vseobecny`), **7 dílčích** podle typu znevýhodnění a **metodiku k SZN** (`szn-metodika`). Každá část je zpracovaná do dvou vrstev ve složce `data/`.

```
data/
  full/                    # VRSTVA 1 — věrný přepis PDF (zdroj pravdy)
    pas/
      01-uvod.md
      oblast-01-organizace-vyuky.md   # 1 soubor = 1 oblast podpory, karty uvnitř
      ...
  cards/                   # VRSTVA 2 — destiláty pro prompty
    pas/
      _prehled.md          # profil cílové skupiny (kdo to je, projevy, zásady komunikace)
      _all.md              # všechny destilované karty katalogu v jednom souboru
      1-1-uprava-rezimu-vyuky-casova-mistni.md   # 1 karta = 1 soubor
      ...
  manifest.json            # strojový rejstřík (metadata, oblasti, karty, cesty)
  index.md                 # lidsky čitelný rejstřík (tabulky)
  REPORT.md                # protokol o převodu + kontrola kvality
```

### Vrstva 1 — `data/full/` (věrná)

Úplný, neshrnutý přepis PDF do čistého Markdownu. Opravené artefakty extrakce (rozdělená slova, záhlaví/zápatí, mezerované nadpisy), zachované číslování a hierarchie:

- `#` katalog/kapitola → `##` oblast podpory → `###` karta opatření → `####` standardizované sekce karty (Projevy žáka, Popis opatření, Aplikace, Na co klást důraz, Rizika, Ilustrační příklad, Cílové skupiny, Varianty dle stupňů podpory 1–5, Metodické zdroje).
- YAML frontmatter u každého souboru (katalog, oblast, seznam karet, zdroj, vrstva).

**Použití:** zdroj pravdy a **agentické dočítání** — když model potřebuje plné znění karty, sáhne sem přes cestu z manifestu.

### Vrstva 2 — `data/cards/` (destilovaná)

Operativní znalost pro LLM prompty, čerpaná **výhradně** z vrstvy 1 (žádné domýšlení). Tři typy souborů:

- **`_prehled.md`** — profil cílové skupiny (~300–600 slov): kdo to je, typické projevy ve vzdělávání, **obecné zásady komunikace a práce se žákem**, přehled oblastí podpory. Tohle je základ pro individualizační profily v Tiny.
- **`_all.md`** — všechny destilované karty katalogu v jednom souboru (≤ ~15 000 tokenů). Vkládá se do system promptu prototypu.
- **`<číslo>-<název>.md`** — jedna karta = jeden soubor (pro adresné použití). Jednotná šablona:

  ```markdown
  ### 1.1 Úprava režimu výuky (časová, místní)
  **Kdy použít (projevy žáka):** …
  **Co to je:** …
  **Jak ve výuce:** …            (3–6 akčních odrážek)
  **Pozor na:** …                (rizika + na co dbát)
  **Cílové skupiny:** …          (jen když je omezené)
  **Stupně podpory:** …          (jen když se realizace mezi stupni liší)
  ```

### Rejstříky

- **`manifest.json`** — strojový. Pro každý katalog: metadata (`nazev`, `cilova_skupina`, `prehled`, `all`, `pocet_karet`) a pole `oblasti`, v každé oblasti pole `karty` s `{kod, nazev, anotace, full, card}`. Slouží k programové navigaci a k sestavení rejstříku pro agentické dočítání.
- **`index.md`** — lidsky čitelná verze téhož (tabulky).

### Rozsah dat

| Kód | Cílová skupina | Karty |
|---|---|---|
| `pas` | Poruchy autistického spektra a vybraná psych. onemocnění | 45 |
| `mp` | Mentální postižení | 50 |
| `nks` | Narušená komunikační schopnost | 50 |
| `sp` | Sluchové postižení | 47 |
| `zp` | Zrakové postižení | 47 |
| `tp` | Tělesné postižení a závažné onemocnění | 54 |
| `szn` | Sociální znevýhodnění | 77 |
| `vseobecny` | Obecná část (metodika, jen `_prehled.md`) | — |
| `szn-metodika` | Metodika k SZN (jen `_prehled.md`) | — |
| | **Celkem** | **370** |

Úplný protokol o převodu a kontrole kvality je v `data/REPORT.md` (počet karet ve vrstvě 1, 2 i manifestu sedí; cesty v manifestu ověřené na disku).

### Proč dvě vrstvy

Plné katalogy mají dohromady statisíce tokenů — do promptu se nevejdou a je drahé je tam mít. Destiláty (`_all.md` ≤ ~15k tokenů/katalog) se vejdou a stačí na drtivou většinu dotazů. Když je potřeba detail, vrstva 1 slouží jako přesný zdroj, ze kterého se dočte jen konkrétní karta. Destilace nikdy nepřidává nic, co ve zdroji není.

---

## 3. Prototyp pro pedagogy — jak funguje technicky

Next.js (App Router) + oficiální Anthropic SDK, nasazení na Vercelu. Tok:

```
1) Učitel vlevo vybere skupinu žáka (7 typů znevýhodnění)
2) Backend deterministicky načte destilát té kategorie
   (_prehled.md + _all.md) a vloží ho do system promptu   ← NE RAG
3) Učitel popíše žáka a situaci; chat streamuje odpověď z Claude
```

### Deterministický výběr + prompt caching (jádro)

Ne RAG, ne embeddingy. Výběr znevýhodnění → pevně daný obsah katalogu. `lib/prompt.ts` sestaví system prompt jako pole bloků:

```
[ blok 1: role + instrukce + vybraná skupina ]
[ blok 2: PŘEHLED skupiny + VŠECHNY destilované karty  →  cache_control: ephemeral ]
```

Velký, stabilní blok katalogu je označený `cache_control`, takže opakované tahy konverzace čtou vstup z **prompt cache** (řádově levnější a rychlejší). Instrukce (`ROLE_INSTRUCTIONS`) modelu ukládají: vycházet jen z katalogu, u opatření uvádět kód i název (např. „2.3 Strukturalizace výuky"), ptát se na potřebné o žákovi a tvořit konkrétní materiály.

Klíčové soubory:

| Soubor | Role |
|---|---|
| `lib/categories.ts` | 7 kategorií (kód, název, cílová skupina) |
| `lib/catalog.ts` | `loadCategoryContent(code)` — načte `_prehled.md` + `_all.md`, odstraní frontmatter |
| `lib/prompt.ts` | `buildSystemPrompt(code)` — složí bloky + prompt caching |
| `app/api/chat/route.ts` | Node runtime, streamované volání Claude (`messages.stream`), text/plain stream |
| `app/page.tsx` | Levý panel skupin + chat (client), renderování odpovědí přes Markdown |

> **Pro LLM inženýry:** detailní rozbor runtime toku (žádný agent, žádné RAG — deterministické vložení destilátu do promptu), tokenové rozpočty a varianty pro Tiny (RAG / hybrid / úprava dat) jsou v [`docs/llm-a-data.md`](docs/llm-a-data.md).

### Agentické dočítání *(fáze 2, připravené v datech, zatím nenasazené)*

Model dostane do promptu rejstřík (`index.md` / výtah z `manifest.json`) a tool `get_card(katalog, kod)`, který vrátí plnou kartu z `data/full/`. Použije se, když destilát nestačí a je potřeba detail. Data i cesty jsou na to připravené; zbývá doplnit tool-use smyčku v route handleru a indikaci v UI.

### Stack a provoz

- **Next.js 15 (App Router), React 19, TypeScript, plain CSS.** Odpovědi se renderují jako Markdown (`react-markdown` + `remark-gfm`).
- **Model je konfigurovatelný** přes `ANTHROPIC_MODEL` (výchozí `claude-sonnet-5`, pro vyšší kvalitu `claude-opus-5`).
- Route handler běží na **Node runtime** (potřebuje `fs` pro čtení `data/`); `next.config.mjs` přes `outputFileTracingIncludes` přibalí `data/` do serverless funkce.

---

## 4. Implementace do Tiny (tiny.school)

Data jsou navržená tak, aby posloužila oběma cestám integrace do Tiny. **Načasování upřesníme zvlášť** — tohle je návrh, jak to technicky zapadne.

### 4a. Prototyp pro pedagogy → Tiny

Prototyp (kapitola 3) se v nějaké míře přenese do Tiny jako nástroj pro učitele. Logika zůstává stejná (deterministický destilát v promptu + volitelné agentické dočítání); mění se jen obal — autentizace, UI a napojení na profily žáků v Tiny.

### 4b. Chatboti v Tiny — individualizační profil žáka z karet

Tady je klíčový rozdíl: **katalog se nikdy nevkládá do konverzace s dítětem.** Používá se offline k tomu, aby chatbot uměl s konkrétním dítětem mluvit ohleduplně a účinně.

**Spouštěč — profil žáka.** Když učitel v Tiny u žáka vyplní informace k SVP (typ znevýhodnění, případně konkrétní projevy, na co si dát pozor, co funguje), máme dost pro cílený výběr z katalogu.

**Pipeline (jednorázově, ne v reálném čase konverzace):**

```
Profil žáka v Tiny (typ SVP + poznámky učitele)
        │
        ▼
1) Deterministicky vyber kategorii → _prehled.md (+ relevantní karty z _all.md)
2) Jednorázově zavolej LLM: „Z těchto podkladů a z profilu žáka vytvoř
   individualizační profil — konkrétní komunikační instrukce pro chatbota."
        │
        ▼
Individualizační profil žáka  (~500–2000 tokenů: jak s žákem mluvit,
        │                      čeho se vyvarovat, co pomáhá)
        ▼
3) Ulož k žákovi a přibal ho k system promptu chatbota
   (Opakovací parťák, Zvědavý mimoň, …) při každé konverzaci
```

**Proč to takhle:**

- **`_prehled.md` je stavěný přesně pro tohle** — důraz na zásady komunikace (jak mluvit, čeho se vyvarovat). Je to primární vstup pro generování profilu.
- **Krátký profil (~500–2000 tokenů)** se vejde do system promptu každého chatbota bez zatížení konverzace a bez toho, aby dítě kdy vidělo odborný katalog.
- **Generuje se jednorázově** (při vyplnění/změně profilu žáka), ne při každé zprávě — levné a stabilní. Profil lze cachovat u žáka a přegenerovat jen při změně.
- **Destiláty, ne plné karty** — do generátoru profilu jde vrstva 2; vrstva 1 zůstává jako zdroj pravdy, kdyby bylo potřeba detail doplnit.

**Co je pro tuto cestu v repu hotové:** destilované karty a `_prehled.md` per kategorie, kategorizace (`lib/categories.ts`) a rejstřík. **Co se doplní v Tiny:** mapování polí profilu žáka na kategorii, prompt pro generátor profilu, uložení profilu k žákovi a jeho přibalení k promptům chatbotů.

---

## 5. Struktura repozitáře

```
app/                    prototyp pro pedagogy (Next.js App Router)
  page.tsx              levý panel skupin + chat (client)
  api/chat/route.ts     streamované volání Claude (Node runtime)
  Markdown.tsx          render odpovědí jako Markdown
  layout.tsx, globals.css, Logo.tsx
lib/
  categories.ts         7 dílčích katalogů (cílové skupiny)
  catalog.ts            načtení destilované vrstvy z data/cards/
  prompt.ts             sestavení system promptu (+ prompt caching)
data/                   převedený katalog (full + cards + manifest/index + REPORT)
scripts/                extrakční pipeline (PDF → Markdown, Python + PyMuPDF)
katalog-pdf/            zdrojová PDF
public/, ui/            loga a statické assety
zadani-prevod-katalogu.md   původní zadání převodu
```

---

## 6. Lokální vývoj a nasazení

```bash
npm install
cp .env.example .env.local   # doplň ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

**Vercel** (Settings → Environment Variables):

| Proměnná | Hodnota |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API klíč (`sk-ant-…`) — tajné, jen env, nikdy v gitu |
| `ANTHROPIC_MODEL` | *(volitelné)* výchozí `claude-sonnet-5`; kvalitnější `claude-opus-5` |
| `FEEDBACK_WEBHOOK_URL` | *(volitelné)* URL Google Apps Script web app pro sběr připomínek |

Framework Preset = **Next.js** (viz `vercel.json`). Po nastavení klíče a pushnutí větve Vercel nasadí náhled automaticky.

### Připomínkování (bez databáze)

Prototyp slouží i k připomínkování fungování chatbotů. V UI jsou dvě tlačítka: **„Odeslat připomínku"** (vpravo nahoře, obecná) a **„Připomínkovat odpověď"** (pod každou odpovědí chatbota — přibalí kontext: skupinu, dotaz učitele a danou odpověď). Připomínka jde na `/api/feedback`, který ji server-to-server přepošle do **Google Sheetu** přes Apps Script web app — žádná databáze. Nastavení krok za krokem: [`docs/pripominky-apps-script.md`](docs/pripominky-apps-script.md).

---

## 7. Reprodukce dat

Celý převod PDF → Markdown je skriptovaný (`scripts/`, Python + PyMuPDF) — reprodukovatelný a jednotný napříč katalogy. Postup, pravidla a kontrola kvality jsou v `data/REPORT.md` a v `zadani-prevod-katalogu.md`.

---

## Zdroj a autorství dat

Data pocházejí z **Katalogu podpůrných opatření** (Michalík, Baslerová, Felcmanová a kol.) týmu Pedagogické fakulty Univerzity Palackého v Olomouci — <http://katalogpo.upol.cz/>. Tento repozitář obsahuje strojově zpracovanou podobu katalogu pro účely aplikací AI dětem, z.s. (<https://aidetem.cz/>).

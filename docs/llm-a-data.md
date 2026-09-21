# Jak appka pracuje s daty a s LLM (pro technické kolegy)

Podklad pro rozhodnutí, jak katalog nasadit do Tiny. Popisuje, **co přesně se děje za běhu** v prototypu pro pedagogy — jak se data dostávají k modelu, kolik je toho v kontextu a jaké to má důsledky.

> **TL;DR:** Žádný agent, žádné RAG, žádné embeddingy, žádný tool-use. Učitel vybere kategorii žáka → appka **staticky vloží celý destilát té jedné kategorie do system promptu** → model odpovídá nad tím, co má v kontextu. Je to **deterministické „context stuffing" s routováním podle kategorie**, ne vyhledávání.

---

## 1. Runtime tok (co se stane při každé zprávě)

```
1) Učitel vybere 1 ze 7 kategorií (typ znevýhodnění)         [deterministické routování]
2) Backend načte z disku POUZE tuto kategorii:
     data/cards/<kat>/_prehled.md   (profil skupiny, ~0,5–1k tokenů)
     data/cards/<kat>/_all.md       (VŠECHNY destilované karty, ~15–24k tokenů)
3) Složí system prompt = [ instrukce ] + [ přehled + všechny karty ]  (druhý blok s cache_control)
4) Zavolá Claude (messages.stream) s celou historií konverzace
5) Streamuje odpověď zpět do UI
```

Zdrojové soubory: `app/api/chat/route.ts` (handler), `lib/prompt.ts` (skládání promptu), `lib/catalog.ts` (čtení dat), `lib/categories.ts` (7 kategorií).

---

## 2. Přímé odpovědi na otázky

**„Je tam agent?"** — Ne. Žádná smyčka, žádné rozhodování modelu o dalších krocích, žádné nástroje (tools). Jedno volání `messages.stream` → jedna odpověď. Konverzace je klasický multi-turn chat, ale model nikdy nic „nevolá" ani si nic nedožaduje.

**„Je to RAG?"** — Ne. Nic se nevyhledává. Není embedding model, není vektorová databáze, není retrieval krok, není re-ranking. Výběr obsahu je **deterministický podle kategorie** (7 pevných možností), ne podle podobnosti dotazu.

**„Projíždí model data po oblastech podpory?"** — Ne v tom smyslu, že by iteroval nebo prohledával. **Všech ~10 oblastí podpory dané kategorie je v kontextu naráz** (jsou slité v jednom souboru `_all.md`). Model je tam „vidí" celé zároveň a čte je jako běžný text v promptu. Oblasti jsou jen struktura uvnitř textu (nadpisy `##`/`###`), ne kroky nějakého procesu.

**„Načítá se celý katalog?"** — Ne. Načítá se **jen 1 kategorie** z 9. A jen její **destilovaná vrstva** (`cards/`), ne plné znění (`full/`). Plná vrstva se za běhu vůbec nečte.

---

## 3. Co konkrétně jde do kontextu

System prompt je pole dvou textových bloků (`lib/prompt.ts`):

```
[blok 1] ROLE_INSTRUCTIONS + název vybrané kategorie
         (vycházej jen z katalogu, uváděj kód+název opatření, ptej se na žáka, tvoř materiály)

[blok 2] "# PŘEHLED CÍLOVÉ SKUPINY" + _prehled.md
         "---"
         "# DESTILOVANÉ KARTY PODPŮRNÝCH OPATŘENÍ" + _all.md
         ⤷ cache_control: { type: "ephemeral" }     ← prompt caching
```

Pak `messages` = celá dosavadní historie konverzace (user/assistant).

**Rozpočet tokenů (vstup) na jeden request:**

| Část | Tokeny (odhad) |
|---|---|
| Instrukce (blok 1) | ~0,4k |
| `_prehled.md` | ~0,5–1k |
| `_all.md` (dle kategorie) | pas 14,9k · zp 15,3k · sp 15,8k · mp 16,1k · nks 16,3k · tp 18,1k · **szn 24,3k** |
| Historie konverzace | roste s tahy |

Takže **baseline ~16–25k vstupních tokenů** katalogu na každý dotaz, plus historie. Velký blok (přehled + karty) je stabilní → díky `cache_control` se v dalších tazích čte z **prompt cache** (řádově levnější a rychlejší; cache je krátkodobá/ephemeral).

**Model:** `ANTHROPIC_MODEL`, default `claude-sonnet-5`. `max_tokens: 8000`, `thinking: disabled`, běží na Node runtime (kvůli `fs`).

---

## 4. Proč to takhle funguje (a proč to zatím stačí)

Klíč je v **předzpracování dat**, ne v runtime chytrosti. Plné katalogy mají 130–275k tokenů each — to by se do promptu cpát nedalo. Proto existují **dvě vrstvy** (detail v kořenovém `README.md`):

- **Vrstva 1 `data/full/`** — věrný přepis PDF (zdroj pravdy). Za běhu se nepoužívá.
- **Vrstva 2 `data/cards/`** — ruční/řízená destilace každé karty do jednotné šablony (Kdy použít / Co to je / Jak ve výuce / Pozor na). Tím se katalog zmenší ~10× na ~15–24k tokenů/kategorie, což se **celé vejde do kontextu**.

Jinými slovy: „retrieval" už proběhl offline a natvrdo — výběrem kategorie a destilací. V runtime se nic nevybírá, model dostane kompletní relevantní podmnožinu a má **100% recall v rámci kategorie** (nemůže minout kartu kvůli špatnému retrievalu).

**Důsledky:**
- ✅ Deterministické, jednoduché, bez retrieval infrastruktury a bez rizika, že se nenajde relevantní karta.
- ✅ Cache-friendly (stabilní velký blok).
- ✅ Model vidí souvislosti napříč oblastmi (může kombinovat opatření).
- ⚠️ Fixní ~16–25k tokenů na request i pro triviální dotaz.
- ⚠️ Nese jen destilát; plný detail karty (ilustrační příklady, stupně podpory, legislativa) v kontextu není.
- ⚠️ Řeší vždy jednu kategorii. Souběh více znevýhodnění (časté! viz ADHD napříč díly) není nativně pokrytý.

---

## 5. Připravené, ale zatím NEnasazené: agentické dočítání (fáze 2)

Data jsou nachystaná i na variantu s nástrojem: `data/manifest.json` + `data/index.md` dávají strojový rejstřík (kód → název → cesta k plné kartě v `data/full/`). Zamýšlený tvar: do promptu jde rejstřík + tool `get_card(katalog, kod)`, model si vyžádá plné znění konkrétní karty, když destilát nestačí. **V kódu to zatím není** — přidalo by to tool-use smyčku do handleru. Zmiňuji, protože to je přirozený „hybrid" mezi současným stavem a RAG.

---

## 6. Podklad pro rozhodnutí o Tiny

Nechávám na vás, tady jsou varianty a jejich dopady. Rozlišujte dva různé případy užití — **asistent pro učitele** (velký kontext OK) vs. **chatbot pro dítě** (kontext musí být malý).

### A) Ponechat současný přístup (context injection destilátu)
- **Kdy dává smysl:** asistent pro pedagogy, kde ~16–25k tokenů katalogu není problém a chceme plný recall + jednoduchost.
- **Co doladit:** volitelně zmenšit `_all.md` (agresivnější destilace, vypuštění málo používaných karet), nebo řešit souběh kategorií (viz níže).

### B) RAG nad kartami
- **Kdy dává smysl:** když chcete výrazně menší kontext, škálovat na víc kategorií naráz, nebo mít jeden index napříč celým katalogem.
- **Zvážit:** karty jsou už teď krátké (~100–250 slov) a silně strukturované → chunking skoro netřeba; retrieval by běžel po celých kartách. Přináší to ale nedeterminismus (může minout kartu), embedding+vektorstore infra a latenci navíc. Granularita „card = 1 dokument" + metadata z `manifest.json` (kategorie, oblast, kód) je pro RAG ideální, pokud do něj půjdete.
- **Pozn.:** RAG řeší „které karty" — pořád platí, že destilát je levnější palivo než plné karty.

### C) Hybrid (destilát v kontextu + tool na plnou kartu)
- Fáze 2 výše. Malý stálý kontext (přehled + rejstřík), plný detail on-demand. Nese nedeterminismus jen tam, kde model sáhne pro detail.

### D) Chatboti pro děti v Tiny — NEcpát katalog do konverzace
- Doporučený vzor (viz kořenový `README.md`, kap. 4b): z destilátu + profilu žáka **offline vygenerovat krátký individualizační profil (~500–2000 tokenů)** komunikačních instrukcí a ten přibalit k system promptu chatbota. Do konverzace s dítětem katalog nikdy nejde. Tady je „menší kontext" splněný z principu.

### Průřezové téma: souběh znevýhodnění
Katalog i naše routování jsou po jedné kategorii, ale realita se kombinuje (např. ADHD figuruje v `pas`, `mp`, `tp`, `nks` …). Ať zvolíte cokoli, vyřešte, jak pokrýt více kategorií naráz — buď spojením destilátů (context stuffing více kategorií), nebo retrievalem napříč kategoriemi (RAG/hybrid).

---

## 7. Kam se podívat v repu

| Co | Kde |
|---|---|
| Runtime handler (volání modelu) | `app/api/chat/route.ts` |
| Skládání system promptu + prompt caching | `lib/prompt.ts` |
| Načtení destilátu z disku | `lib/catalog.ts` |
| 7 kategorií (routovací klíč) | `lib/categories.ts` |
| Data: destiláty / plné znění / rejstřík | `data/cards/` · `data/full/` · `data/manifest.json` · `data/index.md` |
| Datový model a dvě vrstvy (kontext) | kořenový `README.md` |
| Protokol převodu + tokenové odhady | `data/REPORT.md` |

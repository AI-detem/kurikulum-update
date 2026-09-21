# Kontext projektu pro vyhodnocování připomínek — Asistent pro individualizaci výuky

> Tento dokument je **zadávačka / kontext pro Claude Cowork**. Slouží k tomu, aby Cowork rozuměl aplikaci, datům a repozitáři a uměl pomáhat **vyhodnocovat připomínky** (feedback) od učitelů, kteří prototyp testují. Je psaný tak, aby stál sám o sobě — čtenář nemusí znát historii vývoje.

---

## 0. K čemu tento projekt slouží

V Cowork projektu budeme **procházet a vyhodnocovat připomínky** k aplikaci (sbírají se do Google Sheetu, viz kap. 5). Cíl:

- pochopit, čeho se připomínka týká (obsah/data, chování modelu, UI, rozsah funkcí),
- rozhodnout, **kam patří** a **jak je závažná**,
- navrhnout konkrétní řešení nebo další krok,
- držet přehled o opakujících se tématech.

Aby to šlo, potřebuje Cowork rozumět tomu, jak appka funguje a z čeho čerpá. To popisuje zbytek dokumentu.

---

## 1. Co je aplikace

**Asistent pro individualizaci výuky** — konverzační prototyp pro **učitele**. Učitel si vybere typ znevýhodnění žáka (cílovou skupinu) a povídá si s chatbotem, který mu radí, jak individualizovat výuku a materiály pro konkrétního žáka se speciálními vzdělávacími potřebami (SVP). Chatbot vychází **výhradně** z **Katalogu podpůrných opatření** (Michalík, Baslerová, Felcmanová a kol.; dílčí část SPUCH od Jucovičové a Žáčkové) — odborného zdroje týmu Pedagogické fakulty Univerzity Palackého v Olomouci (katalogpo.upol.cz).

Provozovatel: **AI dětem, z. s.** (aidetem.cz). Prototyp je testovací; později se má v nějaké míře přenést do aplikace **Tiny** (tiny.school).

**Důležité pro vyhodnocování:** appka NEMÁ radit „od sebe“. Má se držet katalogu, u opatření uvádět jeho **kód a název** (např. „2.3 Strukturalizace výuky“), ptát se na potřebné o žákovi a tvořit konkrétní materiály. Připomínku typu „vymyslel si opatření, které v katalogu není“ je proto potřeba brát vážně (viz kap. 6).

---

## 2. Jak appka technicky funguje (jádro)

**Bez RAG, bez agenta, bez vyhledávání.** Postup:

```
1) Učitel vybere 1 z 8 cílových skupin (typ znevýhodnění).
2) Backend deterministicky načte destilovanou vrstvu té skupiny
   (data/cards/<kat>/_prehled.md + _all.md) a vloží ji CELOU do system promptu.
3) Učitel popíše žáka a situaci; odpověď se streamuje z modelu Claude.
```

- **Deterministický výběr, ne RAG:** volba skupiny → pevně daný obsah katalogu. Nic se nevyhledává podle podobnosti dotazu.
- **Žádný agent, žádné tooly:** jedno volání modelu → jedna odpověď. Model si nic „nedožaduje“, neprochází data po krocích — celý destilát dané skupiny má naráz v kontextu a čte ho jako běžný text v promptu.
- **Prompt caching:** velký (stabilní) blok katalogu je označen `cache_control`, takže další tahy konverzace čtou vstup z cache (levněji a rychleji).
- **Model:** konfigurovatelný přes proměnnou `ANTHROPIC_MODEL`, výchozí `claude-sonnet-5`, pro vyšší kvalitu `claude-opus-5`.
- **Rozpočet kontextu:** destilát jedné skupiny má cca **15–24 tis. tokenů** (SPUCH ~11 tis.), plus historie konverzace.

Pozn.: appka za běhu čte **jen destilovanou vrstvu** (`data/cards/…`), ne plné znění (`data/full/…`). Plná vrstva je zdroj pravdy a rezerva pro budoucí „agentické dočítání“ (fáze 2, zatím nenasazeno).

Detailní rozbor pro techniky je v repu: `docs/llm-a-data.md`.

---

## 3. Data — dvě vrstvy, 10 katalogů

Data vznikla převodem 9 PDF Katalogu do Markdownu, ve dvou vrstvách (`data/`):

- **Vrstva 1 `data/full/`** — věrný, úplný přepis PDF (zdroj pravdy). Za běhu se nepoužívá.
- **Vrstva 2 `data/cards/`** — destiláty pro prompty:
  - `_prehled.md` — profil cílové skupiny (kdo to je, projevy, **zásady komunikace a práce se žákem**),
  - `_all.md` — všechny destilované karty katalogu v jednom souboru (jde do promptu),
  - jednotlivé karty `<kód>-<název>.md` (šablona: *Kdy použít / Co to je / Jak ve výuce / Pozor na*).

**Cílové skupiny dostupné v appce (8 chatbotů):**

| Kód | Skupina | Karet |
|---|---|---|
| `pas` | Poruchy autistického spektra a vybraná psych. onemocnění | 45 |
| `mp` | Mentální postižení | 50 |
| `nks` | Narušená komunikační schopnost | 50 |
| `sp` | Sluchové postižení | 47 |
| `zp` | Zrakové postižení | 47 |
| `tp` | Tělesné postižení a závažné onemocnění | 54 |
| `szn` | Sociální znevýhodnění | 77 |
| `spuch` | Specifické poruchy učení a chování (dyslexie, dysgrafie, dysortografie, dyskalkulie, ADHD/ADD) | 18 |

Další dva katalogy (`vseobecny` — obecná část/metodika, `szn-metodika`) jsou v datech jako podklad, ale **nejsou to cílové skupiny v appce** (nemají chatbota).

**Celkem 388 destilovaných karet.** Rejstřík: `data/index.md` (pro lidi) a `data/manifest.json` (strojově). Protokol o převodu a kontrole kvality: `data/REPORT.md`.

**Na co u připomínek myslet ohledně dat:**
- `spuch` má **odlišnou, prozaickou strukturu** (kapitoly, ne standardizované karty PO) a jeho destiláty jsou nové — u připomínek k SPUCH je vyšší šance na potřebu odborné revize.
- ADHD/poruchy pozornosti se v katalogu objevují **napříč** (hlavně `spuch` a `pas`, karta „2.8 Prevence únavy a podpora koncentrace pozornosti“ i v ostatních dílech). Katalog i appka pracují **po jedné skupině** — souběh více znevýhodnění není nativně pokrytý.

---

## 4. Obsah repozitáře (GitHub)

- **Repo:** `aidetemcz/podpurna-opatreni`
- **Pracovní větev:** `claude/prevod-katalogu-4c5gcn` (na ní běží Vercel náhled; k větvi je draft PR)

```
app/
  page.tsx              výběr skupiny (levý panel) + chat (client)
  api/chat/route.ts     streamované volání modelu Claude (Node runtime)
  api/feedback/route.ts příjem připomínky → přeposlání do Google Sheetu
  Feedback.tsx          modální okno připomínky
  Markdown.tsx          render odpovědí jako Markdown
  Logo.tsx, layout.tsx, globals.css
lib/
  categories.ts         8 cílových skupin (routovací klíč)
  catalog.ts            načtení destilované vrstvy z data/cards/
  prompt.ts             sestavení system promptu (role + katalog + prompt caching)
data/
  full/                 vrstva 1 (věrný přepis)
  cards/                vrstva 2 (destiláty pro prompt)
  manifest.json, index.md, REPORT.md
scripts/                extrakční pipeline PDF → Markdown (Python + PyMuPDF)
katalog-pdf/            zdrojová PDF
docs/
  llm-a-data.md                 jak model pracuje s daty (pro LLM inženýry)
  pripominky-apps-script.md     návod na sběr připomínek do Google Sheetu
  cowork-kontext-pripominky.md  tento dokument
README.md               přehled projektu, datový model, nasazení
```

Klíčový soubor pro chování chatbota je **`lib/prompt.ts`** — obsahuje `ROLE_INSTRUCTIONS` (systémové instrukce: drž se katalogu, cituj kód+název, ptej se na žáka, tvoř materiály). Když připomínka míří na *chování/tón/formát odpovědí*, řešení je typicky tady.

Nasazení: Next.js na **Vercelu**. Tajný klíč `ANTHROPIC_API_KEY` je jen jako Vercel env proměnná (nikdy v gitu). Volitelně `ANTHROPIC_MODEL` a `FEEDBACK_WEBHOOK_URL`.

---

## 5. Jak vznikají a kam chodí připomínky

V appce jsou **dvě tlačítka**:

1. **„Odeslat připomínku“** (vpravo nahoře) — obecná připomínka k fungování chatbota.
2. **„Připomínkovat odpověď“** (pod každou odpovědí chatbota) — připomínka ke konkrétní odpovědi; **automaticky přibalí kontext**: skupinu žáka, poslední dotaz učitele a danou odpověď.

Připomínka jde na `/api/feedback`, který ji server-to-server přepošle do **Google Sheetu** (přes Google Apps Script web app). Žádná databáze. Nastavení: `docs/pripominky-apps-script.md`.

**Každý řádek v Sheetu má sloupce:**

| Sloupec | Význam |
|---|---|
| `čas` | ISO timestamp odeslání |
| `typ` | `obecná` nebo `k odpovědi` |
| `skupina` | název cílové skupiny (např. „Zrakové postižení“) |
| `autor` | nepovinné jméno/e-mail |
| `připomínka` | text od učitele |
| `dotaz učitele` | (u typu „k odpovědi“) předcházející dotaz |
| `odpověď chatbota` | (u typu „k odpovědi“) připomínkovaná odpověď |
| `user agent` | prohlížeč/zařízení |

> Do Cowork projektu se hodí dávat **export nebo odkaz na tento Sheet** jako druhý zdroj (vedle tohoto dokumentu). Cowork pak páruje připomínky s kontextem appky.

---

## 6. Jak připomínky vyhodnocovat (rámec pro triáž)

Pro každou připomínku doporučuji projít:

**A) Čeho se týká — kam patří (locus):**

| Kategorie | Poznávací znak | Kde se typicky řeší |
|---|---|---|
| **Obsah / data** | Rada je věcně špatně, chybí opatření, nesedí s praxí, „tohle katalog neříká / naopak říká jinak“ | `data/cards/<kat>/…` (destilát), ověřit proti `data/full/<kat>/…` |
| **Chování / prompt** | Model si vymýšlí mimo katalog, necituje kód+názvy, neptá se na žáka, je moc obecný/rozvláčný, špatný tón | `lib/prompt.ts` (ROLE_INSTRUCTIONS) |
| **Kvalita modelu** | Odpovědi celkově slabé / nekonzistentní i při dobrém promptu | zvážit `ANTHROPIC_MODEL` (sonnet → opus) |
| **UI / UX** | Ovládání, čitelnost, mobil, tlačítka, formátování | `app/…`, `globals.css` |
| **Mimo rozsah / nápad na funkci** | Přání nové funkce (profil žáka, export, souběh znevýhodnění, dočítání plných karet) | roadmap (kap. 7), ne bug |

**B) Ověření (zvlášť u „obsah/data“):** je připomínka v souladu s katalogem? Porovnat s destilátem (`_all.md`) a se zdrojem pravdy (`data/full/…`). Odlišit „appka poradila blbost“ od „appka správně odcituje katalog, ale učiteli se to nelíbí / má jiný názor než katalog“.

**C) Závažnost:** 
- **vysoká** — odborně chybná/nebezpečná rada, opatření mimo katalog, faktická chyba;
- **střední** — chybí užitečná věc, nepřesnost, matoucí formulace;
- **nízká** — kosmetika, formát, preference.

**D) U typu „k odpovědi“** vždy číst přiložený `dotaz učitele` + `odpověď chatbota` — kontext je v řádku. U „obecná“ kontext chybí, případně dohledat u autora.

**E) Výstup vyhodnocení** (návrh formátu, který si v projektu můžeme držet): *kategorie → závažnost → shrnutí → doporučená akce (konkrétní soubor/opatření) → opakuje se? (téma)*.

**Užitečné otázky, které si klást:**
- Je to reálný problém appky, nebo nedorozumění o tom, k čemu slouží?
- Týká se to jedné skupiny, nebo je to průřezové (pak spíš prompt)?
- Dá se to ověřit v datech? Kde?
- Je to jednorázová oprava karty, systémová úprava promptu, nebo nová funkce?

---

## 7. Stav a plánované fáze (pomáhá triáži „bug vs. nápad“)

- **Hotovo:** výběr skupiny, destilát v system promptu, streamovaný chat, branding (bílé pozadí, akcent #DC5B5B, fonty Space Grotesk/Inter, logo AI dětem), render Markdownu, připomínkování do Google Sheetu, 8 cílových skupin včetně nově doplněného SPUCH.
- **Provedené úpravy — 1. kolo připomínek:**
  - prompt: kód+název opatření jen při prvním výskytu (méně opakování), neuvádět katalog jako zdroj v každé odpovědi, žádné šablonovité závěrečné nabídky (záznamový arch apod.), vykání a čtivější jazyk (pokyny žákovi jako přímá řeč), explicitní zákaz rozporovat Doporučení ŠPZ, oddělení hotového materiálu od komentáře a psaní materiálů pro tisk (tabulky místo ASCII rámečků);
  - UI: chytrý autoscroll (neskáče, když čtu odscrolované) + tlačítko „Přejít na konec", plynulejší streamování, pod odpovědí tlačítka **Kopírovat** (do Wordu/Docs bez rozsypání) a **Uložit jako PDF** (tisk jedné odpovědi s čistou typografií), v popisu skupiny SPUCH zviditelněny poruchy chování (ADHD/ADD), nápověda o tom, co asistent umí/neumí.
- **Fáze 2 (plán):** agentické dočítání — model dostane rejstřík (`index.md`/`manifest.json`) a nástroj `get_card`, kterým si vyžádá plné znění karty z `data/full/`. Řeší připomínky typu „chybí detail, který v plné kartě je“.
- **Fáze 3 / roadmap (plán):** profil žáka (stupeň, předmět), export materiálů **do .docx**, **generování/vkládání obrázků** do materiálů, samostatné pokrytí **poruch chování nad rámec ADHD/ADD** (opoziční vzdor, poruchy chování — datové omezení Katalogu, vyžaduje odbornou revizi obsahu), více žáků / uložení.
- **Známá omezení:** práce po jedné skupině (souběh znevýhodnění neřešen), destiláty SPUCH jsou nové a chtějí odbornou kontrolu, appka nese jen destilát (ne plný detail karty), materiály jsou zatím jen textové (bez obrázků; PDF/kopírování řeší přenos do Wordu).

---

## 8. Glosář zkratek

SVP = speciální vzdělávací potřeby · PO = podpůrné opatření · SPU = specifické poruchy učení · SPCH = specifické poruchy chování · SPUCH = specifické poruchy učení a chování · ADHD/ADD = porucha pozornosti s hyperaktivitou / bez ní · IVP = individuální vzdělávací plán · ŠPZ = školské poradenské zařízení · AP = asistent pedagoga · RAG = retrieval-augmented generation (vyhledávání do promptu — v této appce se NEpoužívá).

---

## 9. Odkazy

- Web AI dětem: <https://aidetem.cz/>
- Katalog podpůrných opatření (zdroj dat): <http://katalogpo.upol.cz/>
- Repozitář: `aidetemcz/podpurna-opatreni`, větev `claude/prevod-katalogu-4c5gcn`
- Dokumenty v repu: `README.md`, `docs/llm-a-data.md`, `docs/pripominky-apps-script.md`, `data/REPORT.md`

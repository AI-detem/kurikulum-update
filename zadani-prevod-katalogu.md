# Zadání: Převod Katalogu podpůrných opatření z PDF do Markdownu (dvě vrstvy)

## Kontext — proč to děláme

Jsme AI dětem, z.s. Připravujeme testování ve školách a Katalog podpůrných opatření (Michalík, Baslerová, Felcmanová a kol.) je datový základ pro dvě aplikace:

1. **Prototyp pro pedagogy** — konverzační aplikace, ve které si učitel povídá s chatbotem a ten mu pomáhá individualizovat výuku a výukové materiály pro žáky se specifickými vzdělávacími potřebami. Aplikace pracuje s katalogem dvěma způsoby: destilovaná verze příslušné kategorie se vkládá do system promptu (deterministický výběr podle typu znevýhodnění žáka, ne RAG) a plná verze slouží pro agentické dočítání — model má k dispozici manifest/rejstřík a umí si vyžádat konkrétní kartu v plném znění. Prototyp později v nějaké míře implementujeme do aplikace Tiny (tiny.school).

2. **Chatboti v Tiny** — naši výukoví chatboti (Opakovací parťák, Zvědavý mimoň, Argumentační partner ad.) si povídají přímo s dětmi se specifickými vzdělávacími potřebami. Katalog se **nevkládá do konverzace s dítětem**. Slouží offline jako zdroj pro jednorázové vygenerování krátkého **individualizačního profilu žáka** (~500–2000 tokenů konkrétních komunikačních instrukcí), který se přibalí k system promptu chatbota. K tomu potřebujeme destilované karty a přehledové soubory per kategorie.

Z toho plyne požadavek na **dvě vrstvy převodu**: věrnou (zdroj pravdy, agentické čtení) a destilovanou (vejde se do promptů).

## Vstupy

Devět PDF v tomto repozitáři:

| Soubor | Obsah | Zkratka |
|---|---|---|
| `katalog-vseobecny.pdf` | Obecná část (metodika, struktura karet, oblasti podpory) | vseobecny |
| `katalog-tp.pdf` | Dílčí část — tělesné postižení a závažné onemocnění | tp |
| `katalog-zp.pdf` | Dílčí část — zrakové postižení | zp |
| `katalog-sp.pdf` | Dílčí část — sluchové postižení | sp |
| `katalog-mp.pdf` | Dílčí část — mentální postižení | mp |
| `katalog-nks.pdf` | Dílčí část — narušená komunikační schopnost | nks |
| `katalog-pas.pdf` | Dílčí část — poruchy autistického spektra | pas |
| `katalog-szn.pdf` | Dílčí část — sociální znevýhodnění | szn |
| `katalog-szn-metodika.pdf` | Metodika k SZN | szn-metodika |

PDF jsou textová (ne skeny). Nezpracovávej celé PDF najednou — čti po stránkách/kapitolách a průběžně zapisuj výstup.

## Výstupní struktura

```
data/
  full/                      # VRSTVA 1 — věrný převod
    vseobecny/
      01-<nazev-kapitoly>.md
      02-...
    tp/
      oblast-01-organizace-vyuky.md      # jeden soubor = jedna oblast podpory, karty uvnitř
      oblast-02-modifikace-metod.md
      ...
    zp/ ... (stejně pro sp, mp, nks, pas, szn, szn-metodika)
  cards/                     # VRSTVA 2 — destilované karty
    tp/
      _prehled.md            # profil cílové skupiny (viz níže)
      _all.md                # všechny destilované karty katalogu v jednom souboru (pro system prompt)
      2-1-zpusoby-vyuky.md   # jedna karta = jeden soubor
      ...
    zp/ ... (stejně pro ostatní dílčí katalogy)
  manifest.json
  index.md
  REPORT.md
```

Názvy souborů: malá písmena, bez diakritiky, pomlčky (slugify z názvu karty/kapitoly), s číselným prefixem podle číslování v katalogu.

## Vrstva 1 — identický převod (`data/full/`)

Cíl: věrný, úplný přepis obsahu PDF do čistého Markdownu. **Nic nezkracuj, neshrnuj, nepřeformulovávej.**

Pravidla:

- **Oprav artefakty extrakce z PDF:** slij řádky rozsekané zlomem řádku do souvislých odstavců; odstraň rozdělovací spojovníky z konců řádků (`po-` + `stupu` → `postupu`) včetně neviditelných artefaktů (soft hyphen, znaky typu ``, `­`); odstraň záhlaví/zápatí stránek, čísla stránek a opakující se běhy typu „KATALOG PODPŮRNÝCH OPATŘENÍ • DÍLČÍ ČÁST…“.
- **Zachovej strukturu a číslování** oblastí a karet přesně podle katalogu (např. `2.1 Způsoby výuky adekvátní pedagogické situaci`).
- **Hierarchie nadpisů:** `#` = katalog/kapitola, `##` = oblast podpory, `###` = karta podpůrného opatření (s číslem), `####` = standardizované sekce karty. Sekce karet piš jednotně v tomto pořadí a znění (tak jsou v katalogu):
  1. `#### Projevy na straně žáka, na které opatření reaguje`
  2. `#### Popis opatření` (podsekce *V čem spočívá* a *Čemu pomáhá* jako tučné odstavce, ne další nadpisy)
  3. `#### Aplikace opatření a specifikace podmínek`
  4. `#### Na co klást důraz`
  5. `#### Rizika`
  6. `#### Ilustrační příklad`
  7. `#### Cílové skupiny`
  8. `#### Varianty opatření dle stupňů podpory` (Stupeň 1–5 jako tučné odstavce)
  9. `#### Metodické zdroje, odkazy, odborná literatura`
- U karty zachovej i **jméno autora/autorky** a **oblast podpory**, do které karta patří.
- Odrážkové seznamy z PDF převáděj na MD odrážky, tabulky na MD tabulky. Obrázky/schémata nahraď stručným popisem: `> [Obrázek: popis]`.
- **YAML frontmatter** na začátku každého souboru s kartami:

```yaml
---
katalog: tp
oblast: "2 — Modifikace vyučovacích metod a forem práce"
karty: ["2.1", "2.2", ...]
zdroj: katalog-tp.pdf
vrstva: full
---
```

## Vrstva 2 — destilované karty (`data/cards/`)

Cíl: operativní znalost pro LLM prompty. Zdroj: pouze vrstva 1 (nikdy nedomýšlej nic, co v kartě není — žádné halucinace, žádné vlastní pedagogické rady navíc).

**Šablona destilované karty** (jedna karta = jeden soubor, a tatáž karta i v `_all.md`):

```markdown
### {číslo} {Název opatření}
**Kdy použít (projevy žáka):** 1–3 řádky nejtypičtějších projevů.
**Co to je:** 1–2 věty podstaty opatření.
**Jak ve výuce:** 3–6 odrážek — konkrétní, akční kroky pro učitele (z „Aplikace opatření").
**Pozor na:** 1–3 odrážky — sloučené to podstatné z „Na co klást důraz" + „Rizika".
**Cílové skupiny:** MŠ / ZŠ 1. st. / ZŠ 2. st. / SŠ (jen pokud je omezené).
**Stupně podpory:** jen pokud se realizace mezi stupni věcně liší — pak 1 řádek na stupeň; jinak sekci vynech.
```

**Vypusť úplně:** metodické zdroje a literaturu, legislativní a institucionální kontext (výjezdy SPC, financování…), ilustrační příklady (max. lze vytěžit do jedné odrážky v „Jak ve výuce", pokud nese konkrétní techniku), duplicity a obecné proklamace.

**Cílová délka:** 100–250 slov na kartu (tvrdý strop ~1 500 znaků). Cíl za celý dílčí katalog: `_all.md` ≤ ~15 000 tokenů. Piš úsporně, věcně, v instrukčním tónu; zachovej odbornou českou terminologii (IVP, ŠPZ, AAK…) — při prvním výskytu v `_all.md` rozepiš zkratku.

**`_prehled.md`** (pro každý dílčí katalog): ~300–600 slov — kdo je cílová skupina, typické projevy ve vzdělávání, obecné zásady komunikace a práce s žákem, přehled 10 oblastí podpory s jednořádkovou anotací. Tenhle soubor je základ pro generování individualizačních profilů žáků v Tiny, takže důraz na komunikační zásady (jak s žákem mluvit, čeho se vyvarovat).

U `vseobecny` a `szn-metodika` destiluj jen to, co je operativně užitečné (stupně podpory, oblasti podpory, jak číst karty) do jednoho souboru `cards/vseobecny/_prehled.md`; karty tam nejsou.

## Manifest a index

- `manifest.json`: pro každý katalog pole oblastí a karet — `{"kod": "2.1", "nazev": "…", "oblast": "…", "anotace": "jedna věta", "full": "data/full/tp/oblast-02-….md", "card": "data/cards/tp/2-1-….md"}`. Přidej i metadata katalogu (název, cílová skupina, cesty k `_prehled.md` a `_all.md`).
- `index.md`: lidsky čitelný rejstřík — totéž ve formě tabulek. Slouží zároveň jako obsah pro agentické dočítání (vloží se do system promptu prototypu).

## Kontrola kvality (povinná)

1. **Úplnost:** spočítej karty v obsahu každého PDF a ověř, že počet karet ve vrstvě 1, vrstvě 2 i manifestu sedí. Rozdíly vypiš.
2. **Věrnost:** u každého katalogu namátkou porovnej 2–3 karty vrstvy 1 s PDF (žádné vynechané sekce, správně slité odstavce, žádné zbytky záhlaví).
3. **Destiláty:** namátkou ověř, že destilovaná karta neobsahuje nic, co není v plné kartě.
4. **Technicky:** validní Markdown, jednotná hierarchie nadpisů, funkční cesty v manifestu, žádné zbylé artefakty (``, rozdělená slova, čísla stránek).
5. **REPORT.md:** tabulka per katalog — počet oblastí, počet karet, odhad tokenů full i `_all.md` (spočti např. tiktokenem/odhadem znaky÷2,5), nalezené problémy a jak jsi je vyřešil, co vyžaduje lidskou kontrolu.

## Postup

Pracuj po katalozích, každý katalog = samostatný commit (`convert: katalog-tp (full + cards)`).

1. Nejdřív `katalog-vseobecny.pdf` — z něj vytěž přesnou strukturu karty PO a seznam oblastí podpory (kapitoly o metodice), ať máš šablonu ověřenou.
2. Pak dílčí katalogy: `pas`, `mp`, `nks`, `sp`, `zp`, `tp`, `szn`, nakonec `szn-metodika`.
3. Průběžně aktualizuj `manifest.json` a `index.md`, na závěr `REPORT.md`.

Pokud v PDF narazíš na strukturu, která neodpovídá tomuto zadání (jiné sekce karty, podkarty PO), zachovej ji ve vrstvě 1 věrně, v destilátu ji zapracuj do nejbližší sekce šablony a poznamenej to do REPORT.md.

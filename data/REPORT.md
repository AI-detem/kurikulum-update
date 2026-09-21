# REPORT — převod Katalogu podpůrných opatření do Markdownu

Stav: **kompletní** — všech 9 katalogů (obecná část, 7 dílčích, metodika k SZN) převedeno do dvou vrstev.

## Metodika

Převod je plně skriptovaný (Python + PyMuPDF, `./scripts/`), aby byl reprodukovatelný a jednotný napříč katalogy. Destilace (vrstva 2) probíhala v řízených dávkách podle jednotné šablony a pravidel, s namátkovou i automatickou kontrolou věrnosti.

- **Extrakce po blocích** s řazením podle pozice (řeší boxový layout, kde se úvod oblasti mísí s první kartou; nadpisy sekcí mají mírně nižší bbox než jejich odstavec — kompenzováno biasem).
- **Čištění artefaktů:** slévání rozsekaných řádků do odstavců; rozdělovací a měkké spojovníky (`­`, `\xad`), nulové mezery (`​`), řídicí znaky (`\x07`); normalizace nedělitelných mezer; odstranění běžících záhlaví/zápatí a čísel stránek (pásmo y a známé fráze).
- **Mezerované nadpisy** („P R O J E V Y …") se rozpoznávají porovnáním textu bez mezer proti uzavřené množině sekcí, s podmínkou verzálek (brání záměně s odstavcem začínajícím stejným slovem).
- **Detekce karet a oblastí z těla** (ne z TOC — to je místy neúplné), s rekonciliací proti kotvám „Oblast podpory:".

## Souhrn per katalog

Odhad tokenů = znaky ÷ 2,5 (konzervativní pro češtinu; skutečnost bývá nižší).

| Katalog | Oblasti / kap. | Karty | Full (odhad tok.) | `_all.md` (odhad tok.) |
|---|---|---|---|---|
| vseobecny | 13 kapitol | — | ~171 000 | — (jen `_prehled.md`) |
| tp | 10 | 54 | ~221 000 | ~18 100 |
| zp | 10 | 47 | ~162 000 | ~15 300 |
| sp | 10 | 47 | ~131 000 | ~15 800 |
| mp | 9 | 50 | ~171 000 | ~16 100 |
| nks | 10 | 50 | ~154 000 | ~16 300 |
| pas | 10 | 45 | ~171 000 | ~14 900 |
| szn | 10 | 77 | ~275 000 | ~24 300 |
| szn-metodika | 8 kapitol | — | ~121 000 | — (jen `_prehled.md`) |
| spuch | 16 kapitol / 12 kap. PO | 18 | ~236 000 | ~10 900 |
| **Celkem** | | **388 karet** | | |

*(mp nemá oblast č. 8 — v předloze k ní nejsou karty.)*

*(spuch — dílčí část specifické poruchy učení a chování /Jucovičová, Žáčková, 2020/ — má **odlišnou, prozaickou strukturu** než ostatní dílčí katalogy: nemá oblasti podpory ani standardizované karty PO, nýbrž kapitoly 1–7. Vrstva 1 je členěná na 16 souborů podle tištěného obsahu; destilované „karty" (18) odpovídají kapitolám podpůrných opatření 4.1–4.12. Extrakce vlastním skriptem `scripts/build_spuch.py`, destilace ručně ze plných kapitol.)*

## Kontrola kvality

1. **Úplnost:** u všech 7 dílčích katalogů souhlasí počet karet s počtem kotev „Oblast podpory:" ve **všech oblastech** (celkem 370). Rozdíly: žádné.
2. **Věrnost (vrstva 1):** namátkou ověřeny karty tp 1.1, pas 1.1, pas 8.3, mp 6.1 — sekce kompletní, odstavce správně slité, číslované seznamy i odrážky zachovány, bez zbytků záhlaví.
3. **Destiláty (vrstva 2):** namátkou ověřeny (pas 8.3, mp 6.1) proti plným kartám — žádná informace mimo zdroj, korektně vypuštěna legislativa/zdroje. Automatická kontrola napříč všemi katalogy: žádná karta nemá prázdné `projevy` ani zbloudilý „Stupeň" v jiné sekci.
4. **Technicky:** validní Markdown, jednotná hierarchie (`#` katalog/kapitola, `##` oblast, `###` karta, `####` sekce karty), frontmatter u full souborů i per-card souborů. **Všech 370 cest v `manifest.json` ověřeno na disku (0 chybějících).**

## Nalezené odchylky a jak byly řešeny

- **Podkarty (tříúrovňové kódy)** — např. `3.2.3`, `4.2.2`, `9.1.5`: mají vlastní plnou sadu sekcí. Ve vrstvě 1 zachovány věrně jako `###` s příznakem *(podkarta)*, ve vrstvě 2 mají vlastní destilát, v manifestu `typ: podkarta`.
- **Zastřešující karty (zejména szn)** — některé karty mají jen *Projevy* + *Popis* a operativní obsah je v podkartách. Věrně zachováno; destilát je odpovídajícím způsobem kratší (jen „Kdy použít" + „Co to je"), bez domýšlení.
- **Nekonzistentní číslování** — v pas karta nesla prefix kapitoly (`4.2.9`); znormalizováno na `2.9`. Číslování podkaret v předloze místy nespojité (např. `3.5.1` → `3.5.7`) — čísla přebrána věrně z PDF.
- **Chybějící záložky (TOC):** oblast 9 v pas a oblasti obecně se detekují z těla, ne z TOC (pas TOC skáče 4.8 → 4.10).
- **Karty vynechávající sekce** (např. tp 1.5 bez „Aplikace"/„Na co klást důraz") — věrně zachováno, nedoplňováno.
- **Běžící záhlaví v próze** prosakující do těla + záměna odstavce začínajícího „Projevy…" za nadpis sekce — opraveno (filtr pásma y + podmínka verzálek), zasažené karty přegenerovány.
- **szn-metodika:** vadné záložky „Prázdná stránka" s chybným rozsahem (duplikovaly celý dokument) odfiltrovány; ponechány jen kapitoly s monotónním stránkováním.

## Vyžaduje lidskou kontrolu / rozhodnutí

1. **Rozpočet `_all.md` u velkých katalogů.** Cíl ≤ 15k tokenů je reálný jen do ~45 karet. I s úspornými kartami (80–130 slov, strop ~900 znaků) vycházejí větší katalogy výš: mp/nks/zp/sp ~15–16k, tp ~18k, **szn (77 karet) ~24k**. Per-card soubory + `_prehled.md` fungují pro agentické dočítání i individualizační profily bez ohledu na velikost `_all.md`; pokud je `_all.md` do promptu u velkých katalogů problém, lze jej rozdělit po oblastech nebo se u nich spolehnout na `_prehled.md` + agentické dočítání karet.
2. **Zkratky** řešeny legendou na začátku `_all.md` (místo rozepsání při prvním výskytu) — jednodušší a robustní; potvrdit, že vyhovuje.
3. **Nespojité číslování podkaret** — čísla přebrána z PDF; doporučuji namátkové ověření, zda v předloze nechybí mezilehlé podkarty (rekonciliace kotev sedí, ale číslování je zvláštní).
4. **Titulky karet** převedeny z verzálek na větné psaní se zachováním zkratek (whitelist); ojedinělá zkratka mimo whitelist může zůstat malými písmeny.
5. **Úvodní/přílohové kapitoly** dílčích katalogů (vymezení, dopady, diagnostika, slovník) jsou převedeny do `data/full/<kat>/` nad rámec ilustrativní struktury v zadání — kvůli „nic nezkracuj".

## Reprodukce

```
pip install pymupdf
python3 scripts/generate.py <kat>          # vrstva 1 (full) pro dilci katalog
python3 scripts/generate.py vseobecny      # vrstva 1 pro obecnou cast
python3 scripts/extract_cards.py <kat> json # karty rozsekane na sekce (vstup destilace)
python3 scripts/assemble_cards.py <kat> <dir_destilatu>  # vrstva 2 (_all.md + per-card)
python3 scripts/generate_manifest.py       # manifest.json + index.md
```

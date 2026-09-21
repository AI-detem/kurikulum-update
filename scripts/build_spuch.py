# -*- coding: utf-8 -*-
"""Vrstva 1 (full) pro dilci katalog SPUCH (Jucovicova, Zackova 2020).
Tento katalog ma prozaickou strukturu (kapitoly 1-7), nema zalozkovy TOC ani
'oblasti/karty'. Struktura se bere z tistene 'Obsah' (offset pdf = tistena - 1).
Cisti bezici zahlavi (proklad pismen) a ligaturove artefakty (fi/fl)."""
import fitz, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from parse_dilci import join_para, has_bullets, split_bullets, sentence_case_title
from build_prose import is_prose_heading, looks_author

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'full', 'spuch')
PDF = os.path.join(ROOT, 'katalog-pdf', 'KPO_cast_SPUCH.pdf')

LIG = {'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl'}

# Bezici zahlavi (po odstraneni vsech mezer, velka pismena)
HEADERS = {'KATALOGPODPŮRNÝCHOPATŘENÍ', 'SPECIFICKÉPORUCHYUČENÍACHOVÁNÍ'}


def nows(s):
    return re.sub(r'\s+', '', s)


def fix_ligatures(t):
    for k, v in LIG.items():
        t = t.replace(k, v)
    # ligatura rozdelena mezerou: 'speci fi cke' -> 'specificke';
    # lookahead vc. spojovniku resi i deleni na konci radku ('klasifi -' -> 'klasifi-')
    t = re.sub(r'(?<=[A-Za-zÁ-Žá-ž])(ffi|ffl|ff|fi|fl) (?=[-a-zá-ž])', r'\1', t)
    return t


def clean_block(txt):
    """vycisti blok: odstran bezici zahlavi, cisla stranek, ikony; oprav ligatury."""
    lines = []
    for line in txt.split('\n'):
        l = line.replace('\x07', '').replace('​', '').replace('\xad', '')
        # cislo stranky samostatne
        stripped = l.strip()
        # odstran vedouci cislo stranky (napr. '10 KATALOG...')
        n = nows(stripped).upper()
        # bezici zahlavi (i s vedoucim cislem stranky)
        n2 = re.sub(r'^\d{1,3}', '', n)
        if n in HEADERS or n2 in HEADERS:
            continue
        if re.fullmatch(r'\d{1,3}', stripped):
            continue
        # ikony (ctverecek u literatury/prikladu)
        l = l.replace('◾', '').replace('◼', '').replace('■', '')
        lines.append(l)
    return fix_ligatures('\n'.join(lines))


def collect(doc, p0, p1):
    out = []
    for pi in range(p0, p1):
        for b in doc[pi].get_text('blocks', sort=True):
            x0, y0, x1, y1, txt, bno, bt = b
            if bt != 0:
                continue
            txt = clean_block(txt)
            if not txt.strip():
                continue
            out.append((pi, y0, x0, txt))
    out.sort(key=lambda r: (r[0], r[1], r[2]))
    return out


def build(doc, p0, p1, title, base_level=1):
    blocks = collect(doc, p0, p1)
    out = [f'{"#"*base_level} {title}\n']
    last_level = base_level
    for pi, y0, x0, txt in blocks:
        if looks_author(txt):
            out.append(f'*{re.sub(chr(92)+"s+"," ",txt).strip()}*\n')
            continue
        h = is_prose_heading(txt)
        if h:
            level, hnum, htext = h
            if hnum is not None:
                hl = min(base_level - 1 + level, 6)
                last_level = hl
            else:
                hl = min(last_level + 1, 6)
            prefix = f'{hnum} ' if hnum else ''
            out.append(f'\n{"#"*hl} {prefix}{htext}\n')
            continue
        if has_bullets(txt):
            lead, items = split_bullets(txt)
            if lead:
                out.append(join_para(lead))
            for it in items:
                out.append(f'- {it}')
            out.append('')
        else:
            p = join_para(txt)
            if p:
                out.append(p + '\n')
    return '\n'.join(out)


def frontmatter(kapitola):
    return ('---\n'
            'katalog: "spuch"\n'
            f'kapitola: {kapitola!r}\n'.replace("'", '"') +
            'zdroj: "KPO_cast_SPUCH.pdf"\n'
            'vrstva: "full"\n'
            'typ: "kapitola"\n'
            '---\n\n')


def collapse(md):
    return re.sub(r'\n{3,}', '\n\n', md).strip() + '\n'


# (soubor, titulek, pdf_start, pdf_end, kapitola_pro_frontmatter)
CHAPTERS = [
    ('01-uvod.md', 'Úvod', 7, 10, 'Úvod'),
    ('02-charakteristika-znevyhodneni.md', 'Charakteristika daného znevýhodnění', 10, 41, 'Charakteristika daného znevýhodnění'),
    ('03-dopady-znevyhodneni-na-vzdelavani.md', 'Dopady znevýhodnění na vzdělávání', 41, 69, 'Dopady znevýhodnění na vzdělávání'),
    ('04-pedagogicka-diagnostika-spu-a-spch.md', 'Pedagogická diagnostika specifických poruch učení a chování', 69, 85, 'Pedagogická diagnostika specifických poruch učení a chování'),
    ('05-po-individualni-vzdelavaci-plan.md', 'Individuální vzdělávací plán', 85, 87, 'Kapitoly podpůrných opatření — Individuální vzdělávací plán'),
    ('06-po-metody-vyuky.md', 'Metody výuky', 87, 149, 'Kapitoly podpůrných opatření — Metody výuky'),
    ('07-po-organizace-vyuky.md', 'Organizace výuky', 149, 163, 'Kapitoly podpůrných opatření — Organizace výuky'),
    ('08-po-uprava-obsahu-a-vystupu-vzdelavani.md', 'Úprava obsahu a očekávaných výstupů vzdělávání', 163, 164, 'Kapitoly podpůrných opatření — Úprava obsahu a výstupů vzdělávání'),
    ('09-po-predmety-specialnepedagogicke-pece.md', 'Předměty speciálněpedagogické péče', 164, 181, 'Kapitoly podpůrných opatření — Předměty speciálněpedagogické péče'),
    ('10-po-intervence-pocet-zaku-personalni-podpora.md', 'Pedagogická intervence, snížený počet žáků ve třídě, personální podpora', 181, 183, 'Kapitoly podpůrných opatření — Intervence, počet žáků, personální podpora'),
    ('11-po-hodnoceni.md', 'Hodnocení', 183, 200, 'Kapitoly podpůrných opatření — Hodnocení'),
    ('12-po-pomucky.md', 'Pomůcky', 200, 208, 'Kapitoly podpůrných opatření — Pomůcky'),
    ('13-po-podpurna-opatreni-jineho-druhu.md', 'Podpůrná opatření jiného druhu', 208, 216, 'Kapitoly podpůrných opatření — Podpůrná opatření jiného druhu'),
    ('14-slovnik-odbornych-pojmu.md', 'Slovník odborných pojmů', 216, 218, 'Slovník odborných pojmů'),
    ('15-uzitecne-odkazy.md', 'Užitečné odkazy', 218, 219, 'Užitečné odkazy'),
    ('16-seznam-pouzite-literatury.md', 'Seznam použité literatury', 219, 227, 'Seznam použité literatury'),
]


def main():
    doc = fitz.open(PDF)
    os.makedirs(OUT, exist_ok=True)
    for fname, title, p0, p1, kap in CHAPTERS:
        md = build(doc, p0, p1, title)
        open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(frontmatter(kap) + collapse(md))
        print(f'{fname}: {p1-p0} stran, {len(md)} znaku')
    doc.close()


if __name__ == '__main__':
    main()

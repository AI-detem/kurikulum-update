# -*- coding: utf-8 -*-
"""Sestavi vrstvu 2: per-card soubory + _all.md z destilovanych bloku (scratchpad/pas_out)."""
import os, sys, re, glob, json
sys.path.insert(0, os.path.dirname(__file__))
from parse_dilci import slugify
from extract_cards import all_cards

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ABBR=[
 ('IVP','individuální vzdělávací plán'),
 ('ŠPZ','školské poradenské zařízení'),
 ('ŠPP','školní poradenské pracoviště'),
 ('SPC','speciálněpedagogické centrum'),
 ('PPP','pedagogicko-psychologická poradna'),
 ('AP','asistent pedagoga'),
 ('PO','podpůrné opatření'),
 ('PLPP','plán pedagogické podpory'),
 ('AAK','alternativní a augmentativní komunikace'),
 ('PAS','poruchy autistického spektra'),
 ('SVP','speciální vzdělávací potřeby'),
 ('MŠ','mateřská škola'),('ZŠ','základní škola'),('SŠ','střední škola'),
]

def code_key(kod):
    return tuple(int(x) for x in kod.split('.'))

def build(kod_kat, src_dir):
    cards={c['kod']:c for c in all_cards(kod_kat)}
    outdir=os.path.join(ROOT,'data','cards',kod_kat)
    os.makedirs(outdir,exist_ok=True)
    files=sorted(glob.glob(os.path.join(src_dir,'*.md')), key=lambda p: code_key(os.path.basename(p)[:-3]))
    all_bodies=[]; index=[]
    for p in files:
        kod=os.path.basename(p)[:-3]
        body=open(p,encoding='utf-8').read().strip()
        meta=cards.get(kod,{})
        nazev=meta.get('nazev',''); oblast=meta.get('oblast'); typ=meta.get('typ','karta')
        slug=f"{kod.replace('.','-')}-{slugify(nazev)}"[:60]
        fm=(f'---\nkatalog: "{kod_kat}"\nkod: "{kod}"\nnazev: {json.dumps(nazev,ensure_ascii=False)}\n'
            f'oblast: {oblast}\ntyp: "{typ}"\nvrstva: "card"\n---\n\n')
        open(os.path.join(outdir,slug+'.md'),'w',encoding='utf-8').write(fm+body+'\n')
        all_bodies.append(body)
        index.append({'kod':kod,'nazev':nazev,'oblast':oblast,'typ':typ,
                      'card':f'data/cards/{kod_kat}/{slug}.md'})
    # _all.md
    legend='**Použité zkratky:** '+'; '.join(f'{a} = {full}' for a,full in ABBR)+'.'
    head=(f'# Destilované karty — {kod_kat}\n\n'
          f'> Operativní přehled podpůrných opatření pro system prompt. '
          f'Zdroj: Katalog podpůrných opatření (dílčí část {kod_kat}). '
          f'Vše čerpáno výhradně z plných karet (data/full/{kod_kat}/).\n\n'
          f'{legend}\n\n---\n\n')
    allmd=head+'\n\n'.join(all_bodies)+'\n'
    open(os.path.join(outdir,'_all.md'),'w',encoding='utf-8').write(allmd)
    tok=int(len(allmd)/2.5)
    return index, len(all_bodies), len(allmd), tok

if __name__=='__main__':
    kat=sys.argv[1]; src=sys.argv[2]
    index,n,ch,tok=build(kat,src)
    print(f'{kat}: {n} karet -> data/cards/{kat}/  (_all.md {ch} znaku ~ {tok} tokenu)')
    json.dump(index, open(f'/tmp/index_{kat}.json','w'), ensure_ascii=False, indent=1)

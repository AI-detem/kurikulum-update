# -*- coding: utf-8 -*-
"""Sestavi manifest.json a index.md z vygenerovanych dat (data/full + data/cards)."""
import os, sys, re, glob, json
sys.path.insert(0, os.path.dirname(__file__))
from extract_cards import all_cards
from generate import KAT_META

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA=os.path.join(ROOT,'data')

DILCI=['tp','zp','sp','mp','nks','pas','szn']

def card_anotace(kat, kod):
    """anotace = veta z 'Co to je:' destilatu."""
    for p in glob.glob(os.path.join(DATA,'cards',kat,'*.md')):
        head=open(p,encoding='utf-8').read()
        m=re.search(rf'kod:\s*"{re.escape(kod)}"',head)
        if m:
            cm=re.search(r'\*\*Co to je:\*\*\s*(.+)',head)
            if cm:
                s=cm.group(1).strip()
                s=re.split(r'(?<=[.!?])\s',s)[0]
                return s
    return ''

def full_for_oblast(kat, oblast):
    g=glob.glob(os.path.join(DATA,'full',kat,f'oblast-{oblast:02d}-*.md'))
    return f'data/full/{kat}/{os.path.basename(g[0])}' if g else None

def card_file(kat, kod, nazev):
    from parse_dilci import slugify
    slug=f"{kod.replace('.','-')}-{slugify(nazev)}"[:60]
    p=f'data/cards/{kat}/{slug}.md'
    return p if os.path.exists(os.path.join(ROOT,p)) else None

def build_dilci(kat):
    cards=all_cards(kat)
    oblasti={}
    for c in cards:
        o=c['oblast']
        oblasti.setdefault(o,{'oblast':o,'nazev':c['oblast_nazev'],
                              'full':full_for_oblast(kat,o),'karty':[]})
        oblasti[o]['karty'].append({
            'kod':c['kod'],'nazev':c['nazev'],'oblast':o,'typ':c['typ'],
            'anotace':card_anotace(kat,c['kod']),
            'full':full_for_oblast(kat,o),
            'card':card_file(kat,c['kod'],c['nazev']),
        })
    meta=KAT_META.get(kat,{})
    allp=f'data/cards/{kat}/_all.md'; prep=f'data/cards/{kat}/_prehled.md'
    return {
        'nazev':meta.get('nazev',kat),'cilova_skupina':meta.get('cil',''),
        'typ':'dilci','zdroj':f'katalog-{kat}.pdf',
        'prehled':prep if os.path.exists(os.path.join(ROOT,prep)) else None,
        'all':allp if os.path.exists(os.path.join(ROOT,allp)) else None,
        'pocet_karet':len(cards),
        'oblasti':[oblasti[o] for o in sorted(oblasti)],
    }

def build_prose(kat):
    meta=KAT_META[kat]
    kaps=[]
    for p in sorted(glob.glob(os.path.join(DATA,'full',kat,'*.md'))):
        t=open(p,encoding='utf-8').read()
        m=re.search(r'kapitola:\s*"(.*?)"',t)
        kaps.append({'nazev':m.group(1) if m else os.path.basename(p),
                     'full':f'data/full/{kat}/{os.path.basename(p)}'})
    prep=f'data/cards/{kat}/_prehled.md'
    return {'nazev':meta['nazev'],'cilova_skupina':meta['cil'],'typ':'obecna',
            'zdroj':f'katalog-{kat}.pdf',
            'prehled':prep if os.path.exists(os.path.join(ROOT,prep)) else None,
            'kapitoly':kaps}

def build():
    man={'katalog':'Katalog podpůrných opatření (Michalík, Baslerová, Felcmanová a kol.)',
         'generovano':'skripty v ./scripts (PyMuPDF)','katalogy':{}}
    if os.path.isdir(os.path.join(DATA,'full','vseobecny')):
        man['katalogy']['vseobecny']=build_prose('vseobecny')
    for kat in DILCI:
        if os.path.isdir(os.path.join(DATA,'full',kat)):
            man['katalogy'][kat]=build_dilci(kat)
    if os.path.isdir(os.path.join(DATA,'full','szn-metodika')):
        man['katalogy']['szn-metodika']=build_prose('szn-metodika')
    return man

def render_index(man):
    L=['# Rejstřík — Katalog podpůrných opatření','',
       'Obsah pro agentické dočítání i lidskou orientaci. Dvě vrstvy: **full** (věrný přepis) a **card** (destilát).','']
    for kat,d in man['katalogy'].items():
        L.append(f'## {kat} — {d["nazev"]}')
        L.append('')
        L.append(f'*Cílová skupina:* {d["cilova_skupina"]}  ')
        if d.get('prehled'): L.append(f'*Přehled:* `{d["prehled"]}`  ')
        if d.get('all'): L.append(f'*Všechny destiláty:* `{d["all"]}`  ')
        L.append('')
        if d['typ']=='obecna':
            L.append('| # | Kapitola | Full |')
            L.append('|---|---|---|')
            for i,k in enumerate(d['kapitoly'],1):
                L.append(f'| {i} | {k["nazev"]} | `{k["full"]}` |')
            L.append('')
            continue
        for o in d['oblasti']:
            L.append(f'### Oblast {o["oblast"]}: {o["nazev"]}')
            L.append('')
            L.append('| Kód | Název | Anotace | Full | Karta |')
            L.append('|---|---|---|---|---|')
            for c in o['karty']:
                typ=' *(podkarta)*' if c['typ']=='podkarta' else ''
                fu=f'`{c["full"]}`' if c['full'] else '—'
                ca=f'`{c["card"]}`' if c['card'] else '—'
                an=(c['anotace'] or '').replace('|','\\|')
                L.append(f'| {c["kod"]}{typ} | {c["nazev"]} | {an} | {fu} | {ca} |')
            L.append('')
    return '\n'.join(L)+'\n'

if __name__=='__main__':
    man=build()
    json.dump(man, open(os.path.join(DATA,'manifest.json'),'w',encoding='utf-8'),
              ensure_ascii=False, indent=1)
    open(os.path.join(DATA,'index.md'),'w',encoding='utf-8').write(render_index(man))
    ncards=sum(d.get('pocet_karet',0) for d in man['katalogy'].values())
    print(f'manifest.json + index.md: {len(man["katalogy"])} katalogu, {ncards} karet')
    for k,d in man['katalogy'].items():
        print(f'  {k}: {d.get("pocet_karet","-")} karet, {len(d.get("oblasti",d.get("kapitoly",[])))} oblasti/kapitol')

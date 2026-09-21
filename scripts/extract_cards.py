# -*- coding: utf-8 -*-
"""Z vrstvy 1 (full oblast .md) vytahne karty rozsekane na sekce -> JSON pro destilaci."""
import re, os, sys, json, glob

SECMAP={
 'Projevy na straně žáka, na které opatření reaguje':'projevy',
 'Popis opatření':'popis',
 'Aplikace opatření a specifikace podmínek':'aplikace',
 'Na co klást důraz':'duraz',
 'Rizika':'rizika',
 'Ilustrační příklad':'priklad',
 'Cílové skupiny':'cilove',
 'Varianty opatření dle stupňů podpory':'varianty',
 'Metodické zdroje, odkazy, odborná literatura':'zdroje',
}

def parse_oblast_file(path):
    txt=open(path,encoding='utf-8').read()
    # odstran frontmatter
    txt=re.sub(r'^---.*?---\n','',txt,count=1,flags=re.S)
    oblast=None
    m=re.search(r'^##\s+Oblast podpory č\.\s*(\d+):\s*(.+)$',txt,re.M)
    if m: oblast=(int(m.group(1)),m.group(2).strip())
    cards=[]
    # rozdel na karty dle '### '
    parts=re.split(r'\n(?=### )',txt)
    for part in parts:
        hm=re.match(r'### (\d+(?:\.\d+){1,2})\s+(.+)',part)
        if not hm: continue
        kod=hm.group(1); nazev=re.sub(r'\s*\*\(podkarta\)\*','',hm.group(2)).strip()
        typ='podkarta' if '(podkarta)' in part.split('\n')[0] else 'karta'
        sections={}
        # autor
        am=re.search(r'\*Autor/ka:\s*(.+?)\*',part)
        autor=am.group(1).strip() if am else None
        # rozdel na #### sekce
        secs=re.split(r'\n(?=#### )',part)
        for s in secs:
            sm=re.match(r'#### (.+)',s)
            if not sm: continue
            label=sm.group(1).strip()
            key=SECMAP.get(label)
            if not key: continue
            body=s[s.index('\n')+1:].strip() if '\n' in s else ''
            sections[key]=body.strip()
        cards.append({'kod':kod,'nazev':nazev,'typ':typ,'autor':autor,
                      'oblast':oblast[0] if oblast else None,
                      'oblast_nazev':oblast[1] if oblast else None,
                      'sekce':sections})
    return cards

def all_cards(kod):
    base=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'data','full',kod)
    out=[]
    for f in sorted(glob.glob(os.path.join(base,'oblast-*.md'))):
        out+=parse_oblast_file(f)
    return out

if __name__=='__main__':
    kod=sys.argv[1]
    cards=all_cards(kod)
    if len(sys.argv)>2 and sys.argv[2]=='json':
        print(json.dumps(cards,ensure_ascii=False,indent=1))
    else:
        print(f'{kod}: {len(cards)} karet')
        for c in cards:
            secs=','.join(c['sekce'].keys())
            print(f"  {c['kod']:8} [{c['typ']:8}] {c['nazev'][:45]:45} | {secs}")

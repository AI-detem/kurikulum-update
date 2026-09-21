# -*- coding: utf-8 -*-
import fitz, re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from parse_dilci import *

OBLAST_NAMES={1:'Organizace výuky',2:'Modifikace vyučovacích metod a forem práce',
 3:'Intervence',4:'Pomůcky',5:'Úpravy obsahu vzdělávání',6:'Hodnocení',
 7:'Příprava na výuku',8:'Podpora sociální a zdravotní',9:'Práce s třídním kolektivem',
 10:'Úprava prostředí'}

def _karty_chapter_range(doc):
    """rozsah stranek kapitoly 'Karty PO' z TOC (vc. konce = dalsi L1 kapitola)."""
    toc=doc.get_toc()
    l1=[(re.sub(r'\s+',' ',t).strip(),p-1) for lvl,t,p in toc if lvl==1]
    for i,(t,p) in enumerate(l1):
        if 'KARTY PODP' in t.upper():
            end=l1[i+1][1] if i+1<len(l1) else doc.page_count
            return p,end
    return 0,doc.page_count

def oblast_ranges(doc):
    """Detekuje hlavicky 'OBLAST PODPORY Č. N' primo z tela (robustni i kdyz chybi v TOC)."""
    p0,p1=_karty_chapter_range(doc)
    hdrs=[]
    for pi in range(p0,p1):
        for b in doc[pi].get_text('blocks', sort=True):
            x0,y0,x1,y1,txt,bno,bt=b
            if bt!=0: continue
            txt=drop_pagenums(txt.replace('\x07',''))
            t=re.sub(r'\s+',' ',txt).strip()
            m=re.search(r'OBLAST\s*PODPORY\s*Č\.\s*(\d+)\s*:?\s*(.*)', t.upper())
            if m and re.match(r'^\s*\d+\.\d+', t):   # "4.N OBLAST PODPORY Č. N"
                num=int(m.group(1))
                # nazev: vezmi z originalu za dvojteckou
                mm=re.search(r':\s*(.+)', txt, re.S)
                name=re.sub(r'\s+',' ',mm.group(1)).strip() if mm else ''
                name=sentence_case_title(name) if name else OBLAST_NAMES.get(num,'')
                if not name or name.lower() in ('',): name=OBLAST_NAMES.get(num,'')
                hdrs.append((num,name,pi))
    # deduplikuj (nekdy hlavicka pretece na 2 bloky), ponech prvni vyskyt kazdeho cisla
    seen={}; order=[]
    for num,name,pi in hdrs:
        if num not in seen:
            seen[num]=(name,pi); order.append(num)
    res=[]
    ordered=[(n,)+seen[n] for n in sorted(seen)]
    for i,(num,name,p) in enumerate(ordered):
        end=ordered[i+1][2] if i+1<len(ordered) else p1
        nm=name if name and not name.isdigit() else OBLAST_NAMES.get(num,'')
        res.append((num,nm,p,end))
    return res

def karty_chapter_num(doc):
    """cislo kapitoly 'Karty PO' dle prefixu hlavicek oblasti (obv. 4)."""
    for num,name,p0,p1 in oblast_ranges(doc):
        for b in collect_blocks(doc,p0,min(p0+2,p1)):
            m=re.match(r'^\s*(\d+)\.\d+\s', re.sub(r'\s+',' ',b[4]))
            if m and is_oblast_hdr(b[4]): return int(m.group(1))
    return 4

def norm_code(code, num, chapter_num):
    """normalizuj kod karty vzhledem k cislu oblasti; vrat (kod, typ, flag)
       typ: 'karta'|'podkarta'; flag: text nesrovnalosti pro REPORT nebo None."""
    parts=code.split('.')
    if len(parts)==2:
        if int(parts[0])!=num:
            return code,'karta',f'kod {code} v oblasti {num} (nesouhlasi prefix)'
        return code,'karta',None
    if len(parts)==3:
        a,b,c=parts
        if int(a)==chapter_num and int(b)==num and chapter_num!=num:
            return f'{num}.{c}','karta',f'kod {code} znormalizovan na {num}.{c} (nesl prefix kapitoly)'
        if int(a)==num:
            return code,'podkarta',None
        return code,'podkarta',f'kod {code} v oblasti {num} (neobvykly prefix)'
    return code,'karta',f'neobvykly kod {code}'

def author_like(txt):
    t=txt.strip()
    if '\n' in t or len(t)>80: return False
    if match_section(t) or match_sub(t) or is_oblast_hdr(t): return False
    # jmena: 2+ slova s velkym pocatkem, mozne carky
    words=re.findall(r'[A-ZÁ-Ž][a-zá-ž]+', t)
    return len(words)>=2 and ',' in t or (len(words)>=2 and len(t.split())<=6 and t[0].isupper() and not t.endswith('.') and match_stupen(t) is None)

def build_oblast(doc, kod, num, name, p0, p1, chapter_num=4):
    blocks=collect_blocks(doc,p0,p1)
    out=[]; cards=[]; flags=[]
    out.append(f'## Oblast podpory č. {num}: {name}\n')
    state='intro'; cur_card=None; cur_section=None; pending_author=None
    intro_started=False
    for pi,ykey,x0,y0,txt in blocks:
        if is_oblast_hdr(txt):
            # blok "4.x OBLAST PODPORY..." + nazev - preskoc (uz mame ## nadpis)
            continue
        card=match_card(txt)
        if card:
            rawcode,title=card
            code,ctype,flag=norm_code(rawcode,num,chapter_num)
            if flag: flags.append(flag)
            cards.append({'kod':code,'nazev':title,'typ':ctype})
            label=f'### {code} {title}' + (' *(podkarta)*' if ctype=='podkarta' else '')
            out.append(f'\n{label}\n')
            cur_card=code; cur_section=None; state='card_head'
            continue
        sec=match_section(txt)
        if sec:
            out.append(f'\n#### {sec}\n'); cur_section=sec; state='section'
            continue
        sub=match_sub(txt)
        if sub:
            out.append(f'\n**{sub}**\n'); state='section'
            continue
        stn=match_stupen(txt)
        if stn:
            out.append(f'\n**Stupeň {stn}**\n'); state='section'
            continue
        # obsahovy blok
        if state=='card_head':
            # ocekavame autora nebo "Oblast podpory:" radek
            if nows(txt).upper().startswith('OBLASTPODPORY'):
                continue  # oblast je v nadpisu souboru
            if author_like(txt):
                out.append(f'*Autor/ka: {txt.strip()}*\n')
                continue
            # jinak spadne do bezneho obsahu nize
        if cur_section and cur_section.startswith('Metodické') and not has_bullets(txt):
            body=join_para(txt)
            parts=re.split(r'\s+(?=\d{1,2}\.\s+\S)', body)
            if len(parts)>=2 and all(re.match(r'\d{1,2}\.',p) for p in parts):
                for p in parts:
                    m=re.match(r'(\d{1,2})\.\s*(.*)',p)
                    out.append(f'{m.group(1)}. {m.group(2)}')
                out.append('')
            else:
                out.append(body+'\n')
            continue
        if has_bullets(txt):
            lead,items=split_bullets(txt)
            if lead: out.append(join_para(lead))
            for it in items: out.append(f'- {it}')
            out.append('')
        else:
            p=join_para(txt)
            if p: out.append(p+'\n')
    return '\n'.join(out), cards, flags

if __name__=='__main__':
    kod=sys.argv[1]; only=sys.argv[2] if len(sys.argv)>2 else None
    doc=fitz.open(f'katalog-pdf/katalog-{kod}.pdf')
    ranges=oblast_ranges(doc)
    for num,name,p0,p1 in ranges:
        if only and str(num)!=only: continue
        cn=karty_chapter_num(doc)
        md,cards,flags=build_oblast(doc,kod,num,name,p0,p1,cn)
        print(f'--- OBLAST {num} ({name}) s.{p0+1}-{p1} : {len(cards)} karet ---')
        print('KARTY:', [c['kod'] for c in cards])
        if only:
            open(f'/tmp/oblast{num}.md','w').write(md)
            print(md[:4000])
    doc.close()

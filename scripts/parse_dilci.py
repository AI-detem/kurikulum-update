# -*- coding: utf-8 -*-
"""Parser dilcich katalogu PO -> vrstva 1 (full markdown) po oblastech."""
import fitz, re, unicodedata, json, sys, os

NBSP='\xa0'; SOFT='\xad'; ZWSP='​'; ENSP=' '; BEL='\x07'

def slugify(s):
    s=s.strip().lower()
    repl={'č':'c','š':'s','ž':'z','ř':'r','ý':'y','á':'a','í':'i','é':'e','ě':'e',
          'ú':'u','ů':'u','ó':'o','ď':'d','ť':'t','ň':'n'}
    for k,v in repl.items(): s=s.replace(k,v)
    s=unicodedata.normalize('NFKD',s)
    s=''.join(c for c in s if not unicodedata.combining(c))
    s=re.sub(r'[^a-z0-9]+','-',s)
    return s.strip('-')

def nows(s):
    """odstran veskere mezery (vc. NBSP) -> pro porovnani nadpisu"""
    return re.sub(r'\s+','', s.replace(NBSP,'').replace(ENSP,''))

# kanonicke sekce karty (klic = text bez mezer, velka pismena)
SECTIONS=[
    ('PROJEVY','Projevy na straně žáka, na které opatření reaguje'),
    ('POPISOPATŘENÍ','Popis opatření'),
    ('APLIKACEOPATŘENÍA','Aplikace opatření a specifikace podmínek'),
    ('NACOKLÁSTDŮRAZ','Na co klást důraz'),
    ('RIZIKA','Rizika'),
    ('ILUSTRAČNÍPŘÍKLAD','Ilustrační příklad'),
    ('CÍLOVÉSKUPINY','Cílové skupiny'),
    ('VARIANTYOPATŘENÍDLESTUPŇŮPODPORY','Varianty opatření dle stupňů podpory'),
    ('METODICKÉZDROJE','Metodické zdroje, odkazy, odborná literatura'),
]
SUBSECTIONS=[('VČEMSPOČÍVÁ','V čem spočívá'),('ČEMUPOMÁHÁ','Čemu pomáhá')]

def _is_caps_heading(txt):
    """nadpis sekce je verzalkami a kratky (ne odstavec zacinajici stejnym slovem)."""
    first=txt.strip().split('\n')[0]
    core=nows(first)
    letters=[c for c in core if c.isalpha()]
    if not letters or len(core)>65: return False
    return sum(1 for c in letters if c.upper()==c)/len(letters) > 0.85

def match_section(txt):
    if not _is_caps_heading(txt): return None
    k=nows(txt).upper().rstrip(':')
    for key,label in SECTIONS:
        if k==key or k.startswith(key):
            return label
    return None

def match_sub(txt):
    if not _is_caps_heading(txt): return None
    k=nows(txt).upper().rstrip(':')
    for key,label in SUBSECTIONS:
        if k==key: return label
    return None

def match_stupen(txt):
    m=re.match(r'^STUPE[ŇN](\d)$', nows(txt).upper())
    return m.group(1) if m else None

CARD_RE=re.compile(r'^(\d+\.\d+(?:\.\d+)?)[\s\u2002\u00a0]+(.+)$')
ACRONYMS={'IVP','SPZ','SPP','SPC','PPP','AAK','PC','ICT','IT','SPU','ADHD','ADD',
 'DMO','PAS','TV','VV','CJ','SVP','PO','AP','MS','ZS','SS','VOS','RVP','SVP2',
 'MSMT','OSPOD','NKS','ZP','SP','MP','TP','SZN','EEG','CNS'}
ACRONYMS={a for a in ['IVP','ŠPZ','ŠPP','SPC','PPP','AAK','PC','ICT','IT','SPU','ADHD','ADD','DMO','PAS','TV','VV','ČJ','SVP','PO','AP','MŠ','ZŠ','SŠ','VOŠ','RVP','ŠVP','MŠMT','OSPOD','NKS','EEG','CNS']}

def sentence_case_title(title):
    title=re.sub(r'\s+',' ',title).strip()
    def fix(tok):
        core=tok.strip('().,:;-–')
        if core.upper() in ACRONYMS: return tok.replace(core, core.upper())
        if any(ch.isdigit() for ch in tok): return tok
        return tok.lower()
    words=[fix(w) for w in title.split(' ')]
    s=' '.join(words)
    m=re.search(r'[^\W\d_]', s)
    if m:
        i=m.start(); s=s[:i]+s[i].upper()+s[i+1:]
    return s

def match_card(txt):
    if is_oblast_hdr(txt): return None
    lines=[l.strip() for l in txt.split('\n') if l.strip()]
    if not lines: return None
    m=CARD_RE.match(lines[0])
    if not m: return None
    if 'OBLAST PODPORY' in txt.upper(): return None
    code=m.group(1)
    raw=m.group(2).strip()
    for extra in lines[1:]:
        raw=(raw[:-1]+extra) if raw.endswith('-') else (raw+' '+extra)
    letters=[c for c in raw if c.isalpha()]
    if not letters: return None
    upratio=sum(1 for c in letters if c.upper()==c)/len(letters)
    if upratio<0.7: return None
    return code, sentence_case_title(raw)

def is_oblast_hdr(txt):
    return bool(re.search(r'OBLAST\s*PODPORY\s*Č', txt.upper()))

def is_footer(txt, y0):
    t=nows(txt).upper()
    if 'KATALOGPODPŮRNÝCHOPATŘENÍ•DÍLČÍČÁST' in t: return True
    if 'KATALOGPODPŮRNÝCHOPATŘENÍ•OBECNÁ' in t: return True
    if y0>760 and 'KARTYPODPŮRNÝCHOPATŘENÍ' in t: return True
    return False

def clean_line(l):
    l=l.replace(BEL,'').replace(ZWSP,'')
    return l

def is_heading_block(txt):
    """rozpozna nadpisove bloky (pro bias v razeni)"""
    t=txt.strip()
    return (match_section(t) or match_sub(t) or match_stupen(t)
            or match_card(t) or is_oblast_hdr(t) or nows(t).upper()=='POPISOPATŘENÍ')

def collect_blocks(doc, p0, p1):
    """vrati bloky (page,y0,x0,text) pro stranky [p0,p1), filtrovane a serazene s biasem"""
    out=[]
    for pi in range(p0,p1):
        for b in doc[pi].get_text('blocks', sort=True):
            x0,y0,x1,y1,txt,bno,bt=b
            if bt!=0: continue
            txt=clean_line(txt)
            if not txt.strip(): continue
            if y0>=768 or y0<34: continue   # pasmo bezicich zahlavi/zapati a cisel stranek
            if is_footer(txt,y0): continue
            txt=drop_pagenums(txt)          # odstran marker cisla stranky/oblasti
            if not txt.strip(): continue
            ykey=y0-18 if is_heading_block(txt) else y0
            out.append([pi,ykey,x0,y0,txt])
    out.sort(key=lambda r:(r[0],r[1],r[2]))
    return out

def drop_pagenums(txt):
    """odstran samostatne radky s cislem stranky/oblasti na zacatku bloku"""
    lines=txt.split('\n')
    while lines and re.fullmatch(r'\d{1,3}', lines[0].strip()):
        lines.pop(0)
    # obcas cislo uvnitr (prechod stranky) - odstran samostatne ciselne radky
    lines=[l for l in lines if not re.fullmatch(r'\d{1,3}', l.strip())]
    return '\n'.join(lines)

def join_para(txt):
    """slij radky odstavce; osetri soft-hyphen a rozdelovaci spojovnik na konci radku"""
    txt=drop_pagenums(txt)
    txt=txt.replace(SOFT+'\n','').replace(SOFT,'')
    lines=[l.strip() for l in txt.split('\n')]
    lines=[l for l in lines if l]
    res=''
    for i,l in enumerate(lines):
        if i==0: res=l; continue
        if res.endswith('-') and not res.endswith(' -'):
            res=res[:-1]+l
        else:
            res=res+' '+l
    return re.sub(r'\s+',' ',res).strip()

def split_bullets(txt):
    """rozdeli blok na odrazky podle '•\t' resp '•'"""
    txt=drop_pagenums(txt).replace(SOFT+'\n','').replace(SOFT,'')
    # normalizuj markery
    parts=re.split(r'•\t?', txt)
    items=[]
    lead=parts[0].strip()
    for p in parts[1:]:
        item=re.sub(r'\s+',' ',p.replace('\n',' ')).strip()
        # spojeni deleneho slova uvnitr odrazky
        item=re.sub(r'(\w)-\s+(\w)', r'\1\2', item)
        if item: items.append(item)
    return lead, items

def has_bullets(txt):
    return '•' in txt

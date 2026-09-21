# -*- coding: utf-8 -*-
"""Parser prozaickych kapitol (vseobecny, uvodni casti dilcich katalogu) -> full MD."""
import fitz, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from parse_dilci import (collect_blocks, join_para, split_bullets, has_bullets,
    nows, is_footer, drop_pagenums, slugify, sentence_case_title, match_section)

HEAD_RE=re.compile(r'^(\d+(?:\.\d+){0,3})\s+(.+)$')

def toc_l1(doc):
    """vrat top-level kapitoly jako (title,p_start_idx,p_end_idx)."""
    toc=doc.get_toc()
    l1=[(re.sub(r'\s+',' ',t).strip(),p-1) for lvl,t,p in toc if lvl==1]
    res=[]
    for i,(t,p) in enumerate(l1):
        end=l1[i+1][1] if i+1<len(l1) else doc.page_count
        res.append((t,p,end))
    return res

def is_prose_heading(txt):
    """rozpozna nadpis prozy: kratky, cislovany nebo ALLCAPS, jednoradkovy."""
    t=re.sub(r'\s+',' ',txt).strip()
    if len(t)>90 or '\n' in txt.strip():
        # povol dvouradkove nadpisy jen kdyz cele velkymi
        pass
    m=HEAD_RE.match(t)
    if m:
        num=m.group(1); title=m.group(2)
        if len(title)>90: return None
        letters=[c for c in title if c.isalpha()]
        if not letters: return None
        up=sum(1 for c in letters if c.upper()==c)/len(letters)
        # nadpis: bud ALLCAPS nebo Title-case zacinajici velkym
        if up>0.6 or title[0].isupper():
            level=num.count('.')+1
            return level, num, sentence_case_title(title)
    # STUPEŇ N jako pod-nadpis
    m2=re.match(r'^STUPE[ŇN]\s*(\d)\s*$', t.upper())
    if m2: return 4, None, f'Stupeň {m2.group(1)}'
    return None

def looks_author(txt):
    t=re.sub(r'\s+',' ',txt).strip()
    if len(t)>70 or match_section(txt): return False
    names=re.findall(r'[A-ZÁ-Ž][a-zá-ž]+\s+[A-ZÁ-Ž][a-zá-ž]+', t)
    return len(names)>=1 and (',' in t or len(t.split())<=3) and not t.endswith('.')

def build_chapter(doc, p0, p1, toc_title, base_level=1):
    blocks=collect_blocks(doc,p0,p1)
    # cislo kapitoly z TOC titulku
    mnum=re.match(r'^(\d+)\s+(.*)', toc_title)
    num=mnum.group(1) if mnum else None
    rest=mnum.group(2) if mnum else toc_title
    title=sentence_case_title(rest)
    # vytisteny nadpis kapitoly = prvni kratky ALLCAPS blok (spolehlivejsi nez bookmark)
    if blocks:
        ft=join_para(blocks[0][4])
        letters=[c for c in ft if c.isalpha()]
        if letters and len(ft)<80 and \
           sum(1 for c in letters if c.upper()==c)/len(letters)>0.85 \
           and not HEAD_RE.match(ft):
            title=sentence_case_title(ft)
            blocks=blocks[1:]
    head=f'{"#"*base_level} ' + (f'{num} ' if num else '') + title
    out=[head+'\n']
    last_level=base_level
    for pi,ykey,x0,y0,txt in blocks:
        if looks_author(txt):
            out.append(f'*{re.sub(chr(92)+"s+"," ",txt).strip()}*\n'); continue
        h=is_prose_heading(txt)
        if h:
            level,hnum,htext=h
            if hnum is not None:
                hl=min(base_level-1+level, 6); last_level=hl
            else:
                hl=min(last_level+1, 6)     # napr. STUPEŇ pod cislovanym nadpisem
            prefix=f'{hnum} ' if hnum else ''
            out.append(f'\n{"#"*hl} {prefix}{htext}\n')
            continue
        if has_bullets(txt):
            lead,items=split_bullets(txt)
            if lead: out.append(join_para(lead))
            for it in items: out.append(f'- {it}')
            out.append('')
        else:
            p=join_para(txt)
            if p: out.append(p+'\n')
    return '\n'.join(out)

if __name__=='__main__':
    kod=sys.argv[1]; only=sys.argv[2] if len(sys.argv)>2 else None
    doc=fitz.open(f'katalog-pdf/katalog-{kod}.pdf')
    for i,(t,p0,p1) in enumerate(toc_l1(doc),1):
        if only and str(i)!=only: continue
        md=build_chapter(doc,p0,p1,sentence_case_title(t) if t.upper()==t else t)
        print(f'--- KAP {i}: {t} (s.{p0+1}-{p1}) ---')
        if only:
            open(f'/tmp/kap{i}.md','w').write(md); print(md[:3500])
    doc.close()

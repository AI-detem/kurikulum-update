# -*- coding: utf-8 -*-
"""Orchestrator: generuje vrstvu 1 (data/full/) pro katalog a vraci strukturu pro manifest."""
import fitz, re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from parse_dilci import slugify, sentence_case_title
from build_full import oblast_ranges, build_oblast, OBLAST_NAMES, karty_chapter_num
from build_prose import toc_l1, build_chapter

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FULL=os.path.join(ROOT,'data','full')

KAT_META={
 'vseobecny':{'nazev':'Obecná část','cil':'Metodika, struktura karet, oblasti podpory'},
 'tp':{'nazev':'Tělesné postižení a závažné onemocnění','cil':'žáci s tělesným postižením nebo závažným onemocněním'},
 'zp':{'nazev':'Zrakové postižení','cil':'žáci se zrakovým postižením nebo oslabením zrakového vnímání'},
 'sp':{'nazev':'Sluchové postižení','cil':'žáci se sluchovým postižením nebo oslabením sluchového vnímání'},
 'mp':{'nazev':'Mentální postižení','cil':'žáci s mentálním postižením nebo oslabením kognitivního výkonu'},
 'nks':{'nazev':'Narušená komunikační schopnost','cil':'žáci s narušenou komunikační schopností'},
 'pas':{'nazev':'Poruchy autistického spektra','cil':'žáci s poruchou autistického spektra nebo vybraným psychickým onemocněním'},
 'szn':{'nazev':'Sociální znevýhodnění','cil':'žáci se sociálním znevýhodněním'},
 'szn-metodika':{'nazev':'Metodika k sociálnímu znevýhodnění','cil':'metodická podpora k SZN'},
}

def frontmatter(d):
    lines=['---']
    for k,v in d.items():
        if isinstance(v,list):
            lines.append(f'{k}: [{", ".join(json.dumps(x,ensure_ascii=False) for x in v)}]')
        else:
            lines.append(f'{k}: {json.dumps(v,ensure_ascii=False)}')
    lines.append('---')
    return '\n'.join(lines)+'\n\n'

def collapse_blanks(md):
    return re.sub(r'\n{3,}','\n\n',md).strip()+'\n'

def write(path, text):
    os.makedirs(os.path.dirname(path),exist_ok=True)
    open(path,'w',encoding='utf-8').write(text)

def is_karty_chapter(title):
    return 'KARTY PODP' in title.upper()

def gen_dilci(kod):
    doc=fitz.open(f'katalog-pdf/katalog-{kod}.pdf')
    outdir=os.path.join(FULL,kod)
    oblasti=[]
    # 1) uvodni + prilohove kapitoly (vse krome "Karty PO")
    chapters=toc_l1(doc)
    ci=0
    for t,p0,p1 in chapters:
        if is_karty_chapter(t): continue
        ci+=1
        md=build_chapter(doc,p0,p1,t)
        mnum=re.match(r'^(\d+)\s+(.*)',t)
        slug=slugify(mnum.group(2) if mnum else t)[:50]
        fname=f'{ci:02d}-{slug}.md'
        fm=frontmatter({'katalog':kod,'kapitola':sentence_case_title(mnum.group(2) if mnum else t),
                        'zdroj':f'katalog-{kod}.pdf','vrstva':'full','typ':'kapitola'})
        write(os.path.join(outdir,fname), fm+collapse_blanks(md))
    # 2) oblasti podpory (karty)
    cn=karty_chapter_num(doc)
    all_flags=[]
    for num,name,p0,p1 in oblast_ranges(doc):
        md,cards,flags=build_oblast(doc,kod,num,name,p0,p1,cn)
        all_flags+=flags
        slug=slugify(name)[:50]
        fname=f'oblast-{num:02d}-{slug}.md'
        fm=frontmatter({'katalog':kod,'oblast':f'{num} — {name}',
                        'karty':[c['kod'] for c in cards],'zdroj':f'katalog-{kod}.pdf','vrstva':'full'})
        write(os.path.join(outdir,fname), fm+collapse_blanks(md))
        oblasti.append({'oblast':num,'nazev':name,'full':f'data/full/{kod}/{fname}','karty':cards})
    doc.close()
    return oblasti, all_flags

def gen_vseobecny():
    doc=fitz.open('katalog-pdf/katalog-vseobecny.pdf')
    outdir=os.path.join(FULL,'vseobecny')
    chapters=toc_l1(doc); ci=0; files=[]
    for t,p0,p1 in chapters:
        ci+=1
        md=build_chapter(doc,p0,p1,t)
        mnum=re.match(r'^(\d+)\s+(.*)',t)
        base=mnum.group(2) if mnum else t
        slug=slugify(base)[:50]
        fname=f'{ci:02d}-{slug}.md'
        fm=frontmatter({'katalog':'vseobecny','kapitola':sentence_case_title(base) if base.upper()==base else base,
                        'zdroj':'katalog-vseobecny.pdf','vrstva':'full','typ':'kapitola'})
        write(os.path.join(outdir,fname), fm+collapse_blanks(md))
        files.append(fname)
    doc.close()
    return files

if __name__=='__main__':
    kod=sys.argv[1]
    if kod=='vseobecny':
        files=gen_vseobecny()
        print(f'vseobecny: {len(files)} kapitol')
        for f in files: print('  ',f)
    else:
        obl,flags=gen_dilci(kod)
        tot=sum(len(o['karty']) for o in obl)
        print(f'{kod}: {len(obl)} oblasti, {tot} karet')
        for o in obl: print(f"  oblast {o['oblast']}: {len(o['karty'])} karet -> {o['full']}")
        if flags:
            print('FLAGS:');
            [print('  -',f) for f in flags]

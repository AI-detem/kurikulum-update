# -*- coding: utf-8 -*-
"""Sdilene funkce pro cisteni textu z PDF Katalogu podpurnych opatreni."""
import re, unicodedata

SOFT = '­'      # soft hyphen
NBSP = ' '      # non-breaking space
ZWSP = '​'      # zero-width space

def slugify(s):
    s = s.strip().lower()
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('č','c').replace('š','s').replace('ž','z')  # safety
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def is_letterspaced(line):
    """Radek typu 'P R O J E V Y  N A ...' - vetsina tokenu jsou jednotlive znaky."""
    toks = [t for t in line.strip().split(' ') if t]
    if len(toks) < 4:
        return False
    singles = sum(1 for t in toks if len(t.replace(NBSP,'')) == 1)
    return singles >= len(toks) * 0.6

def unspace(line):
    """Slozi mezerovany nadpis: jednotlive znaky spoji, NBSP = hranice slova."""
    # rozdel na slova podle NBSP, uvnitr slova odstran mezery mezi znaky
    parts = line.strip().split(NBSP)
    words = []
    for p in parts:
        w = ''.join(p.split(' '))
        if w:
            words.append(w)
    return ' '.join(words)

if __name__ == '__main__':
    tests = [
        'P R O J E V Y N A  S T R A N Ě Ž Á K A , N A  K T E R É O P A T Ř E N Í R E A G U J E',
        'V   Č E M S P O Č Í V Á',
        'O b l a s t p o d p o r y : O R G A N I Z A C E V Ý K Y',
    ]
    for t in tests:
        print(is_letterspaced(t), '->', repr(unspace(t)))

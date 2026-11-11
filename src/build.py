"""Build the inner pages for both versions (granite/ and edited/).

Each file in src/pages/ is a page body with a small header block:

    <!--
    title: Admissions · KFUPM
    description: One sentence for search engines.
    crumbs: Study=study.html; Admissions
    h1: Admissions at <em>KFUPM</em>
    lead: One or two sentences under the title.
    -->
    <section>...</section>

The builder takes the header, hero wave and footer from each version's own
leaders.html, so every page keeps that version's look, then writes
<version>/<name>.html. It also copies src/pages.css into both versions and
points the shared nav links at the local pages.

Run from anywhere:  python src/build.py
"""
import io
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
VERSIONS = ['granite', 'edited']
# Personalised versions: same pages, plus the "Who are you?" engine from src/persona/.
# Pages in src/persona/pages/ replace the plain page of the same name in these versions.
PERSONA_VERSIONS = {'granite-personal': 'granite', 'edited-personal': 'edited'}

# Nav and footer links that now have a local page. Applied to every page.
LOCAL_LINKS = {
    'https://www.kfupm.edu.sa/study/bachelor-of-science': 'programs-list.html',
    'https://www.kfupm.edu.sa/study/colleges': 'colleges.html',
    'https://www.kfupm.edu.sa/study/apply': 'apply.html',
    'https://www.kfupm.edu.sa/study/international-students/fees-and-scholarships': 'tuition-calculator.html',
    'https://www.kfupm.edu.sa/about-us/discover/news': 'news.html',
}
STUDY_EXTRA = ('<h6>Programs</h6><a href="study.html">Study at KFUPM</a>'
               '<a href="admissions-hub.html">Admissions</a>'
               '<a href="undergraduate.html">Undergraduate admission</a>'
               '<a href="programs-search.html">Find a program</a>')
# The first version of the Study menu additions, replaced by STUDY_EXTRA where found.
OLD_STUDY_EXTRA = ('<h6>Programs</h6><a href="study.html">Study at KFUPM</a>'
                   '<a href="admissions.html">Admissions</a>'
                   '<a href="programs-search.html">Find a program</a>')


def rd(p):
    return io.open(p, encoding='utf-8').read()


def wr(p, s):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)


# KFUPM's Gecko Engage chat widget, added once before </body> on every page.
CHATBOT = ('<script type="text/javascript">window.GeckoChatSettings={widgetId:"21AC0000t5v832007lvay2ahe2-01KA8SG7HJV47SQERACGVWRXFP",accountName:"kfupm",};</script>'
           '<script type="text/javascript" src="https://chat-widget.geckoengage.com"></script>')


def patch_links(html):
    for old, new in LOCAL_LINKS.items():
        html = html.replace('href="%s"' % old, 'href="%s"' % new)
    html = html.replace(OLD_STUDY_EXTRA, STUDY_EXTRA)
    if 'href="study.html">Study at KFUPM' not in html:
        html = html.replace('<h6>Programs</h6>', STUDY_EXTRA, 1)
    if 'GeckoChatSettings' not in html:
        html = html.replace('</body>', CHATBOT + '\n</body>', 1)
    return html


def shell(version):
    """Pieces of the version's leaders.html that every page shares."""
    s = patch_links(rd(os.path.join(ROOT, version, 'leaders.html')))
    s = s.replace(' aria-current="page"', '')
    head_end = s.index('<section class="hero page-hero">')
    top = s[:head_end]
    wave = re.search(r'<div class="wave bottom".*?</svg></div>', s, re.S).group(0)
    foot = s[s.index('<footer>'):]
    return top, wave, foot


def parse(path):
    raw = rd(path)
    m = re.match(r'\s*<!--(.*?)-->', raw, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        k, _, v = line.partition(':')
        meta[k.strip()] = v.strip()
    return meta, raw[m.end():].strip('\n')


def crumbs_html(spec):
    parts = ['<a href="index.html">Home</a>']
    for item in [c.strip() for c in spec.split(';') if c.strip()]:
        parts.append('<span class="sep">/</span>')
        if '=' in item:
            label, href = item.split('=', 1)
            parts.append('<a href="%s">%s</a>' % (href.strip(), label.strip()))
        else:
            parts.append('<span>%s</span>' % item)
    return '<nav class="crumbs" aria-label="Breadcrumb">%s</nav>' % ''.join(parts)


def variants(meta, key):
    """The value of `key` plus any `key.<audience>` versions, as (default, {audience: value})."""
    alts = {k.split('.', 1)[1]: v for k, v in meta.items() if k.startswith(key + '.')}
    return meta.get(key, ''), alts


def spans(meta, key):
    """Inner HTML for a heading or line that may change per audience."""
    base, alts = variants(meta, key)
    if not alts:
        return base
    out = ['<span data-not-for="%s">%s</span>' % (' '.join(alts), base)] if base else []
    out += ['<span data-for="%s">%s</span>' % (k, v) for k, v in alts.items()]
    return ''.join(out)


def ctas(meta):
    """Hero buttons: `cta: Label | href`, optionally `cta.<audience>: Label | href`."""
    base, alts = variants(meta, 'cta')
    def a(spec, attr):
        label, _, href = spec.partition('|')
        return '<a class="btn" href="%s"%s>%s</a>' % (href.strip(), attr, label.strip())
    out = [a(base, ' data-not-for="%s"' % ' '.join(alts) if alts else '')] if base else []
    out += [a(v, ' data-for="%s"' % k) for k, v in alts.items()]
    return '\n    '.join(out)


def build_page(version, name, meta, body, top, wave, foot):
    page = top
    page = re.sub(r'<title>.*?</title>', '<title>%s</title>' % meta['title'], page, flags=re.S)
    page = re.sub(r'<meta name="description" content="[^"]*">',
                  '<meta name="description" content="%s">' % meta.get('description', ''), page)
    page = page.replace('<link rel="stylesheet" href="assets/style.css">',
                        '<link rel="stylesheet" href="assets/style.css">\n<link rel="stylesheet" href="assets/pages.css">')
    page = page.replace('href="%s"' % name, 'href="%s" aria-current="page"' % name, 1) if name != 'index.html' else page
    order = {k.split('.', 1)[1]: [x.strip() for x in v.split(',') if x.strip()]
             for k, v in meta.items() if k.startswith('order.')}
    if order:
        page = page.replace('<body>', "<body data-reorder='%s'>" % json.dumps(order), 1)
    lead = spans(meta, 'lead')
    lead = '\n    <p class="lead">%s</p>' % lead if lead else ''
    if meta.get('hero') == 'home':
        eyebrow = spans(meta, 'eyebrow')
        hero = ('<section class="hero">\n'
                '  <div class="hero-mural" aria-hidden="true"></div>\n'
                '  <div class="hero-inner">\n'
                '    <span class="eyebrow">%s</span>\n'
                '    <h1>%s</h1>%s\n'
                '    %s\n'
                '  </div>\n'
                '  <div class="scroll-cue" aria-hidden="true"></div>\n'
                '  %s\n'
                '</section>\n\n') % (eyebrow, spans(meta, 'h1'), lead, ctas(meta), wave)
    else:
        hero = ('<section class="hero page-hero">\n'
                '  <div class="hero-mural" aria-hidden="true"></div>\n'
                '  <div class="hero-inner">\n'
                '    %s\n'
                '    <h1>%s</h1>%s\n'
                '  </div>\n'
                '  %s\n'
                '</section>\n\n') % (crumbs_html(meta.get('crumbs', '')), spans(meta, 'h1'), lead, wave)
    return page + hero + body + '\n\n' + foot


def with_persona(html):
    """Add the persona stylesheet and script to a page."""
    if 'assets/persona.css' not in html:
        html = html.replace('</head>', '<link rel="stylesheet" href="assets/persona.css">\n</head>', 1)
    if 'assets/persona.js' not in html:
        html = html.replace('</body>', '<script src="assets/persona.js"></script>\n</body>', 1)
    return html


def main():
    pages = sorted(f for f in os.listdir(os.path.join(SRC, 'pages')) if f.endswith('.html'))
    # src/pages.css plus any page-specific files in src/css/, merged into one stylesheet
    css = rd(os.path.join(SRC, 'pages.css'))
    extra_dir = os.path.join(SRC, 'css')
    if os.path.isdir(extra_dir):
        for f in sorted(os.listdir(extra_dir)):
            if f.endswith('.css'):
                css += '\n\n/* ===== src/css/%s ===== */\n' % f + rd(os.path.join(extra_dir, f))
    for v in VERSIONS:
        wr(os.path.join(ROOT, v, 'assets', 'pages.css'), css)
        top, wave, foot = shell(v)
        for f in pages:
            meta, body = parse(os.path.join(SRC, 'pages', f))
            wr(os.path.join(ROOT, v, f), build_page(v, f, meta, body, top, wave, foot))
        # keep the hand-made pages' nav in step
        for f in ['index.html', 'leaders.html', 'president.html']:
            p = os.path.join(ROOT, v, f)
            wr(p, patch_links(rd(p)))
        print('%s: %d pages' % (v, len(pages)))

    persona_src = os.path.join(SRC, 'persona')
    persona_pages = os.path.join(persona_src, 'pages')
    own = sorted(f for f in os.listdir(persona_pages) if f.endswith('.html')) if os.path.isdir(persona_pages) else []
    for pv, base in PERSONA_VERSIONS.items():
        dst = os.path.join(ROOT, pv)
        os.makedirs(dst, exist_ok=True)
        shutil.copytree(os.path.join(ROOT, base, 'assets'), os.path.join(dst, 'assets'), dirs_exist_ok=True)
        for f in ['persona.js', 'persona.css']:
            shutil.copyfile(os.path.join(persona_src, f), os.path.join(dst, 'assets', f))
        top, wave, foot = shell(base)
        for f in sorted(set(pages) | set(own)):
            src = os.path.join(persona_pages, f) if f in own else os.path.join(SRC, 'pages', f)
            meta, body = parse(src)
            wr(os.path.join(dst, f), with_persona(build_page(pv, f, meta, body, top, wave, foot)))
        for f in ['index.html', 'leaders.html', 'president.html']:
            if f not in own:
                wr(os.path.join(dst, f), with_persona(patch_links(rd(os.path.join(ROOT, base, f)))))
        print('%s: %d pages (%d personalised)' % (pv, len(set(pages) | set(own)) + (0 if 'index.html' in own else 1) + 2, len(own)))


if __name__ == '__main__':
    main()

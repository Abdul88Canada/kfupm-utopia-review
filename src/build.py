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
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
VERSIONS = ['granite', 'edited']

# Nav and footer links that now have a local page. Applied to every page.
LOCAL_LINKS = {
    'https://www.kfupm.edu.sa/study/bachelor-of-science': 'programs-list.html',
    'https://www.kfupm.edu.sa/study/colleges': 'colleges.html',
    'https://www.kfupm.edu.sa/study/apply': 'apply.html',
    'https://www.kfupm.edu.sa/study/international-students/fees-and-scholarships': 'tuition-calculator.html',
    'https://www.kfupm.edu.sa/about-us/discover/news': 'news.html',
}
STUDY_EXTRA = ('<h6>Programs</h6><a href="study.html">Study at KFUPM</a>'
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


def build_page(version, name, meta, body, top, wave, foot):
    page = top
    page = re.sub(r'<title>.*?</title>', '<title>%s</title>' % meta['title'], page, flags=re.S)
    page = re.sub(r'<meta name="description" content="[^"]*">',
                  '<meta name="description" content="%s">' % meta.get('description', ''), page)
    page = page.replace('<link rel="stylesheet" href="assets/style.css">',
                        '<link rel="stylesheet" href="assets/style.css">\n<link rel="stylesheet" href="assets/pages.css">')
    page = page.replace('href="%s"' % name, 'href="%s" aria-current="page"' % name, 1) if name != 'index.html' else page
    lead = '\n    <p class="lead">%s</p>' % meta['lead'] if meta.get('lead') else ''
    hero = ('<section class="hero page-hero">\n'
            '  <div class="hero-mural" aria-hidden="true"></div>\n'
            '  <div class="hero-inner">\n'
            '    %s\n'
            '    <h1>%s</h1>%s\n'
            '  </div>\n'
            '  %s\n'
            '</section>\n\n') % (crumbs_html(meta.get('crumbs', '')), meta['h1'], lead, wave)
    return page + hero + body + '\n\n' + foot


def main():
    pages = sorted(f for f in os.listdir(os.path.join(SRC, 'pages')) if f.endswith('.html'))
    css = rd(os.path.join(SRC, 'pages.css'))
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


if __name__ == '__main__':
    main()

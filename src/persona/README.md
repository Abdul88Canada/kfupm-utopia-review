# Personalised versions (granite-personal, edited-personal)

These two versions ask the visitor "Who are you?" on their first visit, then rearrange the
page for that audience with an animated swap. They are built by `python src/build.py`
from the same sources as the other versions.

- `persona.js` / `persona.css`: the engine (question card, header chip, "For you" menu, swap animation).
- `pages/<name>.html`: personalised page sources. A file here replaces `src/pages/<name>.html`
  in the personal versions only. Pages without one get the plain page plus the chip and menu.

## Audiences

| key | label | who |
|---|---|---|
| `undergrad` | Future undergraduate | finishing high school, choosing a bachelor's degree |
| `graduate` | Graduate applicant | master's, executive master's or PhD |
| `international` | International student | applying from outside Saudi Arabia |
| `parent` | Parent or guardian | supporting a son or daughter |
| `faculty` | Faculty and researchers | considering a teaching or research role |
| `default` | Just exploring | everyone else; today's content |

## Authoring a personalised page

Write the page exactly like a `src/pages` page (header comment, then sections), plus these:

**Header comment extras**

    h1.parent: A place your <em>child</em> can thrive
    lead.parent: One or two sentences for parents.
    order.parent: fees, life, facts, apply
    order.faculty: research, leaders

- `h1.<key>`, `lead.<key>` (and on the home page `eyebrow.<key>`, `cta.<key>: Label | href`)
  give that audience its own text. Audiences without one see the plain `h1` / `lead`.
- `order.<key>: a, b, c` puts the sections with those `data-key`s first, in that order,
  for that audience. Unlisted sections follow in their normal order.
- `hero: home` makes the large home-page hero (eyebrow, h1, lead, `cta`) instead of the page hero.

**In the body**

- Give every top-level `<section>` a `data-key="short-name"` so it can be reordered.
- `data-for="parent international"`: shown only for those audiences. Use `default` for "Just exploring".
- `data-not-for="faculty"`: shown for everyone except those audiences.
- Works on anything: whole sections, single cards, a paragraph, an image, a button.
  To swap one sentence, write both versions side by side:
  `<p data-not-for="parent">Plain text</p><p data-for="parent">Parent text</p>`.
- Changing which cards show inside a grid is what creates the strongest "swoosh": cards
  that stay glide to their new places, new ones fly in, old ones fly out.
- Scripts can listen for `document.addEventListener('persona:change', e => e.detail)`
  and read `document.documentElement.dataset.persona`.

## Content rules

- Only real content: reuse facts, figures, programs, dates and links already on the site
  or in the KFUPM reference front end. New wording may reframe ("For parents"), but must
  not add new facts, numbers, fees or promises.
- Every audience should get a clearly different first screen: hero text and button,
  the first two or three sections, and at least one set of cards.
- Keep the default (`Just exploring`) version identical to the plain page.

# Harborlight Digital website

One scrolling page: hero, About, Why Harborlight, Services, FAQ, Contact. Hand-coded HTML, CSS and JavaScript with no build step, ready for GitHub Pages at **harborlightdigital.co**.

## What's in the folder

Every file sits at the top level, with no subfolders, so the whole site uploads in one drag from any browser.

| File | What it is |
| --- | --- |
| `index.html` | The whole page. Logo artwork is embedded at the top as an SVG sprite. |
| `privacy.html` | The Privacy Policy, linked from the bottom of the footer. It repeats the header and footer from `index.html`, so if you change those, change them here too. |
| `styles.css` | All styling. Light and dark colors are the tokens at the top of the file. |
| `waves.js` | The animated waves and glint. Settings are at the top of the file. |
| `main.js` | Light/dark toggle, mobile menu, plan buttons, contact form. |
| `*.woff2` + `LICENSE-*.txt` | Italiana, Tenor Sans and Quicksand, self-hosted (SIL Open Font License, licenses included). |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `logo-mark.svg`, `og-image.png` | Browser icons, logo mark and the social share image. |
| `CNAME` | Tells GitHub Pages the site's domain. Keep it. |
| `404.html`, `robots.txt`, `sitemap.xml` | Not-found page and search engine files. |

## Put it on GitHub Pages

1. On GitHub, create a new **public** repository, for example `harborlight-digital`.
2. Click **Add file → Upload files**, select all 23 files, and drag them in. Commit.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. Still on that page, check that **Custom domain** says `harborlightdigital.co` (the `CNAME` file fills it in). If it's empty, type it and save.

## Point the domain at GitHub (Hover)

In Hover: **Domains → harborlightdigital.co → DNS**.

1. Delete Hover's default records for `@`, `*` and `www` (they point to Hover's parking page). If you use Zoho Mail, also replace Hover's default MX records with the ones Zoho gives you.
2. Add these records:

| Type | Hostname | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | YOUR-GITHUB-USERNAME.github.io |

3. DNS changes take anywhere from a few minutes to a few hours. When GitHub's Pages settings show the DNS check passed, tick **Enforce HTTPS**.
4. Recommended: verify the domain under your GitHub **profile Settings → Pages → Add a domain**. It stops anyone else from claiming harborlightdigital.co on GitHub.

The addresses above are GitHub's published Pages IPs; if anything doesn't connect, compare them with GitHub's guide "Managing a custom domain for your GitHub Pages site."

## After it's live

- **Send yourself a test message** through the contact form. Submissions go to Formspree form `mzedrvbp` and then to your inbox. In Formspree you can restrict the form to `harborlightdigital.co` to block spam from other sites.
- **Swap in the real email** when Zoho is set up. `hello@harborlightdigital.co` appears 3 times in `index.html` (search for it).
- **Testimonials:** the nav link is commented out in `index.html`. Remove the `<!--` and `-->` around it once a testimonials section exists.

## Things to update later

- **One-line wordmark.** Your mockup set "HARBORLIGHT DIGITAL" on one line in Tan Mon Cheri. The logo file only contains HARBORLIGHT in that font (no D), so the hero uses your logo lockup for now. Export the one-line version from Canva as SVG and it can be swapped into the `hero-word` spot.
- **Policy text in the FAQ** (deposit, $50 small updates, $75/hour) is a starting draft. Edit it in `index.html` under `<!-- FAQ -->`.
- **Privacy Policy** (`privacy.html`) promises a reply to data requests within 30 days and lists Formspree, Zoho Mail and GitHub Pages as the services that handle visitor information. If you add analytics, a new form tool or anything that tracks visitors, update the policy and its "Last updated" date.
- **Why Harborlight icons** are simple placeholders. Replace the four `<svg>` blocks inside `.why-icon` with your own drawings.

## Wave settings (`waves.js`, top of file)

| Setting | Default | What it does |
| --- | --- | --- |
| `RESPECT_REDUCED_MOTION` | `false` | `true` holds the waves still for visitors whose device asks for less motion. |
| `MOBILE_MOTION_MS` | `60000` | On phones the waves move for 1 minute, then settle while the glint keeps traveling. Scrolling wakes them for another minute. |
| `WAVE_SPEED` | `1` | Overall wave speed. |
| `HERO_STRANDS` | `7` | Number of lines in the hero ribbon. |
| `BEAM_PERIOD` | `8` | Seconds for one full turn of the lighthouse beam behind the About section. The glint on the hero wave is timed to it, like the lighthouse reflecting on the water. |
| `RIBBON_SPACING` | `6` | Space between the lines of the old About ribbon, in pixels (only used if you switch back to it, see below). |

The About background is a lighthouse beam turning in fog. To switch back to the twisting line ribbon, change `data-wave="beacon" data-res="0.25"` to `data-wave="about"` on the About `<canvas>` in `index.html`. The beam's color and strength for each mode are `--beam-rgb` and `--beam-strength` at the top of `styles.css`.

## Preview on your computer

Double-click `index.html` to open it in a browser. The page, fonts and waves all work from the folder; test the contact form on the live site.

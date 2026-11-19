# Vice City Cover Maker — GTA 6 Cover Art Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Azet17/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Azet17/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photos into GTA-style multi-panel poster
art — the kind of cover you'd post for GTA 6. Add photos from your machine (or
use the two bundled samples), crop and position each one per panel, pick a
layout, a colour grade and your caption, and export a PNG ready to share.

## What it does

- **Any photo:** file picker or drag-and-drop, plus two bundled sample photos.
  Click a panel to select it, drag to pan, scroll (or the slider) to zoom.
  One photo can fill several panels, or several photos across panels.
- **Layouts:** 4-panel grid, hero-and-three, and full-bleed single photo.
- **Lettering:** editable title block, big bold display caption (Anton, SIL OFL)
  with outline and shadow, and a neon script subtitle (Pacifico, SIL OFL).
- **Colour grades:** Vice City sunset, neon night, golden hour — plus film
  grain and vignette toggles.
- **Export PNG:** 1080 × 1080, 1080 × 1350, 1920 × 1080, one click.
- **Live preview:** the cover updates as you change anything.
- **Fully offline:** static files under `app/`, no build step, no network
  requests. Your photos never leave your machine.

## Try it

Serve `app/` with any static server and open `index.html`, for example:

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

## Build the submission output

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into `out/` and writes
`out/dossier.json`. It needs Node 22 and nothing else (standard library only).

## Referral

Made for the make.fun bounty — [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01?ref=3cnb50c1) (referral code `3cnb50c1`).

## Original art only

No Rockstar Games logo, wordmark, official artwork, character or font is used.
Fonts are Anton and Pacifico under the SIL Open Font License (see
`app/fonts/OFL-Anton.txt` and `app/fonts/OFL-Pacifico.txt`).

# Documentation screenshots

`atlas-labs-desktop.png` is an actual Chromium screenshot of the bundled synthetic
example. It contains no private data. The browser test that originally captured
it was removed with the automated suites on October 16, 2026.

To update it, run `npm ci` and `npm run example`, open Atlas Labs in a browser,
and capture the desktop article. Save the reviewed image as
`docs/assets/atlas-labs-desktop.png`. Use only the synthetic example; never
capture a private wiki for public documentation. Inspect narrow layouts
separately when changing the interface.

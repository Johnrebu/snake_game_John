Friends‑Inspired Snake — PWA
=================================

This is a small, installable Progressive Web App game inspired by the *feel* of classic sitcoms (colours, cafe vibes).
It intentionally avoids copyrighted material (no official "Friends" theme song or character art). Background music is generated in-browser using the WebAudio API.

How to use
----------
1. Unzip the package to a static hosting folder (or serve with any static file server).
2. Open `index.html` in a browser (prefer modern Chrome/Firefox/Safari).
3. To enable offline use, ensure service worker registration succeeds (first load online). Then the app can be launched offline.

Files
-----
- index.html — main page
- style.css — styles
- app.js — game & music logic
- manifest.json — PWA manifest
- sw.js — service worker (simple cache-first)
- icons/* — PNG icons for installability

License
-------
MIT — feel free to modify.
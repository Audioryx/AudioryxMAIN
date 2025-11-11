# Audioryx — Glassmorphic Music Player (Static Demo)

This repository is a **fully client-side, GitHub Pages-ready** starter for an Audioryx interface:
- Glassmorphic, Spotify-like layout inspired by iOS 26.2 beta styling.
- Client-side audio player using HTML5 `<audio>` (no backend).
- Upload your own audio files with the Upload button (local only).
- Customizable accent color and blur.

## How to use

1. Replace demo audio files in `media/` with your own `.mp3` files (filenames used in `script.js`), or upload via the UI.
2. Commit this repository to GitHub and enable **GitHub Pages** on the `main` branch (or `gh-pages`).
3. Site will be available at `https://<your-username>.github.io/<repo>/`.

## Features included (demo)
- Sidebar navigation, Now Playing bar, search box, playlists (local-only).
- Glassmorphic blur and accent customization.
- Responsive layout for narrow screens.

## To extend
- Connect a backend (Node/Express + DB) to stream and manage large libraries.
- Add user accounts, sync, offline caching, real streaming, codecs, gapless playback.
- Implement real playlists persistence via `localStorage` or server API.

Enjoy — replace media and customize the UI to your needs.

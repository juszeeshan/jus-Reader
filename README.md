# Jus Reader

A GitHub Pages-ready, offline-first reading PWA for personal books and study material.

## Included in this first build
- Local library: import EPUB, PDF, TXT and HTML files.
- IndexedDB storage: imported books and personal data stay in this browser/device.
- EPUB reader with table of contents (EPUB.js).
- PDF reader with page navigation (PDF.js).
- TXT pagination and safe HTML rendering.
- Paper, sepia and dark reading themes.
- Font size controls, bookmarks, text highlights and notes.
- Vocabulary collection with editable meanings.
- Reading progress and basic reading-time tracking.
- Installable PWA shell and service-worker caching.

## Publish with GitHub Pages
1. Create a new GitHub repository, for example `jus-reader`.
2. Upload all files and folders from this ZIP to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. Wait for GitHub Pages to publish. Open the generated HTTPS URL in Chrome.
7. In Chrome on Android, use **⋮ → Add to Home screen** or the install prompt.

## Important notes
- Use the deployed HTTPS site (or localhost) for service workers and PWA installation. Opening `index.html` directly as a file will not enable PWA features.
- Imported books are stored in the browser's IndexedDB. Clearing site data, using a different browser/profile, or uninstalling/clearing app storage can remove local books and notes. Keep your original files backed up.
- This is a single-device, local-first app. Cloud sync, accounts and cross-device sync are not included yet.
- EPUB.js and PDF.js are loaded from CDNs in this version. The app shell is cached for offline use, but first-time EPUB/PDF library loading needs an internet connection. After the libraries have loaded, browser caching may keep them available; this is not guaranteed on every device.
- DRM-protected EPUBs and PDFs that require a password are not supported.
- HTML files are sanitised before display, but this is intended for personal documents, not untrusted websites.
- Text-to-speech, automatic dictionary definitions/pronunciation, OCR for scanned PDFs, advanced PDF text highlighting, and cloud sync are planned enhancements, not yet implemented.

## Local development
Serve this folder over localhost, e.g. with VS Code Live Server. Do not open `index.html` directly.

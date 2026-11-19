# Jus Reader

A GitHub Pages-ready, offline-first reading PWA for personal books and study material.

## Version 3 features
- Import and read PDF, DOCX, EPUB, TXT, RTF, Markdown (MD), CSV, JSON, XML and HTML files.
- IndexedDB storage: imported books and personal data stay in this browser/device.
- EPUB reader with table of contents (EPUB.js).
- PDF reader with page navigation (PDF.js).
- Paginated plain-text reading, Markdown rendering, CSV/JSON/XML text viewing and sanitised HTML rendering.
- DOCX import using Mammoth.js; PDF viewing and selectable-text extraction for read-aloud where the PDF contains a text layer.
- Select a sentence and use the basic sentence helper to split it into shorter parts and identify words to look up.
- Paper, sepia and dark reading themes.
- Font size controls, bookmarks, text highlights and notes.
- Vocabulary collection with editable meanings and online dictionary lookup.
- Browser/device text-to-speech for the current readable page.
- Export notes, highlights and vocabulary to a plain-text file.
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
- Scanned-PDF OCR, advanced PDF text highlighting and cloud sync are not included yet. Dictionary lookup needs internet access; read-aloud depends on voices available on the device.

## Local development
Serve this folder over localhost, e.g. with VS Code Live Server. Do not open `index.html` directly.

## Notes and limitations
- DOCX conversion and PDF/EPUB readers use libraries loaded from CDNs, so an internet connection is needed the first time those libraries load.
- Legacy Word .doc, ODT, password-protected files and DRM-protected EPUBs are not supported.
- Scanned/image-only PDFs do not contain selectable text; OCR is not included. PDF text extraction/read-aloud works only when a text layer exists.
- Sentence helper is a lightweight reading aid, not an AI explanation or translation service. Dictionary lookup needs internet access; read-aloud depends on device voices.
- Imported documents are stored locally in this browser/device. Keep original files backed up.

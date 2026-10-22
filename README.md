# Writings of Swami Pitambarananda

A simple reading app for the talks, essays, letters and question-and-answer sessions of Swami Pitambarananda (Ramakrishna Order). It is a static website that runs on GitHub Pages with no server, database or build step.

## Features

- **Two sections**: **English** (47 writings in six topics) and **हिन्दी** (36 writings in four topics: प्रवचन एवं लेख, शास्त्र एवं भाष्य, स्तोत्र एवं पद्य, प्रेरक पत्र).
- **Reader**: full text of every piece, with adjustable text size and light/dark theme.
- **Original pages**: every page of every source document (225 English and 499 Hindi pages), including Sanskrit and Bengali verses.
- **Search**: find any word or phrase, in English or Hindi, across all writings; results open with the words highlighted.
- **Q&A**: 113 questions and answers you can browse or filter.
- **Thought for today / आज का विचार**: a short quotation that changes daily in each section, quoted word for word.
- Works on phones; remembers the last piece you read.

## Put it on GitHub Pages

1. Create a new repository on GitHub (for example `pitambarananda`).
2. Put everything in this folder in the repository root, keeping the `.nojekyll` file. The site has about 740 files, and github.com’s **Upload files** page takes at most 100 files at a time, so use **GitHub Desktop** or the git commands below. (With the browser, upload `index.html`, `.nojekyll`, `README.md`, `assets` and `data` first, then the `pages` folders a few at a time.)
3. Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose the `main` branch and the `/ (root)` folder, then **Save**.
4. After a minute or two the site is live at `https://<your-username>.github.io/<repository-name>/`.

Or with git:

```bash
git init
git add .
git commit -m "Writings of Swami Pitambarananda"
git branch -M main
git remote add origin https://github.com/<your-username>/<repository-name>.git
git push -u origin main
```

## Try it on your computer

The pages load their data with `fetch`, so open them through a small web server rather than double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Folder layout

```
index.html            the app shell
assets/style.css      design
assets/app.js         library, reader, search, Q&A, thought of the day
assets/icon.svg       site icon
data/library.json     titles, topics, sources, summaries
data/texts.json       full text of every piece
data/qa.json          question-and-answer pairs
data/thoughts.json    quotations for "Thought for today"
pages/<piece>/N.webp  original page images
```

## Editing content

- **Fix a typo**: edit the text in `data/texts.json` (search for the sentence).
- **Change a title, summary or topic**: edit `data/library.json`.
- **Add a thought**: add `{"t": "exact quotation", "a": "piece-id"}` to `data/thoughts.json`.

Text markup used in `texts.json`: a blank line separates paragraphs, `## ` starts a heading, `> ` marks a verse line, `^^ ` marks a footnote, `[[ORIG]]` marks a Sanskrit or Bengali verse that appears only on the original page, and `[[PAGE n]]` shows original page *n* inline (used for diagrams).

## Notes on the text

- Articles scanned from *Prabuddha Bharata* and *The Vedanta Kesari* were read with text recognition and checked against the page images.
- A few hymn documents (Purusha Sukta, Devi Sukta, Shiva Tandava Stotra, Patanjala Yoga Sutras, Yakshanurupo hi Balih) use old Sanskrit fonts that cannot be converted to text reliably. They open on the original pages by default; their text view holds the English portions.
- `108.pdf`, `108-Copy.pdf` and `108Why.pdf` contain the same two letters, so they appear once as “Why 108?”. The two parts of the September 1995 Youth Forum are joined into one piece.

## Hindi section

- The Hindi texts were converted from the old Hindi fonts of the source PDFs (BRH Devanagari, Kruti Dev, Khalnayak, Krishna, Ajay, Chanakya and Sanskrit 98), reading each font separately, and checked against the page images. The full **नारदभक्तिसूत्र – व्याख्या** was typed from its 126 scanned pages.
- Every Hindi piece has its original pages (499 in all). Two scanned items have no typed text and open on their pages: the handwritten notes on the second chapter of the Shvetashvatara Upanishad, and the printed appendix on Sanskrit prosody.
- Hindi texts use a line-based markup in `data/texts.json`: `# ` and `## ` headings, `@ ` verse lines, `@@ ` sūtra, `>s ` Sanskrit commentary, `>q ` quoted passage (used for the Vachanamrita text), `> ` word-split (पदच्छेद), `>n ` footnote, `>r ` right-aligned line, `#C ` centred line, `**bold**`, and `| … | …` table rows (`|| ` for the header row).
- Where a source PDF exists in several versions, one is used: the A4 edition of the Vachanamrita notes (A5 and demy editions hold the same text), the book edition of “ईश्वर को क्या कभी किसी ने देखा है?”, `c.pdf` for the Vedanta questions (`Mandukyakarika Advaita.pdf` is the same text), and `Panchakam.pdf` for the Ekashloki and the two Panchakams.

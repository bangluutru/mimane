# Mimane — Listen · Shadow · Speak

A media-based language learning engine that turns authentic content into
**Sentence Learning Units** — listen, read, repeat, shadow, record, compare, review.

First-class learner groups: 🇻🇳→🇯🇵 Vietnamese learning Japanese · 🇻🇳→🇬🇧 Vietnamese
learning English · 🌏→🇻🇳 foreigners learning Vietnamese (English / Japanese UI).

Architecture, domain boundaries, data model and MVP scope: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run

```bash
npm install
npm run data:build      # linguistic data → public/data, public/dict, public/vendor
npm run lessons:build   # prepared lessons → public/lessons + public/media (macOS: uses `say` + ffmpeg)
npm run dev
```

Generated files in `public/` are meant to be checked in, so `npm run dev` works
without macOS or network access. `npm test` runs the unit tests (engine, parsers, language
adapters, import pipeline); `npm run build` produces a static site in `dist/`
(host on any static host with SPA fallback to `index.html`).

## What is in the MVP

| Area | Status |
|---|---|
| Library, 20-topic taxonomy, JLPT / CEFR / Vietnamese levels, search & filters | ✅ |
| Home: continue, recommended (level + interests + history), topics, levels, short / deep | ✅ |
| Onboarding: I speak / I learn / level / interests; UI in vi · en · ja | ✅ |
| Media: YouTube adapter, uploaded audio/video, prepared lessons — one `MediaPlayer` interface | ✅ |
| Transcript import: SRT, VTT, TXT (LRC timestamps or tap-to-sync), JSON; cue → sentence merge; translation track aligned by time | ✅ |
| Study modes on one `StudyEngine`: Listen, Listen & Read, Repeat (timed pause), Shadow, Dictation | ✅ |
| Sentence navigation, replay, loop ×N / ∞, speed 0.5–1.25×, auto-pause, keyboard shortcuts | ✅ |
| Synced transcript, auto-scroll that yields to manual scrolling, favorite / difficult marks | ✅ |
| 🇯🇵 kuromoji tokens, merged conjugations, okurigana-aware furigana, JLPT filter (All … Rare, Off) | ✅ |
| 🇬🇧 IPA + primary stress (CMU), phrases, linking & weak-form hints, CEFR | ✅ |
| 🇻🇳 syllable parser (initial / glide / vowel / final / tone), tone colours & contours, regional notes | ✅ |
| Vocabulary cards per language + save; Review (difficult, saved, vocabulary, recordings) | ✅ |
| Recording per sentence, attempts, waveform, Native ↔ Me ×2 — stored on-device only | ✅ |
| Progress: minutes listened / shadowed, sentences practised, lessons completed, words saved | ✅ |
| Pronunciation scoring | ⛔ intentionally not shown — `PronunciationEngine` boundary only |

## Adding content

* **Prepared lessons**: write `content/lessons/<id>.json` and extend
  `content/lexicon/<lang>.json` (schema in [content/README.md](content/README.md)),
  then `npm run lessons:build -- <id>`. Demo lessons use synthesized voices and
  are labelled as such; replace `media` with real recordings for production.
* **Your own media**: *Add lesson* → YouTube link or file + subtitle file / pasted
  transcript (+ optional translation subtitle). Everything is analysed locally.

## Data & credits

kuromoji.js + IPADIC (Apache-2.0) · JLPT word lists from
[elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) (MIT; based on
Jonathan Waller's lists) · kanji levels from
[davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT) ·
CMU Pronouncing Dictionary via `cmu-pronouncing-dictionary` (ISC) · icons: Lucide (ISC).

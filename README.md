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

Automatic transcription (optional, recommended). This runs faster-whisper
large-v3-turbo on your computer, and it is required for YouTube links:

```bash
npm run transcriber     # http://127.0.0.1:8778 — first run downloads the model (~1.6 GB)
```

`tools/py.sh` looks for a Python that has `faster-whisper` + `flask` (by default
the `ai-workforce/.venv-tts`). Otherwise create one with
`python3 -m venv tools/transcriber/.venv && tools/transcriber/.venv/bin/pip install -r tools/transcriber/requirements.txt`.
YouTube audio is fetched with `yt-dlp` (`brew install yt-dlp`). Without the
server, uploaded files can still be transcribed in the browser (Whisper via
Transformers.js; slower and less accurate).

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
| Automatic transcription: local faster-whisper (files + YouTube) or in-browser Whisper → sentences from word timings → editable SRT | ✅ |
| Demo lessons with neural voices (Edge Nanami/Keita/Ava/Andrew/Emma, VieNeu Trúc Ly/Mai Anh/Minh Quân Pro), ASR-verified | ✅ |
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
  then `npm run lessons:build -- <id>` and `npm run lessons:qa` (Whisper round-trip
  check). TTS engines come from the ai-workforce toolchain (`AIWF_DIR`). Demo
  lessons use synthesized voices and are labelled as such. Edge voices are
  generated through Microsoft's online read-aloud service, so check its terms or
  switch to an offline engine before distributing commercially.
* **Your own media**: *Add lesson* → YouTube link or file + subtitle file / pasted
  transcript (+ optional translation subtitle). Everything is analysed locally.

## Data & credits

kuromoji.js + IPADIC (Apache-2.0) · JLPT word lists from
[elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) (MIT; based on
Jonathan Waller's lists) · kanji levels from
[davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT) ·
CMU Pronouncing Dictionary via `cmu-pronouncing-dictionary` (ISC) · speech recognition:
OpenAI Whisper (MIT) via faster-whisper (MIT) and Transformers.js (Apache-2.0) ·
Vietnamese TTS: VieNeu-TTS v3 Turbo (Apache-2.0) · icons: Lucide (ISC).

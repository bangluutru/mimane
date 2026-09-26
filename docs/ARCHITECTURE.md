# Mimane — Architecture

> A media-based language learning engine that turns authentic content into
> **Sentence Learning Units**, for three first-class learner groups:
> 🇻🇳→🇯🇵, 🇻🇳→🇬🇧, 🌏→🇻🇳.

## 1. Requirement analysis — what actually matters

| Brief says | Engineering consequence |
|---|---|
| Core entity is the *sentence*, not the video | `Sentence` is the unit every feature attaches to (progress, recordings, marks, vocabulary context, review). Media is just a clock + a sound source. |
| Languages differ fundamentally | A `LanguageAdapter` per target language owns tokenisation, analysis and lookup; a matching `LanguageUI` owns rendering. Core code never branches on `lang === 'ja'`. |
| Playback must be instant | All linguistic data is **precomputed** (build-time for prepared lessons, import-time for user lessons) and stored with the lesson. Playback never waits on network / AI. |
| Honest pronunciation feedback | A `PronunciationEngine` interface exists, the MVP implementation returns *"not available"*. Native-vs-Me comparison + waveforms are the MVP feedback. No fake scores. |
| Privacy of voice | Recordings are stored locally (IndexedDB), never uploaded. One-click delete all. |
| Mobile first | Player layout: media → current sentence → transcript, with a thumb-reachable control bar fixed at the bottom. |
| No over-engineering | One static SPA, modular monolith, local-first storage behind repository interfaces so a cloud sync backend can be added later without touching features. |

## 2. Audit
Empty repository — greenfield. The reference app (Shadowing Studio) was used
only for the concept of a sentence-synchronised shadowing player.

## 3. Proposed architecture

```
┌──────────────────────────── Static SPA (Vite + React + TS) ───────────────────────────┐
│ features/  (pages & feature UI)                                                        │
│   home · library · player · review · progress · import · onboarding · settings        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ domains/   (framework-free TS, unit-tested)                                            │
│   media · lesson · transcript · study · recording · vocabulary · progress · library    │
│   recommendation · pronunciation · user · storage                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ languages/  LanguageAdapter registry (isomorphic: browser + Node build scripts)        │
│   ja (kuromoji, furigana, conjugation, JLPT) · en (IPA/CMU, stress, CEFR, linking)     │
│   vi (syllable parser: initial/nucleus/final/tone, compounds, regional accent notes)   │
│   + LanguageUI registry (sentence renderer, vocab card, pronunciation aid, settings)    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ storage: IndexedDB (profile, progress, marks, recordings, vocabulary, user lessons)    │
│ static:  public/lessons/*.json (pre-analysed) · public/media · public/data · /dict     │
└────────────────────────────────────────────────────────────────────────────────────────┘
          ▲ build time: scripts/build-lessons.ts (adapters + TTS + timestamps)
```

**Why a static, local-first SPA for the MVP:** zero backend to operate, instant
interactions, recordings stay on device by default, and deployable to any static
host. Every persistence call goes through a repository in `domains/*/repo.ts`, so
adding sync (e.g. a Workers + D1/R2 backend) later is additive.

**AI is an enhancement layer**, not present in the MVP runtime path. Hooks are
defined where it will plug in (`TranslationProvider`, difficulty estimator,
classifier) and all AI output will be cached as lesson data, never computed during
playback.

## 4. Domain boundaries

| Domain | Owns | Depends on |
|---|---|---|
| `media` | `MediaPlayer` interface; `Html5MediaPlayer`, `YouTubePlayer` adapters | — |
| `lesson` | `Lesson`, `Sentence` types, catalog + user-lesson repository | language (types) |
| `transcript` | SRT / VTT / TXT / LRC / JSON parsers, cue→sentence segmentation, translation alignment by time | language (sentence splitting) |
| `language` (`src/languages`) | adapters, proficiency frameworks, accents, analysis types | — |
| `study` | `StudyEngine` state machine (Listen, Read, Repeat, Shadow, Dictation), dictation diff | media (interface only) |
| `recording` | mic capture, attempts repository, peaks/waveform, Native↔Me sequence | study, media |
| `vocabulary` | lookup (lesson glossary → shared data), saved words | language |
| `progress` | lesson progress, sentence marks (favorite/difficult/repeats), stats | — |
| `library` | taxonomy, search & filters | lesson |
| `recommendation` | `Recommender` interface + deterministic scorer | library, progress, user |
| `pronunciation` | `PronunciationEngine` interface (no scoring in MVP) | language |
| `user` | learner profile: support & target language, level per language, interests, display prefs | — |

Rule: `domains/*` and `languages/*` never import from `features/*`. The
`StudyEngine` only knows the `MediaPlayer` interface — YouTube is one adapter.

## 5. Data model (see `src/domains/lesson/types.ts`, `src/languages/types.ts`)

```ts
Lesson {
  id, schemaVersion
  title: { original, [supportLang]: string }   description
  targetLanguage: 'ja'|'en'|'vi'   supportLanguages: string[]
  media: {kind:'youtube',videoId} | {kind:'file',mediaType,url} | {kind:'blob',mediaType,blobId}
  durationSec
  categories: CategoryId[]  (stable taxonomy)   tags: string[] (free)
  difficulty: { framework: 'jlpt'|'cefr'|'vi-level'|…, level, estimated? }
  accent?: 'ja-tokyo'|'en-us'|'en-gb'|'vi-north'|'vi-central'|'vi-south'
  speakers?, thumbnail?, source: {kind, attribution?, url?, license?, synthetic?}
  sentences: Sentence[]
  glossary: Record<lexKey, LexEntry>          // offline dictionary for this lesson
  createdAt, updatedAt, origin: 'catalog'|'user'
}

Sentence {                                     // ← Sentence Learning Unit
  id, index, start, end, text, speaker?
  translations: { [supportLang]: string }      // vi, en, ja … never hard-coded pair
  analysis: JaAnalysis | EnAnalysis | ViAnalysis   // discriminated by `lang`
  note?: { [supportLang]: string }
}
```

Linguistic data is **not** forced into one schema — `analysis` is a discriminated
union and each language has its own token type:

| | token fields |
|---|---|
| ja | surface, lemma, reading, ruby segments (kanji↔kana), pos, conjugation[], jlpt (+ source) |
| en | surface, lemma, pos, ipa, stress index, syllables, cefr, phrase span, linking to next, weak form |
| vi | surface, syllables[{initial, medial, nucleus, final, tone, toneName}], lemma (compound), pos |

User state is stored **separately** from content (content is immutable/shareable):

```ts
LessonProgress   { lessonId, lastSentenceIndex, practicedSentenceIds, completed, listenedMs, shadowedMs, lastOpenedAt }
SentenceMark     { sentenceId, lessonId, favorite, difficult, plays, repeats, recordings, lastPracticedAt }
Recording        { id, userId, lessonId, sentenceId, attempt, blob, mime, durationMs, peaks, createdAt }
SavedWord        { id: `${lang}:${lemma}`, lang, lemma, surface, reading?, meaning?, entry?, contexts[], srs? }
LearnerProfile   { supportLanguage, targetLanguage, levels{lang→level}, interests[], display{...} }
```
`srs?` is reserved for Phase 2 spaced repetition — vocabulary and sentences share
the same review store so flashcards / quizzes will not duplicate data.

## 6. Language Adapter model

```ts
interface LanguageAdapter<A extends SentenceAnalysis> {
  code; name; framework: ProficiencyFramework; accents; defaultAccent
  splitSentences(text): string[]              // for TXT / paste import
  analyze(text, ctx): Promise<A>              // deterministic; may lazy-load data
  lookupKey(token): string | undefined        // how a token maps to a lexicon key
  normalizeForDictation(text): string          // compare rules (ja: kana/width, vi: keep tones)
  estimateDifficulty?(analyses): Level | undefined
}
interface LanguageUI {                        // React side, same registry key
  SentenceView   // ruby / IPA / tone colouring, token click → vocab card
  VocabCardBody  // language-specific facts
  DisplaySettings// furigana threshold | IPA & stress | tone marks & accent
}
```

- **ja**: kuromoji (IPADIC) → merge verb/adjective + auxiliaries into words
  (忙しかっ+た → 忙しかった, lemma 忙しい, conjugation past) → furigana alignment
  (okurigana-aware) → JLPT from lesson lexicon ▸ JLPT word list ▸ kanji-level
  estimate. Furigana filter: All · N5+ · N4+ · N3+ · N2+ · Rare only · Off.
- **en**: tokeniser + rule lemmatiser (+irregular forms) → CMU dict → IPA with
  primary stress → phrase detection from lexicon → connected-speech hints
  (consonant→vowel linking, weak forms). `PronunciationEngine` will later add
  phoneme alignment.
- **vi**: pure deterministic syllable parser (ngh/gi/qu edge cases, 6 tones),
  compound segmentation by greedy lexicon match, regional notes (e.g. d/gi/r →
  /z/ North vs /j/ South, hỏi/ngã merge in the South) that are shown as
  *variants*, never as errors.

## 7. Information architecture

```
Home (discover)            Library (search + filters)       Review
 ├ Continue learning        ├ query (title/tag/keyword)       ├ Difficult sentences
 ├ Recommended for you      ├ language · level · topic        ├ Saved sentences
 ├ Explore topics           ├ duration (short/medium/deep)    ├ Vocabulary
 ├ Explore level            └ accent                          └ Recordings
 ├ Short practice (<3 min)
 └ Deep listening (10+ min)                                 Progress (5 honest numbers)
Player  /lesson/:id?mode=listen|read|repeat|shadow|dictation  Import  (YouTube | file) + (SRT/VTT/TXT/JSON | paste)
Onboarding  (I speak → I learn → level → interests)          Settings (profile, display, privacy, data)
```

## 8. Primary user flows

```
Vietnamese → Japanese (success criterion)
Home → topic "Science" / level N3 → lesson → Listen (subtitles off)
 → Read (JP + furigana N4+ + Vietnamese) → tap 散乱 → vocab card → Save
 → Repeat (auto-pause, gap ×1.2) → Shadow @0.8× with loop → 🎙 record
 → Native↔Me ×2 → mark ⚑ difficult → Review › Difficult sentences

Vietnamese → English:  Business · B1 → Read (EN + VI + IPA on tap) → Shadow → Record → Review
Foreigner → Vietnamese: Culture · Beginner → Read (VI + tone colours + EN/JA) → Repeat → Record → Compare → Review
Import: paste YouTube URL → upload .srt (+ optional translation .srt) → metadata → analysed → Player
```

## 9. MVP boundary

**In:** lesson library + taxonomy + difficulty; YouTube + uploaded audio/video;
SRT/VTT/TXT(LRC or tap-sync)/JSON import; synced transcript with auto-scroll and
scroll-suspend; sentence navigation, replay, loop, speed, auto-pause; modes
Listen / Listen & Read / Repeat / Shadow / (basic) Dictation; translations by
support language; furigana levels; IPA + stress + linking hints; Vietnamese
tone/syllable aid + accent metadata; vocabulary cards + save; per-sentence
recordings with attempts, waveform, Native↔Me sequence; favorites / difficult;
progress & stats; onboarding interests + deterministic recommendations; vi / en /
ja UI; responsive, keyboard shortcuts.

**Out (Phase 2+):** SRS / flashcards, AI grammar explanations, auto
classification & difficulty via AI, playlists, cloud sync / accounts,
pronunciation scoring, forced alignment, speech recognition.

## 10. Deviations from the brief (and why)

- **User progress is not embedded in `Sentence`.** Content stays immutable and
  cacheable; progress is joined at runtime by `sentenceId`.
- **Prepared demo lessons use synthesized (TTS) audio** generated at build time
  so the catalog is shippable without licensing third-party media; they are
  labelled as synthetic. Authentic content enters via YouTube/file import.
- **Dictation** is included in basic form because it costs little once the
  `StudyEngine` exists (the brief lists it as Phase 2).
- **Japanese → Vietnamese meanings** for *imported* text: no open JA–VI dictionary
  exists, so imported Japanese shows reading / lemma / POS / JLPT deterministically
  and an English gloss when available; learners can add their own meaning when
  saving. Prepared lessons carry a curated Vietnamese glossary.

## 11. Implementation notes

- **Engine timing.** Sentence boundaries are checked on every animation frame,
  plus a 200 ms timer heartbeat and a one-shot timer aimed at the expected
  sentence end. Browsers suspend `requestAnimationFrame` in hidden tabs, and
  loops / auto-pause must still hold there (covered by a unit test).
- **Japanese in the browser.** Prepared lessons never load the tokenizer. For
  imports, kuromoji's UMD bundle and dictionary load lazily from
  `public/vendor` and `public/dict`. Dictionary files ship as `*.dat.bin`
  (still gzip bytes) because some servers add `Content-Encoding: gzip` to `*.gz`,
  which makes kuromoji's own gunzip fail.
- **Readings.** A curated lexicon reading beats the IPADIC reading for
  uninflected words (日本 → にほん). Source sentences can also carry `readings`
  overrides, so authors never need to rewrite natural sentences to get
  furigana right.
- **Dictation** reports a transparent count (units matched / expected). For
  Vietnamese and English, a word that is right except for its tone or accent
  marks is reported separately rather than as a missing word.

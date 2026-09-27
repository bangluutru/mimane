# Prepared lesson content

Source files here are **authored by humans (or reviewed drafts)** and compiled by
`npm run lessons:build` into `public/lessons/*.json` + `public/media/*.mp3`.
The build step runs the deterministic language adapters (tokenizer, furigana,
IPA, Vietnamese syllable parser), generates demo audio with macOS TTS and
computes sentence timestamps — so the app only *renders* pre-analysed data.

## Curated YouTube video lessons

`content/video-lessons.json` is the source manifest for curated real-video
practice lessons. Each row points to a YouTube video and an original-language
SRT in `content/subtitles/`. The video stays on YouTube; the app embeds it and
uses the timed captions to drive sentence-by-sentence practice. Caption files
are retained as source material and copied to `public/subtitles/` for each
compiled lesson. English and Japanese machine captions are identified in the
manifest and lesson attribution so learners can distinguish them from manual
captions.

Build them with `npm run video-lessons:build`. The compiler validates source
IDs, category IDs, caption language, timed cues, and the four-minute minimum,
then compiles `public/lessons/<id>.json` with token analysis and adds its entry
to `public/lessons/catalog.json`. A full `npm run lessons:build` keeps the
curated YouTube entries in that catalog while rebuilding authored audio
lessons.

## `content/lessons/<id>.json`

```jsonc
{
  "id": "ja-science-sky-blue",            // kebab-case, prefixed with target language
  "targetLanguage": "ja",                  // "ja" | "en" | "vi"
  "title":       { "original": "空はなぜ青いのか", "vi": "…", "en": "…" },
  "description": { "vi": "…", "en": "…", "ja": "…" },   // short, 1 sentence each
  "categories": ["science", "nature"],     // ids from the taxonomy below (1–3)
  "tags": ["physics", "light", "sky"],     // free-form, lowercase English
  "difficulty": { "framework": "jlpt", "level": "N3" },
  "accent": "ja-tokyo",                    // ja-tokyo | en-us | en-gb | vi-north | vi-central | vi-south
  "voice": "edge:ja-JP-NanamiNeural",      // edge:<voice> | vieneu:<preset> | say:<macOS voice>
  "sentences": [
    {
      "text": "空はなぜ青く見えるのでしょうか。",
      "translations": { "vi": "…", "en": "…" },
      "note": { "vi": "optional short learner note", "en": "…" }   // optional
    }
  ]
}
```

Difficulty frameworks / levels:

| framework  | levels |
|------------|--------|
| `jlpt`     | `beginner`, `N5`, `N4`, `N3`, `N2`, `N1`, `native` |
| `cefr`     | `A1`, `A2`, `B1`, `B2`, `C1`, `C2`, `native` |
| `vi-level` | `beginner`, `elementary`, `intermediate`, `upper-intermediate`, `advanced`, `native` |

Category ids: `daily-life`, `travel`, `work-business`, `science`, `technology`,
`health`, `nature`, `culture`, `history`, `art`, `music`, `entertainment`,
`food`, `education`, `sports`, `family`, `news-society`, `philosophy`,
`lifestyle`, `other`.

Translations: Japanese lessons → `vi` + `en`; English lessons → `vi` + `ja`;
Vietnamese lessons → `en` + `ja`. Translations must be natural, not word-by-word.

## `content/lexicon/<lang>.json`

Shared lesson lexicon (the app's offline dictionary for prepared content).
Keys are dictionary forms.

Normalised `pos` values: `noun`, `verb`, `adjective`, `adverb`, `pronoun`,
`particle`, `conjunction`, `auxiliary`, `interjection`, `determiner`,
`preposition`, `numeral`, `classifier`, `phrase`, `expression`, `prefix`, `suffix`.

- **ja** — key = kuromoji `basic_form` (e.g. `忙しい`, `見える`, `する`)
  `{ "reading": "いそがしい", "pos": "adjective", "vi": "bận", "en": "busy", "jlpt": "N5" }`
- **en** — key = lowercase lemma; multi-word phrases allowed (`"take part in"`)
  `{ "pos": "noun", "vi": "thành tựu", "ja": "達成", "cefr": "B1", "forms": ["achievements"] }`
  `forms` lists irregular inflections that appear in lessons (`ran`, `children`, `better`…).
- **vi** — key = lowercase word, multi-syllable compounds preferred (`"cảm ơn"`)
  `{ "pos": "phrase", "en": "thank you", "ja": "ありがとう" }`

#!/usr/bin/env python3
"""
Round-trip QA for synthesized lesson audio: transcribe every sentence clip with
faster-whisper and compare it to the lesson text. Flags sentences where the TTS
engine skipped, repeated or garbled words.

Usage: python qa_audio.py public/lessons/<id>.json [...]   (run from repo root)
"""
import difflib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata

from faster_whisper import WhisperModel

THRESHOLD = 0.85


def norm(text, lang):
    t = unicodedata.normalize("NFC", text.lower())
    t = re.sub(r"[^\w\s]", "", t)
    return re.sub(r"\s+", "" if lang == "ja" else " ", t).strip()


def main():
    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    failures = 0
    for path in sys.argv[1:]:
        lesson = json.load(open(path, encoding="utf-8"))
        lang = lesson["targetLanguage"]
        media = "public/" + lesson["media"]["url"]
        print(f"• {lesson['id']}")
        for s in lesson["sentences"]:
            with tempfile.NamedTemporaryFile(suffix=".wav") as clip:
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-ss", str(max(0, s["start"] - 0.05)), "-to", str(s["end"] + 0.1),
                     "-i", media, "-ar", "16000", "-ac", "1", clip.name],
                    check=True,
                )
                segs, _ = model.transcribe(clip.name, language=lang, vad_filter=False, beam_size=5)
                heard = "".join(x.text for x in segs)
            ratio = difflib.SequenceMatcher(None, norm(s["text"], lang), norm(heard, lang)).ratio()
            flag = "OK " if ratio >= THRESHOLD else "CHK"
            failures += ratio < THRESHOLD
            print(f"  {flag} {ratio:.2f}  #{s['index'] + 1} {s['text']}" + ("" if ratio >= THRESHOLD else f"\n            heard: {heard.strip()}"))
    print(f"\n{failures} sentence(s) to check")


if __name__ == "__main__":
    main()

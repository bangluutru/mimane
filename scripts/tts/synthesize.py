#!/usr/bin/env python3
"""
Batch neural TTS for prepared lessons (called by scripts/build-lessons.ts).

Engines (from the ai-workforce toolchain):
  edge    Microsoft Edge neural voices via the `edge-tts` package (online)
  vieneu  VieNeu-TTS v3 Turbo, Vietnamese 48 kHz (offline)

Usage: python synthesize.py jobs.json
  jobs.json = {"engine": "edge" | "vieneu", "items": [{"text", "voice", "out"}]}
Writes one audio file per item (edge: mp3, vieneu: wav) and prints a JSON summary.
"""
import asyncio
import json
import sys


def run_edge(items):
    import edge_tts

    async def one(item):
        for attempt in range(3):
            try:
                await edge_tts.Communicate(item["text"], item["voice"]).save(item["out"])
                return
            except Exception as e:  # transient network errors
                if attempt == 2:
                    raise e
                await asyncio.sleep(1.5 * (attempt + 1))

    async def main():
        sem = asyncio.Semaphore(4)

        async def guarded(item):
            async with sem:
                await one(item)

        await asyncio.gather(*(guarded(i) for i in items))

    asyncio.run(main())


def similarity(a, b):
    import difflib
    import re
    import unicodedata

    def norm(t):
        t = unicodedata.normalize("NFC", t.lower())
        return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", t)).strip()

    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def run_vieneu(items, candidates=3, good_enough=0.97):
    """
    VieNeu sampling is stochastic and occasionally mispronounces a syllable
    (e.g. "Phở" → "vở"), which is unacceptable for pronunciation practice.
    Best-of-N: synthesize up to N takes, transcribe each with Whisper, keep the
    take whose transcript matches the text best.
    """
    import numpy as np
    import soundfile as sf
    from vieneu import Vieneu

    tts = Vieneu()
    try:
        from faster_whisper import WhisperModel

        asr = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    except Exception:
        asr = None  # no verifier available: single take

    for item in items:
        best, best_score = None, -1.0
        for _ in range(candidates if asr else 1):
            # Slightly lower temperature than the default: steadier prosody for learners.
            audio = tts.infer(item["text"], voice=item["voice"], temperature=0.6)
            if asr is None:
                best = audio
                break
            pcm = np.interp(np.arange(0, len(audio), 3), np.arange(len(audio)), audio).astype(np.float32)  # 48k → 16k
            heard = "".join(s.text for s in asr.transcribe(pcm, language="vi", beam_size=5)[0])
            score = similarity(item["text"], heard)
            if score > best_score:
                best, best_score = audio, score
            if score >= good_enough:
                break
        if asr:
            print(f"  {best_score:.2f}  {item['text']}", file=sys.stderr)
        sf.write(item["out"], best, 48000)


def main():
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    items = jobs["items"]
    if jobs["engine"] == "edge":
        run_edge(items)
    elif jobs["engine"] == "vieneu":
        run_vieneu(items)
    else:
        raise SystemExit(f"unknown engine {jobs['engine']}")
    print(json.dumps({"ok": True, "count": len(items)}))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Mimane local transcriber — faster-whisper (CTranslate2 Whisper) behind a tiny
HTTP API, bound to 127.0.0.1 only. The web app calls it from the Import page.

  GET  /health                     → {ok, models, default_model, ytdlp}
  POST /transcribe                 multipart: file, language?, model?
                                   json:      {url, language?, model?}   (YouTube, via yt-dlp)
                                   → {job}
  GET  /jobs/<id>                  → {status, progress, stage, result?, error?}

Audio never leaves this machine. Models are downloaded once from Hugging Face
into the standard cache (~/.cache/huggingface).

Run:  npm run transcriber        (or: tools/py.sh tools/transcriber/server.py --port 8778)
"""
import argparse
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from urllib.parse import urlparse

from flask import Flask, jsonify, request
from flask_cors import CORS

MODELS = {
    "accurate": "large-v3-turbo",  # best multilingual quality (ja / vi / en)
    "fast": "small",
}
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtube-nocookie.com"}
MAX_UPLOAD = 1024 * 1024 * 1024  # 1 GB

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD
# Only pages served from this machine may call the API.
CORS(app, origins=[r"http://localhost(:\d+)?", r"http://127\.0\.0\.1(:\d+)?", r"https?://.*\.localhost(:\d+)?"])

_models = {}
_model_lock = threading.Lock()
jobs = {}


def get_model(name):
    from faster_whisper import WhisperModel

    with _model_lock:
        if name not in _models:
            _models[name] = WhisperModel(name, device="cpu", compute_type="int8")
        return _models[name]


def is_youtube(url):
    try:
        u = urlparse(url)
        return u.scheme in ("http", "https") and u.hostname in YOUTUBE_HOSTS
    except Exception:
        return False


def download_youtube_audio(url, workdir):
    out = os.path.join(workdir, "audio.%(ext)s")
    subprocess.run(
        ["yt-dlp", "--no-playlist", "-f", "bestaudio/best", "-o", out, "--quiet", "--no-warnings", url],
        check=True, timeout=900,
    )
    files = [f for f in os.listdir(workdir) if f.startswith("audio.")]
    if not files:
        raise RuntimeError("yt-dlp produced no audio")
    return os.path.join(workdir, files[0])


def run_job(job_id, audio_path, language, model_key, url, workdir):
    job = jobs[job_id]
    try:
        if url:
            job.update(stage="downloading", progress=0.02)
            audio_path = download_youtube_audio(url, workdir)
        job.update(stage="loading-model", progress=0.05)
        model_name = MODELS.get(model_key, MODELS["accurate"])
        model = get_model(model_name)
        job.update(stage="transcribing", progress=0.08)
        segments, info = model.transcribe(
            audio_path,
            language=language or None,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 400},
            word_timestamps=True,
            beam_size=5,
            condition_on_previous_text=False,  # fewer hallucinated repeats on long media
        )
        out = []
        for s in segments:
            out.append({
                "start": round(s.start, 3),
                "end": round(s.end, 3),
                "text": s.text.strip(),
                "words": [{"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word, "p": round(w.probability, 3)} for w in (s.words or [])],
            })
            if info.duration:
                job["progress"] = min(0.99, 0.08 + 0.92 * s.end / info.duration)
        job.update(
            status="done", stage="done", progress=1.0,
            result={"language": info.language, "duration": info.duration, "model": model_name, "segments": out},
        )
    except Exception as e:  # report instead of crashing the worker thread
        job.update(status="error", error=str(e))
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
        job["finished_at"] = time.time()


@app.get("/health")
def health():
    return jsonify(ok=True, engine="faster-whisper", models=MODELS, default_model="accurate", ytdlp=bool(shutil.which("yt-dlp")))


@app.post("/transcribe")
def transcribe():
    workdir = tempfile.mkdtemp(prefix="mimane-asr-")
    url = None
    if request.is_json:
        body = request.get_json(silent=True) or {}
        url, language, model = body.get("url"), body.get("language"), body.get("model", "accurate")
        if not url or not is_youtube(url):
            shutil.rmtree(workdir, ignore_errors=True)
            return jsonify(error="Only YouTube URLs are supported"), 400
        if not shutil.which("yt-dlp"):
            shutil.rmtree(workdir, ignore_errors=True)
            return jsonify(error="yt-dlp is not installed (brew install yt-dlp)"), 400
        audio_path = None
    else:
        f = request.files.get("file")
        if not f:
            shutil.rmtree(workdir, ignore_errors=True)
            return jsonify(error="missing file"), 400
        language, model = request.form.get("language"), request.form.get("model", "accurate")
        audio_path = os.path.join(workdir, "upload" + os.path.splitext(f.filename or "")[1])
        f.save(audio_path)

    job_id = uuid.uuid4().hex[:12]
    jobs[job_id] = {"status": "running", "stage": "queued", "progress": 0.0, "created_at": time.time()}
    threading.Thread(target=run_job, args=(job_id, audio_path, language, model, url, workdir), daemon=True).start()
    # forget finished jobs after an hour
    for k in [k for k, j in jobs.items() if time.time() - j.get("finished_at", time.time()) > 3600]:
        jobs.pop(k, None)
    return jsonify(job=job_id)


@app.get("/jobs/<job_id>")
def job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify(error="unknown job"), 404
    return jsonify({k: v for k, v in job.items() if k not in ("created_at", "finished_at")})


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8778)
    p.add_argument("--preload", action="store_true", help="load the accurate model at startup")
    a = p.parse_args()
    if a.preload:
        get_model(MODELS["accurate"])
    print(f"Mimane transcriber on http://127.0.0.1:{a.port}  (faster-whisper; audio stays on this machine)")
    app.run(host="127.0.0.1", port=a.port, threaded=True)

"""
Backend FastAPI — Transcrição + Downloads + Pastas
"""

import asyncio, json, os, queue, shutil, subprocess, tempfile, threading, uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_FILE  = "results.json"
FOLDERS_FILE  = "folders.json"
DOWNLOADS_DIR = Path("downloads")
for _p in ["instagram", "youtube", "tiktok", "spotify"]:
    (DOWNLOADS_DIR / _p).mkdir(parents=True, exist_ok=True)

_jobs: dict[str, dict] = {}

# ─── Persistence ──────────────────────────────────────────────────────────────

def _load(path):
    try:
        with open(path, encoding="utf-8") as f: return json.load(f)
    except Exception: return {}

def _save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_results():  return _load(RESULTS_FILE)
def save_results(d): _save(RESULTS_FILE, d)
def load_folders():  return _load(FOLDERS_FILE)
def save_folders(d): _save(FOLDERS_FILE, d)

# ─── SSE helper ───────────────────────────────────────────────────────────────

def _sse_stream(job_id: str):
    if job_id not in _jobs:
        async def _empty():
            yield 'data: {"type":"error","error":"job not found"}\n\n'
        return StreamingResponse(_empty(), media_type="text/event-stream")

    eq = _jobs[job_id]["q"]
    loop = asyncio.get_event_loop()

    async def generate():
        while True:
            try:
                event = await loop.run_in_executor(None, lambda: eq.get(timeout=60))
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                if event.get("type") == "finished": break
            except Exception:
                yield 'data: {"type":"ping"}\n\n'

    return StreamingResponse(generate(), media_type="text/event-stream")

# ─── Results ──────────────────────────────────────────────────────────────────

@app.get("/api/results")
def get_results(): return load_results()

@app.delete("/api/results")
def reset_results():
    save_results({})
    return {"ok": True}

@app.delete("/api/results/{url:path}")
def delete_result(url: str):
    """Remove uma transcrição individual do results.json."""
    results = load_results()
    if url not in results:
        raise HTTPException(status_code=404, detail="Resultado não encontrado")
    del results[url]
    save_results(results)
    return {"ok": True}

# ─── Folders ──────────────────────────────────────────────────────────────────

@app.get("/api/folders")
def get_folders(): return load_folders()

class FolderCreate(BaseModel):
    name: str
    color: str = "violet"

@app.post("/api/folders")
def create_folder(body: FolderCreate):
    folders = load_folders()
    fid = str(uuid.uuid4())
    folders[fid] = {"id": fid, "name": body.name, "color": body.color,
                    "created_at": datetime.utcnow().isoformat()}
    save_folders(folders)
    return folders[fid]

class FolderUpdate(BaseModel):
    name: str

@app.put("/api/folders/{fid}")
def rename_folder(fid: str, body: FolderUpdate):
    folders = load_folders()
    if fid not in folders: return {"error": "not found"}
    folders[fid]["name"] = body.name
    save_folders(folders)
    return folders[fid]

@app.delete("/api/folders/{fid}")
def delete_folder(fid: str):
    folders = load_folders()
    folders.pop(fid, None)
    save_folders(folders)
    results = load_results()
    for url in results:
        if results[url].get("folder_id") == fid:
            results[url]["folder_id"] = None
    save_results(results)
    return {"ok": True}

# ─── Transcription ────────────────────────────────────────────────────────────

class TranscribeRequest(BaseModel):
    urls: list[str]
    model: str = "small"
    folder_id: str | None = None

@app.post("/api/start")
def start_transcription(body: TranscribeRequest):
    job_id = str(uuid.uuid4())
    eq: queue.Queue = queue.Queue()
    _jobs[job_id] = {"status": "running", "q": eq}
    threading.Thread(
        target=_worker_transcribe,
        args=(body.urls, body.model, body.folder_id, eq),
        daemon=True,
    ).start()
    return {"job_id": job_id}

@app.get("/api/stream/{job_id}")
async def stream_transcription(job_id: str):
    return _sse_stream(job_id)

def _worker_transcribe(urls, model_name, folder_id, eq):
    import whisper, yt_dlp as ytdl

    def emit(e): eq.put(e)

    emit({"type": "loading_model"})
    model = whisper.load_model(model_name)
    emit({"type": "model_ready"})

    results = load_results()
    for i, url in enumerate(urls):
        emit({"type": "item_start", "url": url, "index": i, "total": len(urls)})
        with tempfile.TemporaryDirectory() as tmp:
            emit({"type": "downloading", "url": url})
            opts = {
                "format": "bestaudio/best",
                "outtmpl": os.path.join(tmp, "%(id)s.%(ext)s"),
                "postprocessors": [{"key": "FFmpegExtractAudio",
                                    "preferredcodec": "mp3", "preferredquality": "128"}],
                "quiet": True, "no_warnings": True,
            }
            try:
                with ytdl.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    vid = info.get("id", "audio")
                    audio = os.path.join(tmp, f"{vid}.mp3")
                    if not os.path.exists(audio):
                        for f in Path(tmp).glob(f"{vid}.*"): audio = str(f); break
                    title = info.get("title") or url[:60]
                    thumb = info.get("thumbnail")

                emit({"type": "transcribing", "url": url})
                raw = model.transcribe(audio, fp16=False)

                entry = {
                    "text": raw["text"].strip(),
                    "language": raw.get("language", "?"),
                    "title": title, "thumbnail": thumb,
                    "folder_id": folder_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "segments": [{"start": s["start"], "end": s["end"],
                                  "text": s["text"].strip()}
                                 for s in raw.get("segments", [])],
                }
                results[url] = entry
                save_results(results)
                emit({"type": "done", "url": url, "result": entry})
            except Exception as e:
                results[url] = {"error": str(e), "text": None}
                save_results(results)
                emit({"type": "error", "url": url, "error": str(e)})

    emit({"type": "finished"})

# ─── Downloads ────────────────────────────────────────────────────────────────

def _ffmpeg_executable() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError("ffmpeg não encontrado no PATH")
    return path


def _resolve_downloaded_filepath(info: dict, ydl) -> str | None:
    """Retorna o caminho do arquivo final após download e merge do yt-dlp."""
    filepath = info.get("filepath")
    if filepath and os.path.isfile(filepath):
        return filepath
    for entry in info.get("requested_downloads") or []:
        fp = entry.get("filepath")
        if fp and os.path.isfile(fp):
            return fp
    candidate = ydl.prepare_filename(info)
    if os.path.isfile(candidate):
        return candidate
    ext = info.get("ext") or "mp4"
    alt = os.path.splitext(candidate)[0] + f".{ext}"
    return alt if os.path.isfile(alt) else None


def _reencode_mp4_for_premiere(source: Path) -> None:
    """
    Reencoda MP4 para H.264 + AAC CFR — compatível com Adobe Premiere.
    Substitui o arquivo original após sucesso.
    """
    if not source.is_file():
        raise FileNotFoundError(f"Arquivo não encontrado: {source}")

    ffmpeg = _ffmpeg_executable()
    tmp = source.with_name(f"{source.stem}.premiere.tmp{source.suffix}")

    cfr_flags = (["-fps_mode", "cfr"], ["-vsync", "cfr"])
    last_err: str | None = None
    for cfr in cfr_flags:
        cmd = [
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(source),
            "-map", "0:v:0?",
            "-map", "0:a:0?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            *cfr,
            "-c:a", "aac",
            "-ar", "48000",
            "-movflags", "+faststart",
            str(tmp),
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            os.replace(tmp, source)
            return
        except subprocess.CalledProcessError as e:
            last_err = (e.stderr or e.stdout or str(e)).strip()
            if tmp.exists():
                tmp.unlink(missing_ok=True)

    raise RuntimeError(last_err or "Falha ao reencodar vídeo para Premiere")


class DownloadRequest(BaseModel):
    urls: list[str]
    platform: str          # instagram | youtube | tiktok | spotify
    format: str  = "mp4"  # mp4 | mp3
    quality: str = "best"  # best | 1080p | 720p | 480p | 360p

@app.post("/api/download/start")
def start_download(body: DownloadRequest):
    job_id = str(uuid.uuid4())
    eq: queue.Queue = queue.Queue()
    _jobs[job_id] = {"status": "running", "q": eq}
    threading.Thread(
        target=_worker_download,
        args=(body.urls, body.platform, body.format, body.quality, eq),
        daemon=True,
    ).start()
    return {"job_id": job_id}

@app.get("/api/download/stream/{job_id}")
async def stream_download(job_id: str):
    return _sse_stream(job_id)

@app.get("/api/file/{platform}/{filename}")
def serve_file(platform: str, filename: str):
    """Serve um arquivo baixado para o browser."""
    path = DOWNLOADS_DIR / platform / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(
        path=str(path),
        filename=filename,
        media_type="application/octet-stream",
    )

@app.delete("/api/file/{platform}/{filename}")
async def delete_file(platform: str, filename: str):
    """Remove um arquivo baixado do disco."""
    safe_platforms = ["instagram", "youtube", "tiktok", "spotify"]
    if platform not in safe_platforms:
        raise HTTPException(status_code=400, detail="Plataforma inválida")

    filename = os.path.basename(unquote(filename))
    filepath = DOWNLOADS_DIR / platform / filename

    if not filepath.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    try:
        os.remove(filepath)
    except PermissionError:
        raise HTTPException(status_code=409, detail="Arquivo em uso, tente novamente")

    return {"deleted": filename}

@app.get("/api/downloads/{platform}")
def list_downloads(platform: str):
    folder = DOWNLOADS_DIR / platform
    files = []
    for f in sorted(folder.glob("*"), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file():
            files.append({
                "filename": f.name,
                "size": f.stat().st_size,
                "path": str(f),
                "created_at": datetime.utcfromtimestamp(f.stat().st_mtime).isoformat(),
            })
    return files

def _worker_download(urls, platform, fmt, quality, eq):
    import yt_dlp as ytdl

    def emit(e): eq.put(e)

    out_dir = str(DOWNLOADS_DIR / platform)

    QUALITY_MAP = {
        "best":  "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best",
        "1080p": "bestvideo[height<=1080][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio/best[height<=1080]",
        "720p":  "bestvideo[height<=720][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]",
        "480p":  "bestvideo[height<=480][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=480]",
        "360p":  "bestvideo[height<=360][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=360]",
    }

    for i, url in enumerate(urls):
        emit({"type": "item_start", "url": url, "index": i, "total": len(urls)})
        emit({"type": "downloading", "url": url})

        if fmt == "mp3":
            opts = {
                "format": "bestaudio/best",
                "outtmpl": os.path.join(out_dir, "%(title)s.%(ext)s"),
                "postprocessors": [{"key": "FFmpegExtractAudio",
                                    "preferredcodec": "mp3", "preferredquality": "192"}],
                "quiet": True, "no_warnings": True,
            }
        else:
            opts = {
                "format": QUALITY_MAP.get(quality, QUALITY_MAP["best"]),
                "outtmpl": os.path.join(out_dir, "%(title)s.%(ext)s"),
                "merge_output_format": "mp4",
                "quiet": True, "no_warnings": True,
            }

        try:
            with ytdl.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title", url[:60])
                if fmt == "mp4":
                    filepath = _resolve_downloaded_filepath(info, ydl)
                    if not filepath:
                        raise RuntimeError("Arquivo de vídeo não encontrado após o download")
                    _reencode_mp4_for_premiere(Path(filepath))
                emit({"type": "done", "url": url, "title": title,
                      "save_dir": out_dir})
        except Exception as e:
            emit({"type": "error", "url": url, "error": str(e)})

    emit({"type": "finished"})

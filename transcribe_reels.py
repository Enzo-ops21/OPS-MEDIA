"""
Reel Transcriber — baixa Reels do Instagram e transcreve com Whisper local.

Uso:
    python transcribe_reels.py                  # lê links.txt, salva results.json
    python transcribe_reels.py --links meus.txt --output saida.json --model medium
"""

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Dependências opcionais — checadas na inicialização
# ---------------------------------------------------------------------------

def _require(package: str, import_name: str | None = None):
    import importlib
    name = import_name or package
    try:
        return importlib.import_module(name)
    except ImportError:
        print(f"[ERRO] Pacote '{package}' não encontrado. Instale com:\n"
              f"       pip install {package}")
        sys.exit(1)


def check_ffmpeg():
    import shutil
    if not shutil.which("ffmpeg"):
        print("[ERRO] ffmpeg não encontrado no PATH.\n"
              "       Baixe em https://ffmpeg.org/download.html e adicione ao PATH.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download_audio(url: str, output_dir: str, cookies_file: str | None = None) -> str | None:
    """Baixa o áudio do Reel e retorna o caminho do arquivo. Retorna None se falhar."""
    yt_dlp = _require("yt-dlp", "yt_dlp")
    import yt_dlp as ytdl

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(output_dir, "%(id)s.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "128",
        }],
        "quiet": True,
        "no_warnings": True,
    }
    if cookies_file:
        ydl_opts["cookiefile"] = cookies_file

    try:
        with ytdl.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_id = info.get("id", "audio")
            audio_path = os.path.join(output_dir, f"{video_id}.mp3")
            if os.path.exists(audio_path):
                return audio_path
            # yt-dlp às vezes usa extensões diferentes
            for f in Path(output_dir).glob(f"{video_id}.*"):
                return str(f)
    except Exception as e:
        print(f"  [DOWNLOAD FALHOU] {e}")
        return None


# ---------------------------------------------------------------------------
# Transcrição
# ---------------------------------------------------------------------------

def transcribe_audio(audio_path: str, model_name: str, whisper_model) -> dict:
    """Transcreve o arquivo de áudio e retorna o resultado."""
    result = whisper_model.transcribe(audio_path, fp16=False)
    return {
        "text": result["text"].strip(),
        "language": result.get("language", "unknown"),
        "segments": [
            {"start": s["start"], "end": s["end"], "text": s["text"].strip()}
            for s in result.get("segments", [])
        ],
    }


# ---------------------------------------------------------------------------
# Persistência de resultados (permite retomar se interrompido)
# ---------------------------------------------------------------------------

def load_results(output_file: str) -> dict:
    if os.path.exists(output_file):
        with open(output_file, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_results(results: dict, output_file: str):
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Transcreve Reels do Instagram com Whisper local.")
    parser.add_argument("--links",   default="links.txt",   help="Arquivo com uma URL por linha")
    parser.add_argument("--output",  default="results.json", help="Arquivo JSON de saída")
    parser.add_argument("--model",   default="small",
                        choices=["tiny", "base", "small", "medium", "large"],
                        help="Modelo Whisper (small é boa relação velocidade/qualidade)")
    parser.add_argument("--cookies", default=None, help="Arquivo de cookies para conteúdo privado")
    args = parser.parse_args()

    # --- Verificações iniciais ---
    check_ffmpeg()
    _require("yt-dlp", "yt_dlp")
    whisper = _require("openai-whisper", "whisper")

    if not os.path.exists(args.links):
        print(f"[ERRO] Arquivo de links não encontrado: {args.links}")
        print("       Crie um arquivo 'links.txt' com uma URL do Instagram por linha.")
        sys.exit(1)

    with open(args.links, encoding="utf-8") as f:
        urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    if not urls:
        print("[ERRO] Nenhuma URL encontrada no arquivo de links.")
        sys.exit(1)

    # --- Carrega modelo Whisper ---
    print(f"\nCarregando modelo Whisper '{args.model}' (pode demorar na primeira vez)...")
    model = whisper.load_model(args.model)

    # --- Carrega resultados existentes (retomada) ---
    results = load_results(args.output)
    pending = [u for u in urls if u not in results]

    print(f"\n{len(urls)} URLs no arquivo | {len(results)} já processadas | {len(pending)} pendentes\n")

    if not pending:
        print("Nada a fazer — todas as URLs já foram transcritas.")
        return

    # --- Processamento ---
    for i, url in enumerate(pending, 1):
        print(f"[{i}/{len(pending)}] {url}")

        with tempfile.TemporaryDirectory() as tmp:
            # Download
            print("  → Baixando áudio...")
            t0 = time.time()
            audio = download_audio(url, tmp, args.cookies)

            if not audio:
                results[url] = {"error": "download_failed", "text": None}
                save_results(results, args.output)
                continue

            # Transcrição
            print("  → Transcrevendo...")
            try:
                transcription = transcribe_audio(audio, args.model, model)
                elapsed = time.time() - t0
                preview = transcription["text"][:80].replace("\n", " ")
                print(f"  ✓ [{elapsed:.1f}s] [{transcription['language']}] {preview}{'...' if len(transcription['text']) > 80 else ''}")
                results[url] = transcription
            except Exception as e:
                print(f"  [TRANSCRIÇÃO FALHOU] {e}")
                results[url] = {"error": str(e), "text": None}

        # Salva após cada URL (retomada segura)
        save_results(results, args.output)

    # --- Resumo final ---
    ok = sum(1 for v in results.values() if v.get("text"))
    fail = sum(1 for v in results.values() if v.get("error"))
    print(f"\n{'='*50}")
    print(f"Concluído: {ok} transcrições | {fail} erros")
    print(f"Resultados salvos em: {args.output}")


if __name__ == "__main__":
    main()

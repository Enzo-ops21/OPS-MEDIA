# Setup — Reel Transcriber

## 1. Instale o Python

Baixe em https://www.python.org/downloads/ (versão 3.10 ou superior).

**IMPORTANTE:** marque a opção "Add Python to PATH" durante a instalação.

---

## 2. Instale o ffmpeg

O jeito mais fácil no Windows é via **winget** (já vem no Windows 11):

```powershell
winget install Gyan.FFmpeg
```

Reinicie o terminal após instalar.

---

## 3. Instale as dependências Python

Abra o PowerShell nesta pasta e execute:

```powershell
pip install yt-dlp openai-whisper
```

> A instalação do `openai-whisper` baixa também o PyTorch (~2 GB na primeira vez).

---

## 4. Adicione seus links

Abra o arquivo `links.txt` e cole os links dos Reels, um por linha:

```
https://www.instagram.com/reel/ABC123xyz/
https://www.instagram.com/reel/DEF456uvw/
```

---

## 5. Execute

```powershell
python transcribe_reels.py
```

O resultado será salvo em `results.json`.

---

## Opções avançadas

| Flag | Padrão | Descrição |
|------|--------|-----------|
| `--links` | `links.txt` | Arquivo com as URLs |
| `--output` | `results.json` | Arquivo de saída JSON |
| `--model` | `small` | Modelo Whisper: `tiny` / `base` / `small` / `medium` / `large` |

Modelos maiores = mais preciso, mais lento:

| Modelo | Tamanho | Qualidade |
|--------|---------|-----------|
| tiny   | 75 MB   | Rápido, menos preciso |
| base   | 142 MB  | Boa para testes |
| small  | 483 MB  | **Recomendado** — bom equilíbrio |
| medium | 1.5 GB  | Melhor qualidade |
| large  | 3 GB    | Máxima qualidade |

Exemplo com modelo medium:

```powershell
python transcribe_reels.py --model medium
```

---

## Formato do results.json

```json
{
  "https://www.instagram.com/reel/ABC123xyz/": {
    "text": "Transcrição completa do vídeo aqui...",
    "language": "pt",
    "segments": [
      { "start": 0.0, "end": 3.5, "text": "Primeira frase" },
      { "start": 3.5, "end": 7.2, "text": "Segunda frase" }
    ]
  }
}
```

## Retomada automática

Se o script for interrompido, basta rodar novamente — ele pula as URLs já processadas.

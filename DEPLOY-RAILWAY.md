# Deploy da API no Railway

A interface na **Vercel** só funciona depois que a **API** estiver no ar no Railway.

## Ordem correta

1. Railway (API) → copiar URL pública  
2. Vercel → variável `VITE_API_URL` = essa URL → Redeploy  
3. Testar o site

---

## Passo 1 — Conta e projeto

1. Acesse [railway.app](https://railway.app) e entre com GitHub.  
2. **New Project** → **Deploy from GitHub repo**.  
3. Escolha o repositório **OPS-MEDIA** (`Enzo-ops21/OPS-MEDIA`).

O Railway vai detectar o `Dockerfile` na raiz do repo.

---

## Passo 2 — Ajustes no serviço

No serviço criado, abra **Settings**:

| Campo | Valor |
|--------|--------|
| **Root Directory** | *(vazio — raiz do repo)* |
| **Builder** | Dockerfile |

Em **Networking** → **Generate Domain** (ex.: `ops-media-production.up.railway.app`).

Copie essa URL — será o valor de `VITE_API_URL` na Vercel (sem barra no final).

---

## Passo 3 — Recursos (importante)

Esta API usa **Whisper** e **PyTorch** (~2 GB na instalação) e **ffmpeg**.

| Recurso | Mínimo recomendado |
|---------|-------------------|
| **RAM** | 4 GB ou mais |
| **Disco** | 5 GB+ (modelo Whisper + downloads) |

No plano gratuito/hobby o build pode falhar ou ficar lento. Se o deploy falhar por memória/timeout:

- Aumente o plano ou o tamanho do serviço no Railway, ou  
- Use um VPS (Hetzner, etc.) com o mesmo `Dockerfile`.

---

## Passo 4 — Volume (opcional, recomendado)

Para não perder transcrições e downloads a cada redeploy:

1. No serviço → **Volumes** → **Add Volume**.  
2. Mount path: `/app`  
3. Os arquivos `results.json`, `folders.json` e a pasta `downloads/` ficam persistentes.

---

## Passo 5 — Variáveis de ambiente (Railway)

Geralmente nenhuma é obrigatória. O Railway define `PORT` automaticamente.

Opcional:

| Variável | Uso |
|----------|-----|
| `PORT` | Já injetado pelo Railway |

---

## Passo 6 — Conferir se a API subiu

Abra no navegador:

```
https://SUA-URL.railway.app/api/folders
```

Deve retornar JSON (`{}` ou lista de pastas), não erro 502.

---

## Passo 7 — Ligar na Vercel (Opção B)

1. Vercel → projeto **OPS-MEDIA** → **Settings** → **Environment Variables**.  
2. Adicione:

   ```
   VITE_API_URL = https://SUA-URL.railway.app
   ```

3. **Redeploy** o frontend.

---

## Resumo visual

```
Usuário → Vercel (React)
              ↓  VITE_API_URL
         Railway (FastAPI + Whisper + yt-dlp + ffmpeg)
```

---

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| Build falha no `pip install` | Falta de RAM no build; plano pequeno |
| 502 Bad Gateway | API ainda iniciando ou crash (ver **Logs**) |
| Site Vercel abre mas API não responde | `VITE_API_URL` vazio ou errado; falta Redeploy |
| Transcrição muito lenta | Normal no CPU; modelo `small` já é pesado |

---

## Desenvolvimento local (sem Railway)

Na sua máquina:

```powershell
pip install -r requirements.txt
# ffmpeg no PATH
python -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Frontend: `npm run dev` (proxy `/api` → `:8000`).

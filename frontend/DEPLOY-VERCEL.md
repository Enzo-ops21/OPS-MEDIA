# Deploy na Vercel — Opção B (`VITE_API_URL`)

O frontend chama a API **diretamente** no Railway. Não usa rewrite de `/api` no `vercel.json`.

## 1. Configuração do projeto na Vercel

| Campo | Valor |
|--------|--------|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

## 2. Variável obrigatória (Opção B)

**Settings → Environment Variables → Add**

| Nome | Valor | Ambientes |
|------|--------|-----------|
| `VITE_API_URL` | `https://SEU-SERVICO.up.railway.app` | Production, Preview, Development |

Regras:

- Use a URL **pública** do Railway (copie em Railway → Service → Settings → Networking → Public domain).
- **Sem** barra no final.
- **Sem** `/api` no final — o app monta `/api/...` automaticamente.

Exemplo:

```
VITE_API_URL=https://ops-media-production.up.railway.app
```

## 3. Redeploy

Depois de salvar a variável: **Deployments → ⋯ → Redeploy** (obrigatório — o Vite embute `VITE_*` no build).

## 4. API no Railway

O backend (`api.py`) deve estar no ar com ffmpeg. CORS no `api.py` já permite qualquer origem (`*`), então o domínio `.vercel.app` funciona.

## 5. Desenvolvimento local

Não defina `VITE_API_URL` no `.env.local` (ou deixe vazio). O proxy em `vite.config.ts` encaminha `/api` para `http://127.0.0.1:8000`.

```powershell
npm run dev
```

## 6. Conferir se funcionou

Abra o site na Vercel → F12 → Network. As requisições devem ir para `https://....railway.app/api/...`, não para `seu-app.vercel.app/api/...`.

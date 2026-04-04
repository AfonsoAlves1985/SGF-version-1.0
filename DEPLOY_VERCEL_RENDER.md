# Deploy Online (Vercel + Render)

Este projeto usa frontend React (Vite) + backend Express/tRPC.
Para produção, a forma mais estável é:

- Frontend no Vercel
- Backend no Render
- Vercel faz proxy de `/api/*` para o backend

## 1) Publicar backend no Render

1. Acesse Render e conecte o repositório `SGF-version-1.0`.
2. Crie um novo serviço web a partir do `render.yaml` (Blueprint).
3. Configure variáveis de ambiente no serviço:
   - `DATABASE_URL` = string de conexão PostgreSQL (Supabase)
   - `JWT_SECRET` = segredo forte para assinatura do token
   - `NODE_ENV` já vem como `production`
4. Aguarde deploy e copie a URL final, por exemplo:
   - `https://sgf-backend.onrender.com`

Health check do backend:

- `GET https://SEU_BACKEND/healthz` deve retornar `{ "ok": true }`.

## 2) Configurar frontend no Vercel

1. Importe o mesmo repositório no Vercel.
2. Build settings:
   - Framework preset: `Vite`
   - Install: `pnpm install`
   - Build command: `pnpm build`
   - Output directory: `dist/public`
3. Edite `vercel.json` e troque:
   - `https://REPLACE_WITH_BACKEND_URL`
   - pela URL real do backend no Render (sem barra final)

Exemplo:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://sgf-backend.onrender.com/api/:path*"
    },
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

4. Faça commit/push dessa URL no `vercel.json`.
5. Re-deploy no Vercel.

## 3) Testar login e API online

1. Acesse o domínio do Vercel.
2. Faça login com:
   - usuário: `admin`
   - senha: `admin123`
3. Abra DevTools > Network e confirme:
   - chamadas para `/api/trpc/*` retornando `200`
   - chamadas protegidas retornando erro `401` se sem token

## 4) Segurança mínima recomendada

- Troque `JWT_SECRET` por valor único e forte em produção.
- Restrinja acesso ao banco (somente backend).
- Não exponha `DATABASE_URL` no Vercel.
- Se for usar domínio próprio, habilite HTTPS e forçar redirect.

## 5) Problemas comuns

- **Tela carrega, mas API falha**: `vercel.json` ainda com URL placeholder.
- **401 após login**: conferir se há `Authorization: Bearer ...` nas requests.
- **500 no backend**: validar `DATABASE_URL`/`JWT_SECRET` no Render.
- **Página branca em rota direta**: garantir rewrite para `/index.html` no `vercel.json`.

## 6) Keep-alive para plano free do Render

No plano free, o Render entra em sleep por inatividade. Este repositório inclui uma rotina automática em:

- `.github/workflows/keep-render-alive.yml`

Ela faz `GET` no endpoint de saúde (`/healthz`) a cada 10 minutos.

Importante:

- Essa rotina **não altera dados** e **não grava no banco**.
- Apenas verifica disponibilidade do serviço.

Como ativar:

1. Garanta que GitHub Actions está habilitado no repositório.
2. O workflow já possui fallback padrão para:
   - `https://sgf-online.onrender.com/healthz`
3. Opcional (sobrescrever URL): em **Settings > Secrets and variables > Actions**,
   configure uma das opções:
   - Secret `RENDER_HEALTHCHECK_URL` com valor completo.
   - ou Variable `RENDER_APP_URL` com a base.
4. Execute manualmente em **Actions > Keep Render Alive > Run workflow** para validar.

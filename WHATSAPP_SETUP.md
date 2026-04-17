# Configuração WhatsApp - Evolution API

## Opção A: Local (testar no seu PC)

### Passo 1 — Iniciar tudo
```bat
# Dê dois cliques em:
iniciar.bat
```
Isso sobe o Docker (Evolution API) e inicia o app em `http://localhost:3000`.

### Passo 2 — Conectar WhatsApp
1. Acesse `http://localhost:3000/whatsapp`
2. Clique **Gerar QR Code**
3. Escaneie com o celular (WhatsApp → Aparelhos conectados)
4. Pronto — suas conversas aparecem

> **Limitação local:** A IA Recepcionista não vai funcionar porque a Evolution API (Docker) não consegue enviar webhooks para `localhost:3000`. Para isso, use a Opção B ou C abaixo.

---

## Opção B: Vercel + ngrok (RECOMENDADO para vender)

Esta é a arquitetura ideal para produção:
- **App (Next.js)** → Vercel (URL pública permanente, grátis)
- **Evolution API** → Docker no seu PC, exposto via ngrok

### Passo 1 — Deploy no Vercel

1. Crie conta em vercel.com
2. Instale a CLI: `npm i -g vercel`
3. Na pasta do projeto: `vercel`
4. Anote a URL do deploy (ex: `https://financeiro-psi.vercel.app`)

### Passo 2 — Expor Evolution API com ngrok

1. Baixe ngrok: https://ngrok.com/download
2. Crie conta gratuita e copie seu authtoken
3. Configure: `ngrok config add-authtoken SEU_TOKEN`
4. Suba o Docker local: `docker-compose up -d`
5. Inicie o túnel: `ngrok http 8080`
6. Copie a URL gerada (ex: `https://abc123.ngrok-free.app`)

### Passo 3 — Configurar variáveis no Vercel

No painel do Vercel → Settings → Environment Variables, adicione:

```
NEXT_PUBLIC_SUPABASE_URL        = (mesmo do .env.local)
NEXT_PUBLIC_SUPABASE_ANON_KEY   = (mesmo do .env.local)
NEXT_PUBLIC_APP_URL             = https://financeiro-psi.vercel.app
EVOLUTION_BASE_URL              = https://abc123.ngrok-free.app
EVOLUTION_API_KEY               = 123456
```

Depois: **Redeploy** no Vercel.

### Passo 4 — Configurar IA Recepcionista

1. Acesse seu app no Vercel → Automações
2. Clique em **IA Recepcionista → Configurar**
3. Preencha:
   - **Groq API Key**: obtenha em console.groq.com (grátis)
   - **URL da Evolution API**: `https://abc123.ngrok-free.app`
   - **API Key da Evolution**: `123456`
   - **Nome da Instância**: `user_SEU_USER_ID` (aparece na URL do perfil)
4. Salve

### Passo 5 — Configurar Webhook na Evolution API

1. Acesse a Evolution API Manager: `http://localhost:8080/manager`
2. Login com apikey `123456`
3. Encontre sua instância → Webhook
4. Cole a URL que aparece na página de Automações do seu app
5. Ative o evento **MESSAGES_UPSERT**
6. Salve

---

## Opção C: ngrok sem Vercel (mais simples para teste)

Se não quiser usar o Vercel ainda:

1. Suba o Docker: `docker-compose up -d`
2. Abra **2 terminais**:
   - Terminal 1: `ngrok http 3000` → pega a URL (ex: `https://xyz.ngrok-free.app`)
   - Terminal 2: `ngrok http 8080` → pega a URL da Evolution API
3. Atualize `.env.local`:
   ```
   NEXT_PUBLIC_APP_URL=https://xyz.ngrok-free.app
   EVOLUTION_BASE_URL=https://outra-url.ngrok-free.app
   ```
4. Inicie o app: `npm run dev`

---

## Checklist para vender

- [ ] Docker Desktop instalado no PC do cliente
- [ ] `docker-compose up -d` rodando (3 containers: api, postgres, redis)
- [ ] App no Vercel funcionando
- [ ] ngrok expondo porta 8080 (com domínio estático ou sempre reiniciado)
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] WhatsApp conectado via QR Code
- [ ] IA Recepcionista configurada com Groq API Key
- [ ] Webhook configurado na Evolution API

---

## Comandos úteis

```bash
# Ver status dos containers
docker ps

# Ver logs da Evolution API
docker logs evolution-api -f

# Parar tudo
docker-compose down

# Reiniciar
docker-compose restart

# Testar se Evolution está respondendo
curl http://localhost:8080/
```

## Chaves de API (todas gratuitas)

| Serviço | Onde obter | Para que serve |
|---------|-----------|----------------|
| Groq | console.groq.com | IA Recepcionista |
| ngrok | ngrok.com | URL pública para Evolution API |
| Vercel | vercel.com | Hospedar o app |
| Supabase | supabase.com | Banco de dados (já configurado) |

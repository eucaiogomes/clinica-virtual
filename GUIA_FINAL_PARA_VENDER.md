# Guia Final — Financeiro Psi Pronto para Vender

Este documento é o **checklist completo** para colocar o app online e funcionando 100%.

---

## ⚙️ Pré-requisitos (instale UMA VEZ)

- [ ] **Docker Desktop** — https://docker.com/products/docker-desktop
- [ ] **ngrok** — https://ngrok.com/download
- [ ] **Node.js** — https://nodejs.org (18+)
- [ ] **Git** — (já tem)

---

## 🎯 Fase 1: Teste Local (seu PC)

### Passo 1 — Iniciar o ambiente
```bash
cd C:\agente-clinica\financeiro-psi
iniciar.bat
```

**O que acontece:**
- Docker inicia Evolution API em `http://localhost:8080`
- App inicia em `http://localhost:3000`

### Passo 2 — Conectar WhatsApp
1. Acesse `http://localhost:3000/whatsapp`
2. Clique **Gerar QR Code**
3. Escaneie com o WhatsApp do celular (Aparelhos conectados)
4. Pronto! Suas conversas aparecem

**Resultado esperado:** Consegue ver conversas e enviar mensagens ✓

---

## 🌐 Fase 2: Deploy no Vercel (hospedagem gratuita)

### Passo 1 — Acesse vercel.com/new
- Escolha **"Import Git Repository"**
- Selecione seu repositório `clinica-virtual`
- Clique **Continue**

### Passo 2 — Configure as variáveis
Na tela "Environment Variables", adicione (copie de `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL = https://fvopjbtlmjiodwludxfb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_gnuLasSsWPEeJppij530mA_qnx8Q-Gd
NEXT_PUBLIC_APP_URL = (deixa em branco por enquanto)
EVOLUTION_BASE_URL = (deixa em branco por enquanto)
EVOLUTION_API_KEY = 123456
```

### Passo 3 — Deploy
- Clique **Deploy**
- Aguarde 1-2 minutos
- Copie a URL gerada (ex: `https://clinica-virtual.vercel.app`)

### Passo 4 — Atualizar variáveis
1. Volte em **Settings → Environment Variables**
2. Atualize `NEXT_PUBLIC_APP_URL = https://clinica-virtual.vercel.app` (sua URL)
3. Volte em **Deployments** e clique **Redeploy** no último deploy

**Resultado esperado:** App acessível online ✓

---

## 🔗 Fase 3: Expor Evolution API (ngrok)

### Passo 1 — Criar conta ngrok
1. Acesse https://ngrok.com
2. Crie conta grátis
3. Copie seu **authtoken**

### Passo 2 — Configurar ngrok
```bash
ngrok config add-authtoken SEU_TOKEN_AQUI
```

### Passo 3 — Suba o Docker (se não estiver rodando)
```bash
docker-compose up -d
```

### Passo 4 — Inicie o túnel
```bash
ngrok http 8080
```

**Você verá algo como:**
```
Forwarding https://abc123def456.ngrok-free.app -> localhost:8080
```

**Copie essa URL** — você vai precisar dela no próximo passo.

---

## 🤖 Fase 4: Configurar IA Recepcionista

### Passo 1 — Obter Groq API Key (IA grátis)
1. Acesse https://console.groq.com
2. Crie conta grátis
3. Vá em **API Keys** → crie uma chave nova
4. Copie a chave (começa com `gsk_`)

### Passo 2 — Configurar no app
1. Acesse seu app Vercel: `https://clinica-virtual.vercel.app`
2. Vá em **Automações** → **IA Recepcionista** → **Configurar**
3. Preencha:
   - **Chave API Groq**: `gsk_...` (copiada acima)
   - **URL da Evolution API**: `https://abc123def456.ngrok-free.app` (do ngrok)
   - **API Key da Evolution**: `123456`
   - **Nome da Instância**: `user_SEU_USER_ID` (vê seu ID na página)
4. Clique **Salvar configuração**

### Passo 3 — Configurar webhook na Evolution API
1. Acesse `http://localhost:8080/manager`
2. Login com apikey: `123456`
3. Clique na sua instância → **Webhook**
4. Na página anterior (Automações), copie a URL do webhook
5. Cole em **URL** do webhook
6. Selecione event: **MESSAGES_UPSERT**
7. Clique **Salvar**

---

## ✅ Checklist Final

Antes de oferecer ao cliente, garanta que TUDO funciona:

- [ ] Docker rodando com `docker ps` mostrando 3 containers
- [ ] App acessível em `https://clinica-virtual.vercel.app`
- [ ] Login funciona (email/senha)
- [ ] WhatsApp conectado via QR (página `/whatsapp`)
- [ ] Consegue ver conversas existentes
- [ ] Consegue enviar mensagem de teste
- [ ] IA Recepcionista configurada
- [ ] Webhook testado: manda mensagem no WhatsApp do celular, bot responde
- [ ] Outras páginas (Pacientes, Sessões, etc) carregam

---

## 🚀 Para o Cliente

Quando vender, o cliente precisa:

1. **Instalar Docker Desktop** (uma única vez)
2. **Ter uma conta GitHub** (para copiar o repo)
3. **Conectar WhatsApp** quando solicitado
4. **Configurar as 3 chaves**:
   - Groq API Key
   - ngrok authtoken
   - Supabase (já vem pronto)

---

## 📋 Comandos Úteis

### Docker
```bash
# Ver status
docker ps

# Ver logs da Evolution API
docker logs evolution-api -f

# Parar tudo
docker-compose down

# Reiniciar
docker-compose restart
```

### Git (se precisar atualizar)
```bash
git add .
git commit -m "mensagem aqui"
git push origin main
```

### Vercel (se precisar redeployar)
- Acesse vercel.com → Seu projeto → **Redeploy**

---

## 🆘 Troubleshooting

| Problema | Solução |
|----------|---------|
| QR Code não aparece | Reinicie: `docker-compose restart` |
| "Erro ao conectar" | Docker não está rodando — `docker-compose up -d` |
| IA não responde | Webhook não configurado ou ngrok caiu — reinicie ngrok |
| App muito lento | Vercel pode estar em sleep — acesse de novo |
| Supabase erro | Chaves no .env.local erradas — copie do painel Supabase |

---

## 💡 Dicas de Venda

1. **Demonstre** o WhatsApp conectado com mensagens reais
2. **Mostre** a IA respondendo automaticamente
3. **Explique** que é hospedado no Vercel (seguro, profissional)
4. **Deixe claro** que o cliente precisa ter Docker instalado
5. **Ofereça suporte** para a primeira configuração

---

**Pronto para vender! 🎉**

Qualquer dúvida, rode este comando para checar:
```bash
docker ps
```

Se falta algum container, rode:
```bash
docker-compose up -d
```

-- ============================================
-- Migration: Central de Automações
-- Execute no SQL Editor do Supabase
-- ============================================

-- Configurações de automação por usuária
CREATE TABLE IF NOT EXISTS automation_settings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Evolution API (também salvo aqui para uso server-side)
  evolution_url       TEXT DEFAULT '',
  evolution_key       TEXT DEFAULT '',
  evolution_instance  TEXT DEFAULT '',

  -- IA Recepcionista
  ai_enabled          BOOLEAN DEFAULT FALSE,
  ai_prompt           TEXT DEFAULT 'Você é Ana, recepcionista virtual de uma psicóloga. Seja acolhedora, breve e profissional. Responda em português brasileiro. Agende sessões coletando: nome, queixa e preferência de horário. Não faça diagnósticos.',
  groq_api_key        TEXT DEFAULT '',

  -- Lembretes automáticos
  reminders_enabled   BOOLEAN DEFAULT FALSE,
  reminder_hours      INTEGER DEFAULT 24,
  reminder_message    TEXT DEFAULT 'Olá {nome}! 💜 Passando para lembrar que temos sessão amanhã. Qualquer dúvida me chama. Até lá!',

  -- Cobrança automática
  payment_enabled     BOOLEAN DEFAULT FALSE,
  pix_key             TEXT DEFAULT '',
  payment_message     TEXT DEFAULT 'Olá {nome}! Seguem os dados para pagamento da nossa sessão (R$ {valor}):\n\nChave Pix: {pix_key}\n\nObrigada! 💜',

  -- Link do Meet automático
  meet_enabled        BOOLEAN DEFAULT FALSE,
  meet_message        TEXT DEFAULT 'Olá {nome}! Nossa sessão será online 🎥\nAcesse: {link}\nEm caso de dúvida, me chame. Até já! 💜',

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_automation_settings" ON automation_settings
  FOR ALL USING (auth.uid() = user_id);

-- Log de atividades das automações
CREATE TABLE IF NOT EXISTS automation_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('ai_response','reminder','payment','meet','manual')),
  phone      TEXT DEFAULT '',
  patient    TEXT DEFAULT '',
  message    TEXT DEFAULT '',
  status     TEXT DEFAULT 'success' CHECK (status IN ('success','error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_automation_logs" ON automation_logs
  FOR ALL USING (auth.uid() = user_id);

-- Index para consultas por data
CREATE INDEX IF NOT EXISTS automation_logs_user_created
  ON automation_logs(user_id, created_at DESC);

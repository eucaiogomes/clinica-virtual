-- ============================================
-- Migration: WhatsApp / Contact Labels
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela: contact_labels (etiquetas para contatos WhatsApp)
CREATE TABLE IF NOT EXISTS contact_labels (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone      TEXT NOT NULL,
  name       TEXT DEFAULT '',
  label      TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_contact_labels" ON contact_labels FOR ALL USING (auth.uid() = user_id);

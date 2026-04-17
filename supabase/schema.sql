-- ============================================
-- Financeiro Psi — Schema Supabase
-- ============================================

-- Tabela: profiles (espelho de auth.users com dados extras)
CREATE TABLE profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Trigger: cria perfil automaticamente ao cadastrar usuária
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================

-- Tabela: patients
CREATE TABLE patients (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: clinics
CREATE TABLE clinics (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: sessions
CREATE TABLE sessions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id     UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id      UUID REFERENCES clinics(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  price          NUMERIC(10,2) NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('particular', 'convenio', 'terceirizado')),
  is_paid        BOOLEAN DEFAULT FALSE,
  payment_method TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: packages
CREATE TABLE packages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id     UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  total_sessions INTEGER NOT NULL,
  used_sessions  INTEGER DEFAULT 0,
  total_price    NUMERIC(10,2) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: expenses
CREATE TABLE expenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: goals
CREATE TABLE goals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('revenue', 'patients', 'sessions')),
  target     NUMERIC(10,2) NOT NULL,
  period     TEXT DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE patients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_patients"  ON patients  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_clinics"   ON clinics   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_sessions"  ON sessions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_packages"  ON packages  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_expenses"  ON expenses  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_goals"     ON goals     FOR ALL USING (auth.uid() = user_id);

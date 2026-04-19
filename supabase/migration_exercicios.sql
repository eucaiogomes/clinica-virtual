-- ============================================================
-- EXERCÍCIOS TERAPÊUTICOS — MIGRAÇÃO
-- Execute no Supabase SQL Editor
-- ============================================================

-- Exercícios criados pelo admin
CREATE TABLE IF NOT EXISTS templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text DEFAULT 'Autoconhecimento',
  duration_minutes int DEFAULT 5,
  result_config jsonb,  -- { low: {title,text,items[]}, mid: {...}, high: {...} }
  created_at timestamptz DEFAULT now()
);

-- Perguntas de cada exercício
CREATE TABLE IF NOT EXISTS template_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES templates(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'multiple_choice',
  question text NOT NULL,
  options jsonb,    -- array de strings para múltipla escolha
  "order" int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Instância do exercício usada por cada profissional
CREATE TABLE IF NOT EXISTS professional_forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES templates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  cta_url text DEFAULT '',
  cta_label text DEFAULT 'Quero garantir minha vaga',
  created_at timestamptz DEFAULT now()
);

-- Respostas dos pacientes
CREATE TABLE IF NOT EXISTS responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_form_id uuid REFERENCES professional_forms(id) ON DELETE CASCADE,
  patient_name text,
  patient_email text,
  score_pct int,
  created_at timestamptz DEFAULT now()
);

-- Respostas individuais por pergunta
CREATE TABLE IF NOT EXISTS response_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE,
  question_id uuid REFERENCES template_questions(id) ON DELETE CASCADE,
  answer text,
  answer_index int,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers ENABLE ROW LEVEL SECURITY;

-- Templates e perguntas: leitura pública
CREATE POLICY "templates_read" ON templates FOR SELECT USING (true);
CREATE POLICY "template_questions_read" ON template_questions FOR SELECT USING (true);

-- Formulários profissionais: leitura pública (para acessar por slug), escrita autenticada
CREATE POLICY "professional_forms_read" ON professional_forms FOR SELECT USING (true);
CREATE POLICY "professional_forms_insert" ON professional_forms FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "professional_forms_update" ON professional_forms FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "professional_forms_delete" ON professional_forms FOR DELETE USING (user_id = auth.uid());

-- Respostas: pacientes inserem (anônimo), profissional lê as suas
CREATE POLICY "responses_insert" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "responses_select" ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_forms
      WHERE professional_forms.id = responses.professional_form_id
      AND professional_forms.user_id = auth.uid()
    )
  );

-- Respostas individuais: pacientes inserem (anônimo), profissional lê as suas
CREATE POLICY "response_answers_insert" ON response_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "response_answers_select" ON response_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses r
      JOIN professional_forms pf ON pf.id = r.professional_form_id
      WHERE r.id = response_answers.response_id
      AND pf.user_id = auth.uid()
    )
  );

-- ============================================================
-- SEED: Templates com perguntas e resultado configurado
-- ============================================================

INSERT INTO templates (id, title, description, category, duration_minutes, result_config) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Você está pronta para encerrar esse ciclo?',
  'Avalie seu nível de prontidão para encerrar ciclos do passado e iniciar uma nova fase da vida.',
  'Ciclos e Encerramento',
  3,
  '{
    "low": {
      "title": "Você carrega ciclos que pedem <em>atenção e cuidado.</em>",
      "text": "Suas respostas mostram que há algo profundo que ainda não foi processado. Isso não é fraqueza — é um convite para olhar para dentro com segurança e apoio. Você merece esse cuidado.",
      "items": [
        {"icon": "🌱", "title": "Ciclos não encerrados", "desc": "Situações do passado ainda influenciam suas escolhas e emoções no presente."},
        {"icon": "🔄", "title": "Padrões que se repetem", "desc": "Há experiências que voltam porque ainda precisam de acolhimento e ressignificação."},
        {"icon": "💛", "title": "Você está pronta para começar", "desc": "O primeiro passo é reconhecer — e você já fez isso ao responder esse teste."}
      ]
    },
    "mid": {
      "title": "Você está <em>no limiar da mudança.</em>",
      "text": "Você já percebe o que precisa transformar — mas ainda sente dificuldade em dar os passos concretos. Isso é muito comum e completamente trabalhável. Você já está no caminho certo.",
      "items": [
        {"icon": "✨", "title": "Consciência em expansão", "desc": "Você já identifica o que precisa mudar. Agora é hora de transformar percepção em ação."},
        {"icon": "🌊", "title": "Resistência natural", "desc": "A mudança assusta — mas você já demonstrou coragem só em fazer esse teste."},
        {"icon": "🌿", "title": "Apoio faz diferença", "desc": "Com suporte profissional e coletivo, esse processo fica muito mais leve e efetivo."}
      ]
    },
    "high": {
      "title": "Você está <em>mais próxima do que imagina.</em>",
      "text": "Suas respostas revelam clareza, coragem e uma prontidão real para virar essa página. Você já fez muito trabalho interno — agora é hora de aprofundar e consolidar essa transformação.",
      "items": [
        {"icon": "🔥", "title": "Alta prontidão para a mudança", "desc": "Você já tem clareza sobre o que precisa encerrar e está pronta para agir."},
        {"icon": "🌟", "title": "Potencial de transformação", "desc": "Com o apoio certo, sua jornada pode avançar de forma profunda e duradoura."},
        {"icon": "🤝", "title": "O grupo é o próximo passo", "desc": "Ambientes coletivos e seguros aceleram processos que sozinha levam muito mais tempo."}
      ]
    }
  }'
),
(
  '22222222-2222-2222-2222-222222222222',
  'Como está sua saúde emocional hoje?',
  'Uma avaliação rápida do seu estado emocional atual e bem-estar psicológico.',
  'Bem-estar Emocional',
  4,
  '{
    "low": {
      "title": "Sua saúde emocional pede <em>cuidado urgente.</em>",
      "text": "Suas respostas indicam que você está carregando um peso emocional significativo. Reconhecer isso é o primeiro e mais corajoso passo. Você não precisa passar por isso sozinha.",
      "items": [
        {"icon": "🌧️", "title": "Esgotamento emocional", "desc": "Seu sistema nervoso está sobrecarregado e precisa de suporte especializado."},
        {"icon": "💙", "title": "Você merece apoio", "desc": "Buscar ajuda não é fraqueza — é o ato mais sábio que você pode fazer agora."},
        {"icon": "🌱", "title": "A recuperação é possível", "desc": "Com o acompanhamento certo, você pode restaurar seu equilíbrio emocional."}
      ]
    },
    "mid": {
      "title": "Sua saúde emocional está <em>em atenção.</em>",
      "text": "Você está indo, mas percebe que algo não está bem. Há sinais que merecem atenção antes que se tornem mais pesados. Esse é o momento ideal para agir.",
      "items": [
        {"icon": "🌤️", "title": "Equilíbrio instável", "desc": "Há dias bons e dias difíceis — e você sente que precisa de mais consistência emocional."},
        {"icon": "🔍", "title": "Autoconhecimento em progresso", "desc": "Você já percebe os padrões — agora é hora de trabalhá-los com suporte adequado."},
        {"icon": "🌿", "title": "Prevenção é cuidado", "desc": "Agir agora evita que pequenas dificuldades se tornem grandes crises."}
      ]
    },
    "high": {
      "title": "Você está com uma <em>base emocional sólida.</em>",
      "text": "Suas respostas mostram que você tem recursos emocionais bem desenvolvidos. Há espaço para aprofundar ainda mais seu autoconhecimento e bem-estar.",
      "items": [
        {"icon": "☀️", "title": "Resiliência desenvolvida", "desc": "Você tem ferramentas para lidar com os desafios da vida de forma saudável."},
        {"icon": "🌺", "title": "Espaço para crescer", "desc": "Mesmo com uma boa base, há sempre profundidade a ser explorada no processo terapêutico."},
        {"icon": "✨", "title": "Manutenção do bem-estar", "desc": "Cuidar da saúde emocional preventivamente é o maior investimento que você pode fazer."}
      ]
    }
  }'
),
(
  '33333333-3333-3333-3333-333333333333',
  'Seus limites e autoestima',
  'Explore como você estabelece limites e percebe seu valor pessoal.',
  'Autoestima e Limites',
  5,
  '{
    "low": {
      "title": "Seus limites e autoestima pedem <em>atenção especial.</em>",
      "text": "Suas respostas revelam que você coloca as necessidades dos outros antes das suas com muita frequência. Aprender a se valorizar é uma jornada — e ela começa com um passo corajoso.",
      "items": [
        {"icon": "🛡️", "title": "Dificuldade com limites", "desc": "Dizer não parece quase impossível — e isso te custa energia e autenticidade."},
        {"icon": "💔", "title": "Autoestima fragilizada", "desc": "A forma como você se vê ainda está muito ligada à aprovação dos outros."},
        {"icon": "🌱", "title": "A transformação é real", "desc": "Com suporte terapêutico, é possível reconstruir uma relação mais gentil consigo mesma."}
      ]
    },
    "mid": {
      "title": "Você está <em>aprendendo a se valorizar.</em>",
      "text": "Você já percebe onde precisa estabelecer limites e reconhece seu valor — mas ainda encontra resistência interna. Você está no caminho e com apoio pode ir muito mais longe.",
      "items": [
        {"icon": "🌱", "title": "Consciência crescente", "desc": "Você já identifica quando seus limites são ultrapassados — e isso é enorme."},
        {"icon": "🧩", "title": "Padrões em transição", "desc": "Velhos hábitos de complacência ainda aparecem, mas você já os reconhece."},
        {"icon": "💪", "title": "Força que cresce", "desc": "Com prática e suporte, estabelecer limites saudáveis se torna natural."}
      ]
    },
    "high": {
      "title": "Você tem uma <em>autoestima em desenvolvimento saudável.</em>",
      "text": "Suas respostas mostram que você tem uma boa relação consigo mesma e consegue se posicionar. Há profundidade a ser explorada para consolidar ainda mais essa conquista.",
      "items": [
        {"icon": "✨", "title": "Limites conscientes", "desc": "Você consegue dizer não e se posicionar — e isso é uma habilidade rara e valiosa."},
        {"icon": "🌟", "title": "Autoestima consolidada", "desc": "Você reconhece seu valor sem precisar de validação constante dos outros."},
        {"icon": "🚀", "title": "Próximo nível", "desc": "O trabalho terapêutico pode aprofundar ainda mais essa base que você já construiu."}
      ]
    }
  }'
);

-- Perguntas do template 1 — Encerrar ciclo
INSERT INTO template_questions (template_id, type, question, options, "order") VALUES
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'Quando você pensa em alguma situação do passado que ainda te pesa, o que sente?',
 '["Tento ignorar, mas ela sempre volta","Fico com raiva ou tristeza, mas não sei o que fazer","Já aceitei, mas ainda me influencia","Consigo olhar para isso com mais leveza"]', 1),
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'Com que frequência você sente que está "travada", sem conseguir avançar em alguma área da sua vida?',
 '["Quase sempre — parece que caminho em círculos","Com frequência, especialmente em relacionamentos ou trabalho","Às vezes, mas consigo me mover","Raramente — me sinto em movimento"]', 2),
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'Como você costuma reagir quando precisa colocar um ponto final em algo — relacionamento, emprego ou fase?',
 '["Fico adiando mesmo sabendo que é necessário","Termino, mas carrego culpa ou arrependimento","Consigo encerrar, mas sinto um vazio depois","Encerro com clareza, mesmo que doa"]', 3),
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'O quanto você acredita que merece uma nova fase — mais leve, abundante e alinhada com quem você é?',
 '["No fundo acho que não mereço","Quero acreditar, mas duvido muito","Às vezes me sinto merecedora, às vezes não","Acredito, mas ainda preciso de apoio para chegar lá"]', 4),
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'Você percebe padrões que se repetem na sua vida — situações, tipos de pessoas ou sentimentos que sempre voltam?',
 '["Sim, e não entendo por quê","Sim, já percebi mas não consigo mudar","Às vezes — estou começando a identificar","Estou trabalhando nisso e percebo mudanças"]', 5),
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'Como você se sente em relação a pedir ajuda ou fazer terapia?',
 '["Tenho resistência — acho que devo resolver sozinha","Quero muito, mas tenho medo de me expor","Já fiz antes, mas parei — sei que preciso voltar","Estou aberta e pronta para esse processo"]', 6),
('11111111-1111-1111-1111-111111111111', 'multiple_choice',
 'Se você pudesse mudar uma coisa na sua vida agora, o que seria?',
 '["Me libertar de algo do passado que ainda me prende","Entender por que repito certas situações","Ter coragem de começar uma nova fase","Me sentir mais leve e em paz comigo mesma"]', 7);

-- Perguntas do template 2 — Saúde emocional
INSERT INTO template_questions (template_id, type, question, options, "order") VALUES
('22222222-2222-2222-2222-222222222222', 'multiple_choice',
 'Como você descreveria seu estado emocional nos últimos dias?',
 '["Me sinto muito sobrecarregada e exausta","Ando ansiosa e com muitos pensamentos","Vou indo, mas com altos e baixos","Me sinto relativamente bem e equilibrada"]', 1),
('22222222-2222-2222-2222-222222222222', 'multiple_choice',
 'Com que frequência você tem pensamentos negativos sobre você mesma?',
 '["Quase o tempo todo","Com bastante frequência","Às vezes, mas consigo lidar","Raramente, me trato com gentileza"]', 2),
('22222222-2222-2222-2222-222222222222', 'multiple_choice',
 'Como está sua qualidade de sono?',
 '["Durmo muito mal, me acordo várias vezes","Tenho dificuldade para pegar no sono","Varia bastante, alguns dias melhores","Durmo bem na maioria das vezes"]', 3),
('22222222-2222-2222-2222-222222222222', 'multiple_choice',
 'Você tem conseguido sentir prazer em coisas que antes te davam alegria?',
 '["Não, quase nada me dá prazer ultimamente","Raramente, e quando dá é passageiro","Às vezes sim, depende do dia","Sim, ainda consigo me alegrar com coisas simples"]', 4),
('22222222-2222-2222-2222-222222222222', 'multiple_choice',
 'Como você lida com situações de estresse no dia a dia?',
 '["Trava completamente ou reage de forma muito intensa","Fico muito ansiosa e demoro para me recuperar","Consigo lidar, mas me desgasta bastante","Tenho estratégias que me ajudam a voltar ao centro"]', 5);

-- Perguntas do template 3 — Autoestima
INSERT INTO template_questions (template_id, type, question, options, "order") VALUES
('33333333-3333-3333-3333-333333333333', 'multiple_choice',
 'Quando alguém te pede algo que vai contra seus valores ou necessidades, como você reage?',
 '["Cedo quase sempre, com medo de decepcionar","Tento dizer não, mas me sinto muito culpada","Às vezes consigo me posicionar, mas é difícil","Consigo dizer não com clareza e sem culpa excessiva"]', 1),
('33333333-3333-3333-3333-333333333333', 'multiple_choice',
 'Como você se sente em relação ao seu valor como pessoa?',
 '["Sinto que não sou boa o suficiente","Às vezes me sinto valorosa, mas é instável","Estou aprendendo a me valorizar","Acredito no meu valor, mesmo com imperfeições"]', 2),
('33333333-3333-3333-3333-333333333333', 'multiple_choice',
 'Você costuma colocar as necessidades dos outros acima das suas?',
 '["Sempre — me esqueço de mim","Na maioria das vezes, me sinto egoísta quando priorizo a mim","Às vezes me equilibro, às vezes não","Consigo me priorizar sem me sentir egoísta"]', 3),
('33333333-3333-3333-3333-333333333333', 'multiple_choice',
 'Como você reage quando alguém te critica?',
 '["Entro em colapso — fico dias me sentindo mal","Me abalo bastante e rumino o que ouvi","Fico um pouco afetada, mas consigo me recuperar","Consigo ouvir, filtrar e seguir em frente"]', 4),
('33333333-3333-3333-3333-333333333333', 'multiple_choice',
 'O que sente quando pensa em investir tempo e dinheiro em você mesma?',
 '["Parece errado, como se não merecesse","Quero muito, mas sempre encontro razões para adiar","Às vezes faço, mas com uma pontada de culpa","Me parece natural — cuidar de mim é prioridade"]', 5),
('33333333-3333-3333-3333-333333333333', 'multiple_choice',
 'Quando olha para sua vida, o que sente?',
 '["Muita insatisfação e falta de sentido","Uma mistura de gratidão e muito que ainda precisa mudar","Contentamento, mas com áreas que pedem atenção","Uma paz profunda, mesmo com os desafios"]', 6);

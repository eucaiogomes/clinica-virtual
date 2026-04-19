export interface Patient {
  id: string
  user_id: string
  name: string
  phone: string
  created_at: string
}

export interface Clinic {
  id: string
  user_id: string
  name: string
  percentage: number
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  patient_id: string
  clinic_id?: string | null
  date: string
  price: number
  type: 'particular' | 'convenio' | 'terceirizado'
  is_paid: boolean
  payment_method: string
  created_at: string
  patients?: { name: string }
  clinics?: { name: string; percentage: number } | null
}

export interface Package {
  id: string
  user_id: string
  patient_id: string
  total_sessions: number
  used_sessions: number
  total_price: number
  created_at: string
  patients?: { name: string }
}

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  type: 'revenue' | 'patients' | 'sessions'
  target: number
  period: 'monthly'
  start_date: string
  end_date: string
  created_at: string
}

// ──────────────────────────────────────────────────────────────
// Exercícios Terapêuticos
// ──────────────────────────────────────────────────────────────

export interface ResultTier {
  title: string
  text: string
  items: { icon: string; title: string; desc: string }[]
}

export interface Template {
  id: string
  title: string
  description: string | null
  category: string | null
  duration_minutes: number
  result_config: { low: ResultTier; mid: ResultTier; high: ResultTier } | null
  created_at: string
  template_questions?: TemplateQuestion[]
}

export interface TemplateQuestion {
  id: string
  template_id: string
  type: 'multiple_choice' | 'text'
  question: string
  options: string[] | null
  order: number
  created_at: string
}

export interface ProfessionalForm {
  id: string
  template_id: string
  user_id: string
  slug: string
  cta_url: string
  cta_label: string
  created_at: string
  templates?: Template
  responses?: { count: number }[]
}

export interface FormResponse {
  id: string
  professional_form_id: string
  patient_name: string | null
  patient_email: string | null
  score_pct: number | null
  created_at: string
  response_answers?: ResponseAnswer[]
}

export interface ResponseAnswer {
  id: string
  response_id: string
  question_id: string
  answer: string
  answer_index: number
  created_at: string
  template_questions?: TemplateQuestion
}

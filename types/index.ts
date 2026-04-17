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

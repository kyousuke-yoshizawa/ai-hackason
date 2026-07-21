export interface PlanRequest {
  message: string
  party_size?: number
  budget?: number
  time_limit?: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface PlanStop {
  store_id: string
  store_name: string
  start_time: string
  end_time: string
  travel_note: string
  reason: string
  rating?: number | null
  open_time?: string | null
  close_time?: string | null
  crowd_note?: string | null
  offer_note?: string | null
}

export interface PlanCandidate {
  label: string
  stops: PlanStop[]
  score: number
  summary: string
}

export interface PlanIntent {
  desires: string[]
  party_size?: number | null
  budget?: number | null
  time_limit?: string | null
}

export interface GeneratePlanResponse {
  intent: PlanIntent
  candidates: PlanCandidate[]
}

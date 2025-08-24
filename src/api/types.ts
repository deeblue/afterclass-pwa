export type Item = {
  id: string
  subject: string
  grade: string
  unit: string
  kcs: string[]
  item_type: string
  difficulty: number
  stem: string
  choices: any | null
  answer: any | null
  solution: string
  tags: string[]
  source: string
  status: string
}

export type AttemptUp = {
  attempt_id: string
  user_id: string
  item_id: string
  ts: string
  elapsed_sec: number
  raw_answer: any
  attempts?: number
  work_url?: string | null
  process_json?: any
  rubric_json?: any
  eval_model?: string | null
  device_id?: string | null
  session_id?: string | null
}

export type ItemsResp = { page: number; count: number; items: Item[] }
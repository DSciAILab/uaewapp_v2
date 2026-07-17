export type MedicalStatus = 'pending' | 'cleared_by_doctor' | 'sent_to_hospital'

export interface MedicalClearance {
  id: string
  event_id: string
  enrolled_id: string
  status: MedicalStatus
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface MedicalRow {
  // null = no row exists yet in mma_medical_clearance
  id: string | null
  enrolled_id: string
  status: MedicalStatus
  notes: string | null
  was_at_hospital: boolean
  corner: 'RED' | 'BLUE' | null
  fight_order: number | null
  person: {
    id: string
    compiled_name: string
    nationality: string | null
    appadmin_fighter_id: string | null
    phone: string | null
    photo_url: string | null
  }
  event_name: string | null
}

export interface MedicalSummary {
  red: { pending: number; cleared: number; hospital: number }
  blue: { pending: number; cleared: number; hospital: number }
  total: { pending: number; cleared: number; hospital: number }
}

export interface MedicalLogEntry {
  id: string
  clearance_id: string
  event_id: string
  enrolled_id: string
  /** 'status' rows keep old/new_status; 'notes' rows use old/new_value. */
  field: 'status' | 'notes'
  old_status: MedicalStatus | null
  new_status: MedicalStatus | null
  old_value: string | null
  new_value: string | null
  changed_at: string
  changed_by: string | null
}

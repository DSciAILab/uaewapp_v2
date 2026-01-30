// Blood test status
export type BloodTestStatus = 'pending' | 'scheduled' | 'collected' | 'processing' | 'completed' | 'expired';

// Blood test result
export type BloodTestResult = 'clear' | 'flagged' | 'failed' | 'inconclusive';

// Medical exam status
export type MedicalExamStatus = 'pending' | 'scheduled' | 'completed' | 'failed';

// Document status
export type DocumentStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired';

// Pre-event clearance status
export type ClearanceStatus = 'pending' | 'partial' | 'cleared' | 'denied';

export interface BloodTest {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Test info
  test_type: string; // e.g., "Standard Panel", "Drug Screen", "HIV/Hepatitis"
  lab_name: string | null;
  
  // Scheduling
  scheduled_date: string | null;
  scheduled_time: string | null;
  collection_date: string | null;
  
  // Results
  status: BloodTestStatus;
  result: BloodTestResult | null;
  result_date: string | null;
  result_notes: string | null;
  
  // Validity
  expiration_date: string | null;
  
  // Documents
  result_file_path: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface BloodTestFormData {
  enrolled_id: string;
  test_type: string;
  lab_name?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  collection_date?: string;
  status: BloodTestStatus;
  result?: BloodTestResult | null;
  result_date?: string;
  result_notes?: string;
  expiration_date?: string;
  notes?: string;
}

export interface MedicalExam {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Exam info
  exam_type: string; // e.g., "Pre-fight Physical", "Eye Exam", "Neurological"
  examiner_name: string | null;
  facility_name: string | null;
  
  // Scheduling
  scheduled_date: string | null;
  scheduled_time: string | null;
  completed_date: string | null;
  
  // Results
  status: MedicalExamStatus;
  passed: boolean | null;
  findings: string | null;
  recommendations: string | null;
  
  // Validity
  expiration_date: string | null;
  
  // Documents
  report_file_path: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface MedicalExamFormData {
  enrolled_id: string;
  exam_type: string;
  examiner_name?: string;
  facility_name?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  completed_date?: string;
  status: MedicalExamStatus;
  passed?: boolean;
  findings?: string;
  recommendations?: string;
  expiration_date?: string;
  notes?: string;
}

export interface RequiredDocument {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Document info
  document_type: string; // e.g., "Passport", "License", "Insurance", "Contract"
  document_name: string;
  
  // Status
  status: DocumentStatus;
  submitted_date: string | null;
  reviewed_date: string | null;
  reviewed_by: string | null;
  
  // Validity
  expiration_date: string | null;
  
  // File
  file_path: string | null;
  
  // Rejection
  rejection_reason: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface RequiredDocumentFormData {
  enrolled_id: string;
  document_type: string;
  document_name: string;
  status: DocumentStatus;
  submitted_date?: string;
  expiration_date?: string;
  rejection_reason?: string;
  notes?: string;
}

export interface PreEventClearance {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Status
  status: ClearanceStatus;
  
  // Requirements met
  blood_tests_cleared: boolean;
  medical_exams_cleared: boolean;
  documents_cleared: boolean;
  
  // Final clearance
  cleared_date: string | null;
  cleared_by: string | null;
  
  // Denial
  denial_reason: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface PreEventSummary {
  enrolled_id: string;
  person_name: string;
  role: string;
  
  blood_tests: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    all_clear: boolean;
  };
  
  medical_exams: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    all_clear: boolean;
  };
  
  documents: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    all_clear: boolean;
  };
  
  clearance_status: ClearanceStatus;
}

export interface LogisticsRow {
  enrolled_id: string;
  person_id: string;
  full_name: string;
  role: string;
  checklist: {
    blood_test: ClearanceStatus;
    medical_exam: ClearanceStatus;
    documents: ClearanceStatus;
    music: 'ok' | 'pending' | 'missing';
    uniform: 'ok' | 'partial' | 'missing';
    weight: 'ok' | 'missed' | 'pending'; 
  };
  transport: {
    arrival_car_id: string | null;
    departure_car_id: string | null;
    arrival_car_number: number | null;
    departure_car_number: number | null;
  };
}

export const BLOOD_TEST_TYPES = [
  'Standard Panel',
  'Drug Screen',
  'HIV/Hepatitis',
  'Complete Blood Count',
  'Metabolic Panel',
];

export const MEDICAL_EXAM_TYPES = [
  'Pre-fight Physical',
  'Eye Exam',
  'Neurological Exam',
  'Cardiac Screening',
  'General Health Check',
];

export const DOCUMENT_TYPES = [
  'Passport',
  'Fighter License',
  'Medical Insurance',
  'Fight Contract',
  'Waiver Form',
  'Tax Documents',
  'Work Permit',
];

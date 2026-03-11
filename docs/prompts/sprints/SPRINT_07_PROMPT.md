# SPRINT 07: Pre-event + Batches Module

## 📋 Sprint Overview

**Sprint**: 07 - Pre-event + Batches
**Duration**: 2-3 days
**Dependencies**: Sprint 01 (People), Sprint 02 (Events + Enrolled)
**Objective**: Implement pre-event requirements tracking (blood tests, medical exams, documents) and batch management for grouping participants in operational processes

---

## 🎯 Sprint Goals

1. **Pre-event Module**
   - Blood test tracking with results and expiration
   - Medical examination records
   - Required documents checklist
   - Pre-event clearance status
   - Deadline management and alerts

2. **Batches Module**
   - Batch templates for different processes (weigh-in, medical, credentials, media)
   - Batch creation per event
   - Participant assignment to batches
   - Time slot management
   - Batch status tracking

---

## 📁 Files to Create

```
src/
├── lib/
│   └── services/
│       ├── pre-event-service.ts
│       └── batch-service.ts
├── components/
│   ├── pre-event/
│   │   ├── blood-test-form.tsx
│   │   ├── blood-test-table.tsx
│   │   ├── medical-exam-form.tsx
│   │   ├── medical-exam-table.tsx
│   │   ├── document-checklist.tsx
│   │   ├── clearance-status-card.tsx
│   │   └── pre-event-summary.tsx
│   └── batches/
│       ├── batch-form.tsx
│       ├── batch-table.tsx
│       ├── batch-card.tsx
│       ├── batch-assignment.tsx
│       ├── batch-timeline.tsx
│       └── batch-type-badge.tsx
├── app/
│   └── (dashboard)/
│       └── events/
│           └── [eventId]/
│               ├── pre-event/
│               │   └── page.tsx
│               └── batches/
│                   └── page.tsx
└── types/
    ├── pre-event.ts
    └── batch.ts
```

---

## 📝 Type Definitions

### File: `src/types/pre-event.ts`

```typescript
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
  result?: BloodTestResult;
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
```

### File: `src/types/batch.ts`

```typescript
// Batch types for different processes
export type BatchType = 
  | 'weigh_in'
  | 'medical'
  | 'credentials'
  | 'media'
  | 'rules_meeting'
  | 'custom';

// Batch status
export type BatchStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Participant status in batch
export type BatchParticipantStatus = 'assigned' | 'checked_in' | 'completed' | 'no_show' | 'removed';

export interface Batch {
  id: string;
  event_id: string;
  
  // Batch info
  batch_type: BatchType;
  batch_number: number; // Auto-incremented per event+type
  name: string;
  description: string | null;
  
  // Scheduling
  scheduled_date: string;
  start_time: string;
  end_time: string | null;
  
  // Location
  location: string | null;
  room: string | null;
  
  // Capacity
  max_capacity: number | null;
  
  // Status
  status: BatchStatus;
  started_at: string | null;
  completed_at: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  participants?: BatchParticipant[];
  participant_count?: number;
}

export interface BatchFormData {
  batch_type: BatchType;
  name: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  location?: string;
  room?: string;
  max_capacity?: number;
  status: BatchStatus;
  notes?: string;
}

export interface BatchParticipant {
  id: string;
  batch_id: string;
  enrolled_id: string;
  
  // Order
  order_number: number; // Position in batch
  
  // Status
  status: BatchParticipantStatus;
  checked_in_at: string | null;
  completed_at: string | null;
  
  // Results (for weigh-in, medical, etc.)
  result_data: Record<string, unknown> | null; // Flexible JSON for different batch types
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    id: string;
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface BatchParticipantFormData {
  enrolled_id: string;
  order_number?: number;
  status?: BatchParticipantStatus;
  notes?: string;
}

export interface BatchFilters {
  batch_type?: BatchType;
  status?: BatchStatus;
  scheduled_date?: string;
  search?: string;
}

export interface BatchTimeline {
  date: string;
  batches: Batch[];
}

export const BATCH_TYPE_LABELS: Record<BatchType, string> = {
  weigh_in: 'Weigh-in',
  medical: 'Medical Check',
  credentials: 'Credentials',
  media: 'Media/Press',
  rules_meeting: 'Rules Meeting',
  custom: 'Custom',
};

export const BATCH_TYPE_COLORS: Record<BatchType, string> = {
  weigh_in: 'bg-orange-100 text-orange-800 border-orange-200',
  medical: 'bg-red-100 text-red-800 border-red-200',
  credentials: 'bg-blue-100 text-blue-800 border-blue-200',
  media: 'bg-purple-100 text-purple-800 border-purple-200',
  rules_meeting: 'bg-green-100 text-green-800 border-green-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
```

---

## 🔧 Pre-event Service

### File: `src/lib/services/pre-event-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import {
  BloodTest,
  BloodTestFormData,
  BloodTestStatus,
  BloodTestResult,
  MedicalExam,
  MedicalExamFormData,
  MedicalExamStatus,
  RequiredDocument,
  RequiredDocumentFormData,
  DocumentStatus,
  PreEventClearance,
  PreEventSummary,
  ClearanceStatus,
} from '@/types/pre-event';

const supabase = createClient();

// ==================== BLOOD TESTS ====================

export async function getEventBloodTests(eventId: string): Promise<BloodTest[]> {
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('event_id', eventId)
    .order('scheduled_date', { ascending: true });

  if (error) throw new Error('Failed to fetch blood tests');

  return data || [];
}

export async function getBloodTestById(testId: string): Promise<BloodTest | null> {
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('id', testId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createBloodTest(eventId: string, formData: BloodTestFormData): Promise<BloodTest> {
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      test_type: formData.test_type,
      lab_name: formData.lab_name || null,
      scheduled_date: formData.scheduled_date || null,
      scheduled_time: formData.scheduled_time || null,
      collection_date: formData.collection_date || null,
      status: formData.status,
      result: formData.result || null,
      result_date: formData.result_date || null,
      result_notes: formData.result_notes || null,
      expiration_date: formData.expiration_date || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create blood test');

  // Update clearance status
  await updateClearanceStatus(eventId, formData.enrolled_id);

  return data;
}

export async function updateBloodTest(testId: string, formData: Partial<BloodTestFormData>): Promise<BloodTest> {
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .update(formData)
    .eq('id', testId)
    .select()
    .single();

  if (error) throw new Error('Failed to update blood test');

  // Get test to update clearance
  const test = await getBloodTestById(testId);
  if (test) {
    await updateClearanceStatus(test.event_id, test.enrolled_id);
  }

  return data;
}

export async function deleteBloodTest(testId: string): Promise<void> {
  const test = await getBloodTestById(testId);
  
  const { error } = await supabase
    .from('mma_blood_tests')
    .delete()
    .eq('id', testId);

  if (error) throw new Error('Failed to delete blood test');

  // Update clearance status
  if (test) {
    await updateClearanceStatus(test.event_id, test.enrolled_id);
  }
}

export async function updateBloodTestResult(
  testId: string,
  result: BloodTestResult,
  resultNotes?: string
): Promise<BloodTest> {
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .update({
      result,
      result_notes: resultNotes || null,
      result_date: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', testId)
    .select()
    .single();

  if (error) throw new Error('Failed to update blood test result');

  // Update clearance
  const test = await getBloodTestById(testId);
  if (test) {
    await updateClearanceStatus(test.event_id, test.enrolled_id);
  }

  return data;
}

// ==================== MEDICAL EXAMS ====================

export async function getEventMedicalExams(eventId: string): Promise<MedicalExam[]> {
  const { data, error } = await supabase
    .from('mma_medical_exams')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('event_id', eventId)
    .order('scheduled_date', { ascending: true });

  if (error) throw new Error('Failed to fetch medical exams');

  return data || [];
}

export async function getMedicalExamById(examId: string): Promise<MedicalExam | null> {
  const { data, error } = await supabase
    .from('mma_medical_exams')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('id', examId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createMedicalExam(eventId: string, formData: MedicalExamFormData): Promise<MedicalExam> {
  const { data, error } = await supabase
    .from('mma_medical_exams')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      exam_type: formData.exam_type,
      examiner_name: formData.examiner_name || null,
      facility_name: formData.facility_name || null,
      scheduled_date: formData.scheduled_date || null,
      scheduled_time: formData.scheduled_time || null,
      completed_date: formData.completed_date || null,
      status: formData.status,
      passed: formData.passed ?? null,
      findings: formData.findings || null,
      recommendations: formData.recommendations || null,
      expiration_date: formData.expiration_date || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create medical exam');

  await updateClearanceStatus(eventId, formData.enrolled_id);

  return data;
}

export async function updateMedicalExam(examId: string, formData: Partial<MedicalExamFormData>): Promise<MedicalExam> {
  const { data, error } = await supabase
    .from('mma_medical_exams')
    .update(formData)
    .eq('id', examId)
    .select()
    .single();

  if (error) throw new Error('Failed to update medical exam');

  const exam = await getMedicalExamById(examId);
  if (exam) {
    await updateClearanceStatus(exam.event_id, exam.enrolled_id);
  }

  return data;
}

export async function deleteMedicalExam(examId: string): Promise<void> {
  const exam = await getMedicalExamById(examId);

  const { error } = await supabase
    .from('mma_medical_exams')
    .delete()
    .eq('id', examId);

  if (error) throw new Error('Failed to delete medical exam');

  if (exam) {
    await updateClearanceStatus(exam.event_id, exam.enrolled_id);
  }
}

// ==================== REQUIRED DOCUMENTS ====================

export async function getEventDocuments(eventId: string): Promise<RequiredDocument[]> {
  const { data, error } = await supabase
    .from('mma_required_documents')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('event_id', eventId)
    .order('document_type');

  if (error) throw new Error('Failed to fetch documents');

  return data || [];
}

export async function getDocumentById(docId: string): Promise<RequiredDocument | null> {
  const { data, error } = await supabase
    .from('mma_required_documents')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('id', docId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createDocument(eventId: string, formData: RequiredDocumentFormData): Promise<RequiredDocument> {
  const { data, error } = await supabase
    .from('mma_required_documents')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      document_type: formData.document_type,
      document_name: formData.document_name,
      status: formData.status,
      submitted_date: formData.submitted_date || null,
      expiration_date: formData.expiration_date || null,
      rejection_reason: formData.rejection_reason || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create document');

  await updateClearanceStatus(eventId, formData.enrolled_id);

  return data;
}

export async function updateDocument(docId: string, formData: Partial<RequiredDocumentFormData>): Promise<RequiredDocument> {
  const { data, error } = await supabase
    .from('mma_required_documents')
    .update(formData)
    .eq('id', docId)
    .select()
    .single();

  if (error) throw new Error('Failed to update document');

  const doc = await getDocumentById(docId);
  if (doc) {
    await updateClearanceStatus(doc.event_id, doc.enrolled_id);
  }

  return data;
}

export async function updateDocumentStatus(
  docId: string,
  status: DocumentStatus,
  reviewerId?: string,
  rejectionReason?: string
): Promise<RequiredDocument> {
  const updateData: Record<string, unknown> = {
    status,
    reviewed_date: new Date().toISOString(),
    reviewed_by: reviewerId || null,
  };

  if (status === 'rejected' && rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  const { data, error } = await supabase
    .from('mma_required_documents')
    .update(updateData)
    .eq('id', docId)
    .select()
    .single();

  if (error) throw new Error('Failed to update document status');

  const doc = await getDocumentById(docId);
  if (doc) {
    await updateClearanceStatus(doc.event_id, doc.enrolled_id);
  }

  return data;
}

export async function deleteDocument(docId: string): Promise<void> {
  const doc = await getDocumentById(docId);

  const { error } = await supabase
    .from('mma_required_documents')
    .delete()
    .eq('id', docId);

  if (error) throw new Error('Failed to delete document');

  if (doc) {
    await updateClearanceStatus(doc.event_id, doc.enrolled_id);
  }
}

// ==================== CLEARANCE ====================

export async function getClearanceStatus(eventId: string, enrolledId: string): Promise<PreEventClearance | null> {
  const { data, error } = await supabase
    .from('mma_pre_event_clearance')
    .select('*')
    .eq('event_id', eventId)
    .eq('enrolled_id', enrolledId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function updateClearanceStatus(eventId: string, enrolledId: string): Promise<PreEventClearance> {
  // Get all requirements for this enrolled
  const [bloodTests, medicalExams, documents] = await Promise.all([
    supabase
      .from('mma_blood_tests')
      .select('status, result')
      .eq('event_id', eventId)
      .eq('enrolled_id', enrolledId),
    supabase
      .from('mma_medical_exams')
      .select('status, passed')
      .eq('event_id', eventId)
      .eq('enrolled_id', enrolledId),
    supabase
      .from('mma_required_documents')
      .select('status')
      .eq('event_id', eventId)
      .eq('enrolled_id', enrolledId),
  ]);

  // Calculate clearance for each category
  const bloodTestsCleared = (bloodTests.data || []).length === 0 || 
    (bloodTests.data || []).every(t => t.status === 'completed' && t.result === 'clear');

  const medicalExamsCleared = (medicalExams.data || []).length === 0 ||
    (medicalExams.data || []).every(e => e.status === 'completed' && e.passed === true);

  const documentsCleared = (documents.data || []).length === 0 ||
    (documents.data || []).every(d => d.status === 'approved');

  // Determine overall status
  let status: ClearanceStatus = 'pending';
  
  if (bloodTestsCleared && medicalExamsCleared && documentsCleared) {
    status = 'cleared';
  } else if (bloodTestsCleared || medicalExamsCleared || documentsCleared) {
    status = 'partial';
  }

  // Check for any failures
  const hasFailedBlood = (bloodTests.data || []).some(t => t.result === 'failed');
  const hasFailedExam = (medicalExams.data || []).some(e => e.passed === false);
  const hasRejectedDoc = (documents.data || []).some(d => d.status === 'rejected');

  if (hasFailedBlood || hasFailedExam || hasRejectedDoc) {
    status = 'denied';
  }

  // Upsert clearance record
  const { data, error } = await supabase
    .from('mma_pre_event_clearance')
    .upsert({
      event_id: eventId,
      enrolled_id: enrolledId,
      status,
      blood_tests_cleared: bloodTestsCleared,
      medical_exams_cleared: medicalExamsCleared,
      documents_cleared: documentsCleared,
      cleared_date: status === 'cleared' ? new Date().toISOString() : null,
    }, {
      onConflict: 'event_id,enrolled_id',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to update clearance status');

  return data;
}

export async function grantClearance(
  eventId: string,
  enrolledId: string,
  clearedBy: string
): Promise<PreEventClearance> {
  const { data, error } = await supabase
    .from('mma_pre_event_clearance')
    .upsert({
      event_id: eventId,
      enrolled_id: enrolledId,
      status: 'cleared',
      blood_tests_cleared: true,
      medical_exams_cleared: true,
      documents_cleared: true,
      cleared_date: new Date().toISOString(),
      cleared_by: clearedBy,
    }, {
      onConflict: 'event_id,enrolled_id',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to grant clearance');

  return data;
}

export async function denyClearance(
  eventId: string,
  enrolledId: string,
  reason: string
): Promise<PreEventClearance> {
  const { data, error } = await supabase
    .from('mma_pre_event_clearance')
    .upsert({
      event_id: eventId,
      enrolled_id: enrolledId,
      status: 'denied',
      denial_reason: reason,
    }, {
      onConflict: 'event_id,enrolled_id',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to deny clearance');

  return data;
}

// ==================== SUMMARY ====================

export async function getPreEventSummary(eventId: string): Promise<PreEventSummary[]> {
  // Get all enrolled for event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select(`
      id,
      person:mma_people!inner(id, full_name, role)
    `)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const summaries: PreEventSummary[] = [];

  for (const e of enrolled || []) {
    // Get blood tests
    const { data: bloodTests } = await supabase
      .from('mma_blood_tests')
      .select('status, result')
      .eq('event_id', eventId)
      .eq('enrolled_id', e.id);

    // Get medical exams
    const { data: medicalExams } = await supabase
      .from('mma_medical_exams')
      .select('status, passed')
      .eq('event_id', eventId)
      .eq('enrolled_id', e.id);

    // Get documents
    const { data: documents } = await supabase
      .from('mma_required_documents')
      .select('status')
      .eq('event_id', eventId)
      .eq('enrolled_id', e.id);

    // Get clearance
    const { data: clearance } = await supabase
      .from('mma_pre_event_clearance')
      .select('status')
      .eq('event_id', eventId)
      .eq('enrolled_id', e.id)
      .single();

    const bt = bloodTests || [];
    const me = medicalExams || [];
    const docs = documents || [];

    summaries.push({
      enrolled_id: e.id,
      person_name: e.person.full_name,
      role: e.person.role,
      blood_tests: {
        total: bt.length,
        completed: bt.filter(t => t.status === 'completed').length,
        pending: bt.filter(t => t.status !== 'completed').length,
        failed: bt.filter(t => t.result === 'failed').length,
        all_clear: bt.length === 0 || bt.every(t => t.status === 'completed' && t.result === 'clear'),
      },
      medical_exams: {
        total: me.length,
        completed: me.filter(m => m.status === 'completed').length,
        pending: me.filter(m => m.status !== 'completed').length,
        failed: me.filter(m => m.passed === false).length,
        all_clear: me.length === 0 || me.every(m => m.status === 'completed' && m.passed === true),
      },
      documents: {
        total: docs.length,
        approved: docs.filter(d => d.status === 'approved').length,
        pending: docs.filter(d => d.status === 'pending' || d.status === 'submitted').length,
        rejected: docs.filter(d => d.status === 'rejected').length,
        all_clear: docs.length === 0 || docs.every(d => d.status === 'approved'),
      },
      clearance_status: clearance?.status || 'pending',
    });
  }

  return summaries;
}

export async function getPreEventStats(eventId: string): Promise<{
  total_enrolled: number;
  cleared: number;
  partial: number;
  pending: number;
  denied: number;
  blood_tests_pending: number;
  medical_exams_pending: number;
  documents_pending: number;
}> {
  const summaries = await getPreEventSummary(eventId);

  return {
    total_enrolled: summaries.length,
    cleared: summaries.filter(s => s.clearance_status === 'cleared').length,
    partial: summaries.filter(s => s.clearance_status === 'partial').length,
    pending: summaries.filter(s => s.clearance_status === 'pending').length,
    denied: summaries.filter(s => s.clearance_status === 'denied').length,
    blood_tests_pending: summaries.reduce((sum, s) => sum + s.blood_tests.pending, 0),
    medical_exams_pending: summaries.reduce((sum, s) => sum + s.medical_exams.pending, 0),
    documents_pending: summaries.reduce((sum, s) => sum + s.documents.pending, 0),
  };
}
```

---

## 🔧 Batch Service

### File: `src/lib/services/batch-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import {
  Batch,
  BatchFormData,
  BatchParticipant,
  BatchParticipantFormData,
  BatchFilters,
  BatchStatus,
  BatchParticipantStatus,
  BatchType,
  BatchTimeline,
} from '@/types/batch';

const supabase = createClient();

// ==================== BATCHES ====================

export async function getEventBatches(eventId: string, filters?: BatchFilters): Promise<Batch[]> {
  let query = supabase
    .from('mma_batches')
    .select(`
      *,
      participants:mma_batch_participants(count)
    `)
    .eq('event_id', eventId)
    .order('scheduled_date')
    .order('start_time');

  if (filters?.batch_type) {
    query = query.eq('batch_type', filters.batch_type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.scheduled_date) {
    query = query.eq('scheduled_date', filters.scheduled_date);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch batches');

  let results = (data || []).map(batch => ({
    ...batch,
    participant_count: batch.participants?.[0]?.count || 0,
  }));

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(batch =>
      batch.name.toLowerCase().includes(searchLower) ||
      batch.location?.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

export async function getBatchById(batchId: string): Promise<Batch | null> {
  const { data, error } = await supabase
    .from('mma_batches')
    .select(`
      *,
      participants:mma_batch_participants(
        *,
        enrolled:mma_enrolled(
          id,
          person:mma_people(id, full_name, role)
        )
      )
    `)
    .eq('id', batchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

async function getNextBatchNumber(eventId: string, batchType: BatchType): Promise<number> {
  const { data, error } = await supabase
    .from('mma_batches')
    .select('batch_number')
    .eq('event_id', eventId)
    .eq('batch_type', batchType)
    .order('batch_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  return (data?.[0]?.batch_number || 0) + 1;
}

export async function createBatch(eventId: string, formData: BatchFormData): Promise<Batch> {
  const batchNumber = await getNextBatchNumber(eventId, formData.batch_type);

  const { data, error } = await supabase
    .from('mma_batches')
    .insert({
      event_id: eventId,
      batch_type: formData.batch_type,
      batch_number: batchNumber,
      name: formData.name,
      description: formData.description || null,
      scheduled_date: formData.scheduled_date,
      start_time: formData.start_time,
      end_time: formData.end_time || null,
      location: formData.location || null,
      room: formData.room || null,
      max_capacity: formData.max_capacity || null,
      status: formData.status,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create batch');

  return data;
}

export async function updateBatch(batchId: string, formData: Partial<BatchFormData>): Promise<Batch> {
  const { data, error } = await supabase
    .from('mma_batches')
    .update(formData)
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw new Error('Failed to update batch');

  return data;
}

export async function deleteBatch(batchId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_batches')
    .delete()
    .eq('id', batchId);

  if (error) throw new Error('Failed to delete batch');
}

export async function updateBatchStatus(batchId: string, status: BatchStatus): Promise<Batch> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('mma_batches')
    .update(updateData)
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw new Error('Failed to update batch status');

  return data;
}

// ==================== BATCH PARTICIPANTS ====================

export async function getBatchParticipants(batchId: string): Promise<BatchParticipant[]> {
  const { data, error } = await supabase
    .from('mma_batch_participants')
    .select(`
      *,
      enrolled:mma_enrolled(
        id,
        person:mma_people(id, full_name, role)
      )
    `)
    .eq('batch_id', batchId)
    .order('order_number');

  if (error) throw new Error('Failed to fetch batch participants');

  return data || [];
}

export async function addParticipantToBatch(
  batchId: string,
  formData: BatchParticipantFormData
): Promise<BatchParticipant> {
  // Get next order number
  const { data: existing } = await supabase
    .from('mma_batch_participants')
    .select('order_number')
    .eq('batch_id', batchId)
    .order('order_number', { ascending: false })
    .limit(1);

  const orderNumber = formData.order_number || ((existing?.[0]?.order_number || 0) + 1);

  const { data, error } = await supabase
    .from('mma_batch_participants')
    .insert({
      batch_id: batchId,
      enrolled_id: formData.enrolled_id,
      order_number: orderNumber,
      status: formData.status || 'assigned',
      notes: formData.notes || null,
    })
    .select(`
      *,
      enrolled:mma_enrolled(
        id,
        person:mma_people(id, full_name, role)
      )
    `)
    .single();

  if (error) throw new Error('Failed to add participant to batch');

  return data;
}

export async function removeParticipantFromBatch(participantId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_batch_participants')
    .delete()
    .eq('id', participantId);

  if (error) throw new Error('Failed to remove participant from batch');
}

export async function updateParticipantStatus(
  participantId: string,
  status: BatchParticipantStatus
): Promise<BatchParticipant> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'checked_in') {
    updateData.checked_in_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('mma_batch_participants')
    .update(updateData)
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw new Error('Failed to update participant status');

  return data;
}

export async function updateParticipantResult(
  participantId: string,
  resultData: Record<string, unknown>
): Promise<BatchParticipant> {
  const { data, error } = await supabase
    .from('mma_batch_participants')
    .update({
      result_data: resultData,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw new Error('Failed to update participant result');

  return data;
}

export async function reorderParticipants(batchId: string, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('mma_batch_participants')
      .update({ order_number: index + 1 })
      .eq('id', id)
      .eq('batch_id', batchId)
  );

  await Promise.all(updates);
}

export async function checkInParticipant(participantId: string): Promise<BatchParticipant> {
  return updateParticipantStatus(participantId, 'checked_in');
}

export async function markParticipantComplete(participantId: string): Promise<BatchParticipant> {
  return updateParticipantStatus(participantId, 'completed');
}

export async function markParticipantNoShow(participantId: string): Promise<BatchParticipant> {
  return updateParticipantStatus(participantId, 'no_show');
}

// ==================== BATCH TIMELINE ====================

export async function getBatchTimeline(eventId: string): Promise<BatchTimeline[]> {
  const batches = await getEventBatches(eventId);

  // Group by date
  const byDate: Map<string, Batch[]> = new Map();

  for (const batch of batches) {
    const date = batch.scheduled_date;
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(batch);
  }

  // Convert to timeline format and sort by date
  const timeline: BatchTimeline[] = Array.from(byDate.entries())
    .map(([date, batches]) => ({ date, batches }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return timeline;
}

// ==================== UTILITIES ====================

export async function getAvailableEnrolledForBatch(
  eventId: string,
  batchId: string
): Promise<Array<{
  id: string;
  person: { id: string; full_name: string; role: string };
}>> {
  // Get all enrolled for event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select(`
      id,
      person:mma_people!inner(id, full_name, role)
    `)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  // Get already assigned to this batch
  const { data: assigned, error: assignedError } = await supabase
    .from('mma_batch_participants')
    .select('enrolled_id')
    .eq('batch_id', batchId);

  if (assignedError) throw assignedError;

  const assignedIds = new Set(assigned?.map(a => a.enrolled_id) || []);

  return (enrolled || []).filter(e => !assignedIds.has(e.id));
}

export async function getBatchStats(eventId: string): Promise<{
  total: number;
  by_type: Record<BatchType, number>;
  by_status: Record<BatchStatus, number>;
  total_participants: number;
  checked_in: number;
  completed: number;
}> {
  const batches = await getEventBatches(eventId);

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const batch of batches) {
    byType[batch.batch_type] = (byType[batch.batch_type] || 0) + 1;
    byStatus[batch.status] = (byStatus[batch.status] || 0) + 1;
  }

  // Get participant stats
  const { data: participants, error } = await supabase
    .from('mma_batch_participants')
    .select('status, batch:mma_batches!inner(event_id)')
    .eq('batch.event_id', eventId);

  if (error) throw error;

  const allParticipants = participants || [];

  return {
    total: batches.length,
    by_type: byType as Record<BatchType, number>,
    by_status: byStatus as Record<BatchStatus, number>,
    total_participants: allParticipants.length,
    checked_in: allParticipants.filter(p => p.status === 'checked_in' || p.status === 'completed').length,
    completed: allParticipants.filter(p => p.status === 'completed').length,
  };
}
```

---

## 🎨 Pre-event Components

### File: `src/components/pre-event/clearance-status-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { PreEventSummary, ClearanceStatus } from '@/types/pre-event';

interface ClearanceStatusCardProps {
  summary: PreEventSummary;
  onClick?: () => void;
}

const statusConfig: Record<ClearanceStatus, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  cleared: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  partial: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  pending: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  denied: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function ClearanceStatusCard({ summary, onClick }: ClearanceStatusCardProps) {
  const config = statusConfig[summary.clearance_status];
  const StatusIcon = config.icon;

  const totalItems = summary.blood_tests.total + summary.medical_exams.total + summary.documents.total;
  const completedItems = 
    (summary.blood_tests.all_clear ? summary.blood_tests.total : summary.blood_tests.completed) +
    (summary.medical_exams.all_clear ? summary.medical_exams.total : summary.medical_exams.completed) +
    summary.documents.approved;
  
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{summary.person_name}</CardTitle>
          <Badge className={`${config.bgColor} ${config.color} border-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {summary.clearance_status.charAt(0).toUpperCase() + summary.clearance_status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{summary.role}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Requirements */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {/* Blood Tests */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.blood_tests.all_clear ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : summary.blood_tests.failed > 0 ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
            </div>
            <p className="font-medium">Blood</p>
            <p className="text-xs text-muted-foreground">
              {summary.blood_tests.completed}/{summary.blood_tests.total}
            </p>
          </div>

          {/* Medical Exams */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.medical_exams.all_clear ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : summary.medical_exams.failed > 0 ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
            </div>
            <p className="font-medium">Medical</p>
            <p className="text-xs text-muted-foreground">
              {summary.medical_exams.completed}/{summary.medical_exams.total}
            </p>
          </div>

          {/* Documents */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.documents.all_clear ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : summary.documents.rejected > 0 ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
            </div>
            <p className="font-medium">Docs</p>
            <p className="text-xs text-muted-foreground">
              {summary.documents.approved}/{summary.documents.total}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {(summary.blood_tests.failed > 0 || summary.medical_exams.failed > 0 || summary.documents.rejected > 0) && (
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {summary.blood_tests.failed > 0 && `${summary.blood_tests.failed} failed blood test(s). `}
              {summary.medical_exams.failed > 0 && `${summary.medical_exams.failed} failed exam(s). `}
              {summary.documents.rejected > 0 && `${summary.documents.rejected} rejected doc(s).`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/pre-event/blood-test-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BloodTest, BloodTestFormData, BloodTestStatus, BloodTestResult, BLOOD_TEST_TYPES } from '@/types/pre-event';
import { createBloodTest, updateBloodTest } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';

const bloodTestSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a person'),
  test_type: z.string().min(1, 'Test type is required'),
  lab_name: z.string().optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  collection_date: z.string().optional(),
  status: z.enum(['pending', 'scheduled', 'collected', 'processing', 'completed', 'expired']),
  result: z.enum(['clear', 'flagged', 'failed', 'inconclusive']).optional(),
  result_date: z.string().optional(),
  result_notes: z.string().optional(),
  expiration_date: z.string().optional(),
  notes: z.string().optional(),
});

interface BloodTestFormProps {
  eventId: string;
  enrolledList: Array<{ id: string; person: { full_name: string } }>;
  bloodTest?: BloodTest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BloodTestForm({ eventId, enrolledList, bloodTest, open, onOpenChange, onSuccess }: BloodTestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!bloodTest;

  const form = useForm<BloodTestFormData>({
    resolver: zodResolver(bloodTestSchema),
    defaultValues: {
      enrolled_id: '',
      test_type: '',
      lab_name: '',
      scheduled_date: '',
      scheduled_time: '',
      collection_date: '',
      status: 'pending',
      result: undefined,
      result_date: '',
      result_notes: '',
      expiration_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (bloodTest) {
      form.reset({
        enrolled_id: bloodTest.enrolled_id,
        test_type: bloodTest.test_type,
        lab_name: bloodTest.lab_name || '',
        scheduled_date: bloodTest.scheduled_date || '',
        scheduled_time: bloodTest.scheduled_time || '',
        collection_date: bloodTest.collection_date || '',
        status: bloodTest.status,
        result: bloodTest.result || undefined,
        result_date: bloodTest.result_date || '',
        result_notes: bloodTest.result_notes || '',
        expiration_date: bloodTest.expiration_date || '',
        notes: bloodTest.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        test_type: '',
        lab_name: '',
        scheduled_date: '',
        scheduled_time: '',
        collection_date: '',
        status: 'pending',
        result: undefined,
        result_date: '',
        result_notes: '',
        expiration_date: '',
        notes: '',
      });
    }
  }, [bloodTest, form]);

  const onSubmit = async (data: BloodTestFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateBloodTest(bloodTest.id, data);
        toast.success('Blood test updated');
      } else {
        await createBloodTest(eventId, data);
        toast.success('Blood test created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update' : 'Failed to create');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: BloodTestStatus[] = ['pending', 'scheduled', 'collected', 'processing', 'completed', 'expired'];
  const resultOptions: BloodTestResult[] = ['clear', 'flagged', 'failed', 'inconclusive'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Blood Test' : 'New Blood Test'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="enrolled_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {enrolledList.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.person.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="test_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {BLOOD_TEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lab_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lab Name</FormLabel>
                  <FormControl><Input placeholder="Laboratory name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {resultOptions.map((r) => (
                          <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="result_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result Notes</FormLabel>
                  <FormControl><Textarea placeholder="Result details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/pre-event/blood-test-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { BloodTest, BloodTestStatus, BloodTestResult } from '@/types/pre-event';
import { deleteBloodTest, updateBloodTestResult } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BloodTestTableProps {
  bloodTests: BloodTest[];
  onEdit: (test: BloodTest) => void;
  onRefresh: () => void;
}

const statusColors: Record<BloodTestStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  collected: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
};

const resultConfig: Record<BloodTestResult, { color: string; icon: typeof CheckCircle }> = {
  clear: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  flagged: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
  inconclusive: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
};

export function BloodTestTable({ bloodTests, onEdit, onRefresh }: BloodTestTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteBloodTest(deleteId);
      toast.success('Blood test deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleQuickResult = async (testId: string, result: BloodTestResult) => {
    try {
      await updateBloodTestResult(testId, result);
      toast.success('Result updated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update result');
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Test Type</TableHead>
              <TableHead>Lab</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bloodTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No blood tests found
                </TableCell>
              </TableRow>
            ) : (
              bloodTests.map((test) => {
                const isExpired = test.expiration_date && new Date(test.expiration_date) < new Date();
                const ResultIcon = test.result ? resultConfig[test.result].icon : null;

                return (
                  <TableRow key={test.id} className={isExpired ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">{test.enrolled?.person?.full_name}</TableCell>
                    <TableCell>{test.test_type}</TableCell>
                    <TableCell>{test.lab_name || '-'}</TableCell>
                    <TableCell>
                      {test.scheduled_date ? format(new Date(test.scheduled_date), 'MMM dd') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[test.status]}>
                        {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {test.result ? (
                        <Badge className={resultConfig[test.result].color}>
                          {ResultIcon && <ResultIcon className="h-3 w-3 mr-1" />}
                          {test.result.charAt(0).toUpperCase() + test.result.slice(1)}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {test.expiration_date ? (
                        <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(test.expiration_date), 'MMM dd')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(test)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          {test.status !== 'completed' && (
                            <>
                              <DropdownMenuItem onClick={() => handleQuickResult(test.id, 'clear')}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />Mark Clear
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickResult(test.id, 'failed')}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />Mark Failed
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(test.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blood Test?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### File: `src/components/pre-event/pre-event-summary.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Droplet, Stethoscope, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

interface PreEventSummaryProps {
  stats: {
    total_enrolled: number;
    cleared: number;
    partial: number;
    pending: number;
    denied: number;
    blood_tests_pending: number;
    medical_exams_pending: number;
    documents_pending: number;
  };
}

export function PreEventSummaryStats({ stats }: PreEventSummaryProps) {
  const clearanceProgress = stats.total_enrolled > 0 
    ? (stats.cleared / stats.total_enrolled) * 100 
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Overall Progress */}
      <Card className="col-span-2 md:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overall Clearance Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={clearanceProgress} className="flex-1" />
            <span className="text-lg font-bold">{stats.cleared}/{stats.total_enrolled}</span>
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{stats.cleared} Cleared</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span>{stats.partial} Partial</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-600" />
              <span>{stats.pending} Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{stats.denied} Denied</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blood Tests Pending */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Blood Tests Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-red-600" />
            <span className="text-2xl font-bold">{stats.blood_tests_pending}</span>
          </div>
        </CardContent>
      </Card>

      {/* Medical Exams Pending */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Medical Exams Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <span className="text-2xl font-bold">{stats.medical_exams_pending}</span>
          </div>
        </CardContent>
      </Card>

      {/* Documents Pending */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Documents Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <span className="text-2xl font-bold">{stats.documents_pending}</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Enrolled */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Enrolled</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{stats.total_enrolled}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🎨 Batch Components

### File: `src/components/batches/batch-type-badge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { BatchType, BatchStatus, BATCH_TYPE_LABELS, BATCH_TYPE_COLORS, BATCH_STATUS_LABELS } from '@/types/batch';
import { Scale, Stethoscope, CreditCard, Mic, BookOpen, Settings } from 'lucide-react';

interface BatchTypeBadgeProps {
  type: BatchType;
}

const typeIcons: Record<BatchType, typeof Scale> = {
  weigh_in: Scale,
  medical: Stethoscope,
  credentials: CreditCard,
  media: Mic,
  rules_meeting: BookOpen,
  custom: Settings,
};

export function BatchTypeBadge({ type }: BatchTypeBadgeProps) {
  const Icon = typeIcons[type];
  const colorClass = BATCH_TYPE_COLORS[type];

  return (
    <Badge variant="outline" className={`${colorClass} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {BATCH_TYPE_LABELS[type]}
    </Badge>
  );
}

interface BatchStatusBadgeProps {
  status: BatchStatus;
}

const statusColors: Record<BatchStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
  return (
    <Badge className={statusColors[status]}>
      {BATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
```

### File: `src/components/batches/batch-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Batch } from '@/types/batch';
import { BatchTypeBadge, BatchStatusBadge } from './batch-type-badge';

interface BatchCardProps {
  batch: Batch;
  onClick?: () => void;
}

export function BatchCard({ batch, onClick }: BatchCardProps) {
  const participantCount = batch.participant_count || batch.participants?.length || 0;
  const capacity = batch.max_capacity || participantCount;
  const fillPercentage = capacity > 0 ? (participantCount / capacity) * 100 : 0;

  const completedCount = batch.participants?.filter(p => p.status === 'completed').length || 0;
  const completionPercentage = participantCount > 0 ? (completedCount / participantCount) * 100 : 0;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{batch.name}</CardTitle>
          <BatchStatusBadge status={batch.status} />
        </div>
        <div className="flex items-center gap-2">
          <BatchTypeBadge type={batch.batch_type} />
          <span className="text-sm text-muted-foreground">#{batch.batch_number}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(`${batch.scheduled_date}T${batch.start_time}`), 'MMM dd, HH:mm')}
            {batch.end_time && ` - ${batch.end_time}`}
          </span>
        </div>

        {/* Location */}
        {batch.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{batch.location}{batch.room && ` - ${batch.room}`}</span>
          </div>
        )}

        {/* Participants */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{participantCount}{batch.max_capacity && ` / ${batch.max_capacity}`} participants</span>
        </div>

        {/* Fill Progress */}
        {batch.max_capacity && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Capacity</span>
              <span>{Math.round(fillPercentage)}%</span>
            </div>
            <Progress value={fillPercentage} className="h-1" />
          </div>
        )}

        {/* Completion Progress (if in progress) */}
        {batch.status === 'in_progress' && participantCount > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Completed</span>
              <span>{completedCount}/{participantCount}</span>
            </div>
            <Progress value={completionPercentage} className="h-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/batches/batch-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Batch, BatchFormData, BatchType, BatchStatus, BATCH_TYPE_LABELS, BATCH_STATUS_LABELS } from '@/types/batch';
import { createBatch, updateBatch } from '@/lib/services/batch-service';
import { toast } from 'sonner';

const batchSchema = z.object({
  batch_type: z.enum(['weigh_in', 'medical', 'credentials', 'media', 'rules_meeting', 'custom']),
  name: z.string().min(1, 'Batch name is required'),
  description: z.string().optional(),
  scheduled_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  location: z.string().optional(),
  room: z.string().optional(),
  max_capacity: z.coerce.number().min(1).optional(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

interface BatchFormProps {
  eventId: string;
  batch?: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchForm({ eventId, batch, open, onOpenChange, onSuccess }: BatchFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!batch;

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batch_type: 'weigh_in',
      name: '',
      description: '',
      scheduled_date: '',
      start_time: '',
      end_time: '',
      location: '',
      room: '',
      max_capacity: undefined,
      status: 'draft',
      notes: '',
    },
  });

  useEffect(() => {
    if (batch) {
      form.reset({
        batch_type: batch.batch_type,
        name: batch.name,
        description: batch.description || '',
        scheduled_date: batch.scheduled_date,
        start_time: batch.start_time,
        end_time: batch.end_time || '',
        location: batch.location || '',
        room: batch.room || '',
        max_capacity: batch.max_capacity || undefined,
        status: batch.status,
        notes: batch.notes || '',
      });
    } else {
      form.reset({
        batch_type: 'weigh_in',
        name: '',
        description: '',
        scheduled_date: '',
        start_time: '',
        end_time: '',
        location: '',
        room: '',
        max_capacity: undefined,
        status: 'draft',
        notes: '',
      });
    }
  }, [batch, form]);

  // Auto-generate name based on type
  const batchType = form.watch('batch_type');
  useEffect(() => {
    if (!isEditing && batchType) {
      const typeName = BATCH_TYPE_LABELS[batchType];
      form.setValue('name', `${typeName} Batch`);
    }
  }, [batchType, isEditing, form]);

  const onSubmit = async (data: BatchFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateBatch(batch.id, data);
        toast.success('Batch updated');
      } else {
        await createBatch(eventId, data);
        toast.success('Batch created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update batch' : 'Failed to create batch');
    } finally {
      setIsLoading(false);
    }
  };

  const batchTypes = Object.entries(BATCH_TYPE_LABELS) as [BatchType, string][];
  const statusOptions = Object.entries(BATCH_STATUS_LABELS) as [BatchStatus, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Batch' : 'New Batch'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {batchTypes.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statusOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Name *</FormLabel>
                  <FormControl><Input placeholder="Enter batch name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Batch description..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="Venue/Building" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <FormControl><Input placeholder="Room number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="max_capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Capacity</FormLabel>
                  <FormControl><Input type="number" min={1} placeholder="Leave empty for unlimited" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create Batch'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/batches/batch-assignment.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, UserMinus, CheckCircle, Clock, XCircle, GripVertical } from 'lucide-react';
import { Batch, BatchParticipant, BatchParticipantStatus } from '@/types/batch';
import { 
  getBatchParticipants, 
  addParticipantToBatch, 
  removeParticipantFromBatch, 
  updateParticipantStatus,
  getAvailableEnrolledForBatch 
} from '@/lib/services/batch-service';
import { toast } from 'sonner';

interface BatchAssignmentProps {
  eventId: string;
  batch: Batch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const statusConfig: Record<BatchParticipantStatus, { icon: typeof Clock; color: string }> = {
  assigned: { icon: Clock, color: 'bg-gray-100 text-gray-800' },
  checked_in: { icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  no_show: { icon: XCircle, color: 'bg-red-100 text-red-800' },
  removed: { icon: XCircle, color: 'bg-gray-100 text-gray-800' },
};

export function BatchAssignment({ eventId, batch, open, onOpenChange, onSuccess }: BatchAssignmentProps) {
  const [participants, setParticipants] = useState<BatchParticipant[]>([]);
  const [available, setAvailable] = useState<Array<{ id: string; person: { id: string; full_name: string; role: string } }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    try {
      const [participantsData, availableData] = await Promise.all([
        getBatchParticipants(batch.id),
        getAvailableEnrolledForBatch(eventId, batch.id),
      ]);
      setParticipants(participantsData);
      setAvailable(availableData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, batch.id, eventId]);

  const handleAdd = async (enrolledId: string) => {
    setIsLoading(true);
    try {
      await addParticipantToBatch(batch.id, { enrolled_id: enrolledId });
      toast.success('Participant added');
      loadData();
      onSuccess();
    } catch (error) {
      toast.error('Failed to add participant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (participantId: string) => {
    setIsLoading(true);
    try {
      await removeParticipantFromBatch(participantId);
      toast.success('Participant removed');
      loadData();
      onSuccess();
    } catch (error) {
      toast.error('Failed to remove participant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (participantId: string, status: BatchParticipantStatus) => {
    try {
      await updateParticipantStatus(participantId, status);
      toast.success('Status updated');
      loadData();
      onSuccess();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Participants - {batch.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Assigned Participants */}
          <div>
            <h3 className="font-medium mb-2">Assigned ({participants.length})</h3>
            <ScrollArea className="h-[400px] border rounded-lg p-2">
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No participants assigned
                </p>
              ) : (
                <div className="space-y-2">
                  {participants.map((participant) => {
                    const config = statusConfig[participant.status];
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center gap-2 p-2 border rounded-lg"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-mono text-muted-foreground">
                          #{participant.order_number}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {participant.enrolled?.person?.full_name}
                          </p>
                          <Badge className={`${config.color} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {participant.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          {participant.status === 'assigned' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(participant.id, 'checked_in')}
                            >
                              Check In
                            </Button>
                          )}
                          {participant.status === 'checked_in' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(participant.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(participant.id)}
                            disabled={isLoading}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Participants */}
          <div>
            <h3 className="font-medium mb-2">Available ({available.length})</h3>
            <ScrollArea className="h-[400px] border rounded-lg p-2">
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available participants
                </p>
              ) : (
                <div className="space-y-2">
                  {available.map((enrolled) => (
                    <div
                      key={enrolled.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{enrolled.person.full_name}</p>
                        <p className="text-xs text-muted-foreground">{enrolled.person.role}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAdd(enrolled.id)}
                        disabled={isLoading}
                      >
                        <UserPlus className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/batches/batch-timeline.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { BatchTimeline as BatchTimelineType } from '@/types/batch';
import { BatchTypeBadge, BatchStatusBadge } from './batch-type-badge';
import { Clock, MapPin, Users } from 'lucide-react';

interface BatchTimelineProps {
  timeline: BatchTimelineType[];
  onBatchClick?: (batchId: string) => void;
}

export function BatchTimeline({ timeline, onBatchClick }: BatchTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No batches scheduled
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timeline.map((day) => (
        <div key={day.date}>
          <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background py-2">
            {format(new Date(day.date), 'EEEE, MMMM dd, yyyy')}
          </h3>
          
          <div className="space-y-3 ml-4 border-l-2 border-muted pl-4">
            {day.batches.map((batch) => (
              <Card 
                key={batch.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onBatchClick?.(batch.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BatchTypeBadge type={batch.batch_type} />
                        <span className="font-medium">{batch.name}</span>
                        <span className="text-sm text-muted-foreground">#{batch.batch_number}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{batch.start_time}{batch.end_time && ` - ${batch.end_time}`}</span>
                        </div>
                        
                        {batch.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{batch.location}{batch.room && ` - ${batch.room}`}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>
                            {batch.participant_count || 0}
                            {batch.max_capacity && ` / ${batch.max_capacity}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <BatchStatusBadge status={batch.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 📄 Pages

### File: `src/app/(dashboard)/events/[eventId]/pre-event/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Droplet, Stethoscope, FileText, Users } from 'lucide-react';
import { PreEventSummaryStats } from '@/components/pre-event/pre-event-summary';
import { ClearanceStatusCard } from '@/components/pre-event/clearance-status-card';
import { BloodTestTable } from '@/components/pre-event/blood-test-table';
import { BloodTestForm } from '@/components/pre-event/blood-test-form';
import { BloodTest, MedicalExam, RequiredDocument, PreEventSummary } from '@/types/pre-event';
import { 
  getEventBloodTests, 
  getEventMedicalExams, 
  getEventDocuments, 
  getPreEventSummary,
  getPreEventStats 
} from '@/lib/services/pre-event-service';

export default function PreEventPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [bloodTests, setBloodTests] = useState<BloodTest[]>([]);
  const [medicalExams, setMedicalExams] = useState<MedicalExam[]>([]);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [summaries, setSummaries] = useState<PreEventSummary[]>([]);
  const [stats, setStats] = useState({
    total_enrolled: 0,
    cleared: 0,
    partial: 0,
    pending: 0,
    denied: 0,
    blood_tests_pending: 0,
    medical_exams_pending: 0,
    documents_pending: 0,
  });
  const [enrolledList, setEnrolledList] = useState<Array<{ id: string; person: { full_name: string } }>>([]);
  
  const [editingBloodTest, setEditingBloodTest] = useState<BloodTest | null>(null);
  const [isBloodTestFormOpen, setIsBloodTestFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bloodTestsData, medicalExamsData, documentsData, summariesData, statsData] = await Promise.all([
        getEventBloodTests(eventId),
        getEventMedicalExams(eventId),
        getEventDocuments(eventId),
        getPreEventSummary(eventId),
        getPreEventStats(eventId),
      ]);
      
      setBloodTests(bloodTestsData);
      setMedicalExams(medicalExamsData);
      setDocuments(documentsData);
      setSummaries(summariesData);
      setStats(statsData);

      // Build enrolled list from summaries
      setEnrolledList(summariesData.map(s => ({
        id: s.enrolled_id,
        person: { full_name: s.person_name },
      })));
    } catch (error) {
      console.error('Failed to load pre-event data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditBloodTest = (test: BloodTest) => {
    setEditingBloodTest(test);
    setIsBloodTestFormOpen(true);
  };

  const handleBloodTestFormClose = () => {
    setIsBloodTestFormOpen(false);
    setEditingBloodTest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pre-Event Requirements</h1>
          <p className="text-muted-foreground">Manage blood tests, medical exams, and documents</p>
        </div>
      </div>

      {/* Summary Stats */}
      <PreEventSummaryStats stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />Overview
          </TabsTrigger>
          <TabsTrigger value="blood" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />Blood Tests
          </TabsTrigger>
          <TabsTrigger value="medical" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />Medical Exams
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaries.map((summary) => (
                <ClearanceStatusCard key={summary.enrolled_id} summary={summary} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blood" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsBloodTestFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Blood Test
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <BloodTestTable 
              bloodTests={bloodTests} 
              onEdit={handleEditBloodTest} 
              onRefresh={loadData} 
            />
          )}
        </TabsContent>

        <TabsContent value="medical" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Medical exams management coming soon...
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Documents management coming soon...
          </div>
        </TabsContent>
      </Tabs>

      {/* Blood Test Form */}
      <BloodTestForm
        eventId={eventId}
        enrolledList={enrolledList}
        bloodTest={editingBloodTest}
        open={isBloodTestFormOpen}
        onOpenChange={handleBloodTestFormClose}
        onSuccess={loadData}
      />
    </div>
  );
}
```

### File: `src/app/(dashboard)/events/[eventId]/batches/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, LayoutGrid, Scale, Users, CheckCircle } from 'lucide-react';
import { BatchCard } from '@/components/batches/batch-card';
import { BatchForm } from '@/components/batches/batch-form';
import { BatchAssignment } from '@/components/batches/batch-assignment';
import { BatchTimeline } from '@/components/batches/batch-timeline';
import { Batch, BatchFilters, BatchType, BATCH_TYPE_LABELS } from '@/types/batch';
import { getEventBatches, getBatchById, getBatchTimeline, getBatchStats } from '@/lib/services/batch-service';

export default function BatchesPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [timeline, setTimeline] = useState<{ date: string; batches: Batch[] }[]>([]);
  const [filters, setFilters] = useState<BatchFilters>({});
  const [stats, setStats] = useState({
    total: 0,
    by_type: {} as Record<BatchType, number>,
    by_status: {} as Record<string, number>,
    total_participants: 0,
    checked_in: 0,
    completed: 0,
  });
  
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [assignmentBatch, setAssignmentBatch] = useState<Batch | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesData, timelineData, statsData] = await Promise.all([
        getEventBatches(eventId, filters),
        getBatchTimeline(eventId),
        getBatchStats(eventId),
      ]);
      setBatches(batchesData);
      setTimeline(timelineData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBatchClick = async (batchId: string) => {
    const batch = await getBatchById(batchId);
    if (batch) {
      setAssignmentBatch(batch);
    }
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBatch(null);
  };

  const handleAssignmentClose = () => {
    setAssignmentBatch(null);
  };

  const batchTypes = Object.entries(BATCH_TYPE_LABELS) as [BatchType, string][];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground">Organize participants into scheduled batches</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.total_participants}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.checked_in}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select
            value={filters.batch_type || 'all'}
            onValueChange={(v) => setFilters({ ...filters, batch_type: v === 'all' ? undefined : v as BatchType })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {batchTypes.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'timeline')}>
          <TabsList>
            <TabsTrigger value="grid" className="flex items-center gap-1">
              <LayoutGrid className="h-4 w-4" />Grid
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />Timeline
            </TabsTrigger>
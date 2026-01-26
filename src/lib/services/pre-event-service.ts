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

function getClient() {
  return createClient();
}

// ==================== BLOOD TESTS ====================

export async function getEventBloodTests(eventId: string): Promise<BloodTest[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
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
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_blood_tests')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
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
  const supabase = getClient();
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

  if (error) {
    console.error('Create blood test error:', error);
    throw new Error('Failed to create blood test');
  }

  // Update clearance status
  await updateClearanceStatus(eventId, formData.enrolled_id);

  return data;
}

export async function updateBloodTest(testId: string, formData: Partial<BloodTestFormData>): Promise<BloodTest> {
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_medical_exams')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
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
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_medical_exams')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
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
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_required_documents')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
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
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_required_documents')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
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
  const supabase = getClient();
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
  const supabase = getClient();
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



  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
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

  if (error) {
    console.error('Update clearance error:', error);
    throw new Error('Failed to update clearance status');
  }

  return data;
}

export async function grantClearance(
  eventId: string,
  enrolledId: string,
  clearedBy: string
): Promise<PreEventClearance> {
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
  // Get all enrolled for event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
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
      .maybeSingle();

    const bt = bloodTests || [];
    const me = medicalExams || [];
    const docs = documents || [];

    summaries.push({
      enrolled_id: e.id,
      person_name: (Array.isArray(e.person) ? e.person[0] : e.person).full_name,
      role: (Array.isArray(e.person) ? e.person[0] : e.person).role,
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

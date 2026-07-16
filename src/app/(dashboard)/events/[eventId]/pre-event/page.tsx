'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Droplet, Stethoscope, FileText, Users, Plane, AlertTriangle, RotateCw } from 'lucide-react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PreEventSummaryStats } from '@/components/pre-event/pre-event-summary';
import { ClearanceStatusCard } from '@/components/pre-event/clearance-status-card';
import { BloodTestTable } from '@/components/pre-event/blood-test-table';
import { BloodTestForm } from '@/components/pre-event/blood-test-form';
import { MedicalExamTable } from '@/components/pre-event/medical-exam-table';
import { MedicalExamForm } from '@/components/pre-event/medical-exam-form';
import { DocumentsTable } from '@/components/pre-event/documents-table';
import { DocumentForm } from '@/components/pre-event/document-form';
import { BloodTest, MedicalExam, RequiredDocument, PreEventSummary, LogisticsRow } from '@/types/pre-event';
import { LogisticsTable } from '@/components/pre-event/logistics-table';
import { EventCar } from '@/types/transport';
import { 
  getEventBloodTests, 
  getEventMedicalExams, 
  getEventDocuments, 
  getPreEventSummary,
  getPreEventStats,
  getLogisticsOverview
} from '@/lib/services/pre-event-service';
import { getEventCars } from '@/lib/services/transport-service';

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
  const [logisticsData, setLogisticsData] = useState<LogisticsRow[]>([]);
  const [eventCars, setEventCars] = useState<EventCar[]>([]);

  const [enrolledList, setEnrolledList] = useState<Array<{ id: string; person: { compiled_name: string } }>>([]);
  
  // Blood Test state
  const [editingBloodTest, setEditingBloodTest] = useState<BloodTest | null>(null);
  const [isBloodTestFormOpen, setIsBloodTestFormOpen] = useState(false);
  
  // Medical Exam state
  const [editingMedicalExam, setEditingMedicalExam] = useState<MedicalExam | null>(null);
  const [isMedicalExamFormOpen, setIsMedicalExamFormOpen] = useState(false);
  
  // Document state
  const [editingDocument, setEditingDocument] = useState<RequiredDocument | null>(null);
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [failedSections, setFailedSections] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFailedSections([]);

    // allSettled, not all: transport is known-fragile (it queries a consolidated
    // table family). Under Promise.all a single transport rejection discarded all
    // seven results and the page rendered convincingly EMPTY during fight week.
    const [
      bloodTestsRes,
      medicalExamsRes,
      documentsRes,
      summariesRes,
      statsRes,
      logisticsRes,
      carsRes,
    ] = await Promise.allSettled([
      getEventBloodTests(eventId),
      getEventMedicalExams(eventId),
      getEventDocuments(eventId),
      getPreEventSummary(eventId),
      getPreEventStats(eventId),
      getLogisticsOverview(eventId),
      getEventCars(eventId),
    ]);

    const failures: string[] = [];
    const record = (label: string, reason: unknown) => {
      console.error(`Failed to load pre-event section "${label}":`, reason);
      failures.push(label);
    };

    if (bloodTestsRes.status === 'fulfilled') setBloodTests(bloodTestsRes.value);
    else record('blood tests', bloodTestsRes.reason);

    if (medicalExamsRes.status === 'fulfilled') setMedicalExams(medicalExamsRes.value);
    else record('medical exams', medicalExamsRes.reason);

    if (documentsRes.status === 'fulfilled') setDocuments(documentsRes.value);
    else record('documents', documentsRes.reason);

    if (summariesRes.status === 'fulfilled') {
      setSummaries(summariesRes.value);
      // Build enrolled list from summaries
      setEnrolledList(
        summariesRes.value.map((s) => ({
          id: s.enrolled_id,
          person: { compiled_name: s.person_name },
        }))
      );
    } else {
      record('clearance summary', summariesRes.reason);
    }

    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    else record('summary stats', statsRes.reason);

    if (logisticsRes.status === 'fulfilled') setLogisticsData(logisticsRes.value);
    else record('logistics', logisticsRes.reason);

    if (carsRes.status === 'fulfilled') setEventCars(carsRes.value);
    else record('transport', carsRes.reason);

    setFailedSections(failures);
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Blood Test handlers
  const handleEditBloodTest = (test: BloodTest) => {
    setEditingBloodTest(test);
    setIsBloodTestFormOpen(true);
  };

  const handleBloodTestFormClose = () => {
    setIsBloodTestFormOpen(false);
    setEditingBloodTest(null);
  };

  // Medical Exam handlers
  const handleEditMedicalExam = (exam: MedicalExam) => {
    setEditingMedicalExam(exam);
    setIsMedicalExamFormOpen(true);
  };

  const handleMedicalExamFormClose = () => {
    setIsMedicalExamFormOpen(false);
    setEditingMedicalExam(null);
  };

  // Document handlers
  const handleEditDocument = (doc: RequiredDocument) => {
    setEditingDocument(doc);
    setIsDocumentFormOpen(true);
  };

  const handleDocumentFormClose = () => {
    setIsDocumentFormOpen(false);
    setEditingDocument(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <DashboardHeader
        title="Pre-Event Requirements"
        description="Manage blood tests, medical exams, and documents"
      />

      <div className="flex-1 px-6 pb-6 space-y-6">
      {/* A partial load must announce itself — a silent empty table during fight
          week is indistinguishable from "nothing is scheduled". */}
      {failedSections.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-status-critical/40 bg-status-critical/10 px-4 py-3"
        >
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-status-critical mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Some sections failed to load
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {failedSections.join(', ')} — data shown below may be incomplete.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-7 shrink-0"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Summary Stats */}
      <PreEventSummaryStats stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />Overview
          </TabsTrigger>
          <TabsTrigger value="logistics" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />Logistics & Readiness
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
              {summaries.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  No participants found for this event
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logistics" className="mt-4">
           {isLoading ? (
             <div className="text-center py-8">Loading...</div>
           ) : (
             <LogisticsTable 
               data={logisticsData} 
               cars={eventCars} 
               eventId={eventId} 
               onRefresh={loadData} 
             />
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
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsMedicalExamFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Medical Exam
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <MedicalExamTable 
              medicalExams={medicalExams} 
              onEdit={handleEditMedicalExam} 
              onRefresh={loadData} 
            />
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsDocumentFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Document
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <DocumentsTable 
              documents={documents} 
              onEdit={handleEditDocument} 
              onRefresh={loadData} 
            />
          )}
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

      {/* Medical Exam Form */}
      <MedicalExamForm
        eventId={eventId}
        enrolledList={enrolledList}
        medicalExam={editingMedicalExam}
        open={isMedicalExamFormOpen}
        onOpenChange={handleMedicalExamFormClose}
        onSuccess={loadData}
      />

      {/* Document Form */}
      <DocumentForm
        eventId={eventId}
        enrolledList={enrolledList}
        document={editingDocument}
        open={isDocumentFormOpen}
        onOpenChange={handleDocumentFormClose}
        onSuccess={loadData}
      />
      </div>
    </div>
  );
}

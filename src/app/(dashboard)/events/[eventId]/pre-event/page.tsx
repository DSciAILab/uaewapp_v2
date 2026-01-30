'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Droplet, Stethoscope, FileText, Users, Plane } from 'lucide-react';
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

  const [enrolledList, setEnrolledList] = useState<Array<{ id: string; person: { full_name: string } }>>([]);
  
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bloodTestsData, medicalExamsData, documentsData, summariesData, statsData, logisticsOverview, carsData] = await Promise.all([
        getEventBloodTests(eventId),
        getEventMedicalExams(eventId),
        getEventDocuments(eventId),
        getPreEventSummary(eventId),
        getPreEventStats(eventId),
        getLogisticsOverview(eventId),
        getEventCars(eventId)
      ]);
      
      setBloodTests(bloodTestsData);
      setMedicalExams(medicalExamsData);
      setDocuments(documentsData);
      setSummaries(summariesData);
      setStats(statsData);
      setLogisticsData(logisticsOverview);
      setEventCars(carsData);

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
  );
}

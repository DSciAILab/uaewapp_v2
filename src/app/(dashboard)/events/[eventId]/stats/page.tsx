'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Printer, Loader2 } from 'lucide-react';
import { StatsTable } from '@/components/stats/stats-table';
import { StatsForm } from '@/components/stats/stats-form';
import { CoachStatsForm } from '@/components/operations/coach-stats-form';
import { StatsCard } from '@/components/stats/stats-card';
import { StatsHistory } from '@/components/stats/stats-history';
import { UniformsTab } from '@/components/stats/uniforms-tab';
import { FighterStats, EventWeighIn, CoachData } from '@/types/stats';
import { getEventFighterStats, getEventWeighIns, getEventCoachData, importStatsFromCSV, setStatsConfirmed, formatHeight, formatReach, type StatsCSVRow } from '@/lib/services/stats-service';
import { useUser } from '@/hooks/use-user';
import { getEventById } from '@/lib/services/events';
import { getFightCardPositions } from '@/lib/services/fight-card-positions';
import { flagFor } from '@/lib/countries';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown';
import { GenericCSVImport, type FieldDef } from '@/components/shared/generic-csv-import';

const STATS_FIELDS: FieldDef[] = [
  { value: 'passport_name', label: 'Passport Name' },
  { value: 'weight_class', label: 'Weight Class' },
  { value: 'weight_kg', label: 'Weight (kg)' },
  { value: 'residency', label: 'Residency' },
  { value: 'height_cm', label: 'Height (cm)' },
  { value: 'reach_cm', label: 'Reach (cm)' },
  { value: 'fighting_style', label: 'Fighting Style' },
  { value: 'team_gym', label: 'Team/Gym' },
  { value: 'wins', label: 'Wins' },
  { value: 'losses', label: 'Losses' },
  { value: 'draws', label: 'Draws' },
  { value: 'corner', label: 'Corner' },
  { value: 'uniform_size', label: 'Uniform' },
  { value: 'shoe_size', label: 'Shoe Size' },
  { value: 'tshirt_size', label: 'T-shirt' },
  { value: 'shorts_size', label: 'Shorts' },
];

export default function StatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [stats, setStats] = useState<FighterStats[]>([]);
  const [editingStats, setEditingStats] = useState<FighterStats | null>(null);
  
  const [coachStats, setCoachStats] = useState<CoachData[]>([]);
  const [editingCoach, setEditingCoach] = useState<CoachData | null>(null);
  
  const [activeTab, setActiveTab] = useState('list');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weighIns, setWeighIns] = useState<EventWeighIn[]>([]);
  const [isLoadingWeighIns, setIsLoadingWeighIns] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel fetch
      const [fighterData, coachData] = await Promise.all([
        getEventFighterStats(eventId),
        getEventCoachData(eventId)
      ]);
      setStats(fighterData);
      setCoachStats(coachData);
      getEventById(eventId).then((e) => setEventName(e?.name ?? '')).catch(() => {});
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const loadWeighIns = useCallback(async () => {
    setIsLoadingWeighIns(true);
    try {
      const data = await getEventWeighIns(eventId);
      setWeighIns(data);
    } catch (error) {
      console.error('Failed to load weigh-ins:', error);
    } finally {
      setIsLoadingWeighIns(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadWeighIns();
    }
  }, [activeTab, loadWeighIns]);

  // Optimistic — the row tints instantly; the DB write catches up.
  const handleToggleConfirm = async (s: FighterStats, confirmed: boolean) => {
    setStats((prev) => prev.map((r) => (r.id === s.id ? { ...r, confirmed_at: confirmed ? new Date().toISOString() : null } : r)));
    try {
      await setStatsConfirmed(s.id, confirmed, user?.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
      loadData();
    }
  };

  // Landscape sheet the staff prints, updates on paper, then confirms in the app.
  const handlePrint = async () => {
    setPrinting(true);
    try {
      const positions = await getFightCardPositions(
        eventId,
        filteredStats.filter((s) => s.enrollment_id).map((s) => ({
          enrollmentId: s.enrollment_id!,
          fullName: s.person?.compiled_name ?? '',
          ringName: s.person?.event_name ?? null,
        }))
      );
      const ordered = [...filteredStats].sort((a, b) => {
        const oa = (a.enrollment_id ? positions.get(a.enrollment_id)?.fightOrder : null) ?? a.matchNumber ?? 999;
        const ob = (b.enrollment_id ? positions.get(b.enrollment_id)?.fightOrder : null) ?? b.matchNumber ?? 999;
        return oa - ob;
      });

      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      doc.setFontSize(15);
      doc.text(`${eventName || 'Event'} — Fighter Stats`, 14, 14);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 14, 20);

      autoTable(doc, {
        startY: 26,
        head: [['#', 'Done', 'Fighter', 'ID', 'Nationality', 'Residency', 'Weight', 'Height', 'Reach', 'Style', 'Team']],
        body: ordered.map((s) => {
          const pos = s.enrollment_id ? positions.get(s.enrollment_id) : undefined;
          return [
            String(pos?.fightOrder ?? s.matchNumber ?? '-'),
            s.confirmed_at ? 'X' : '',
            s.person?.event_name || s.person?.compiled_name || '',
            s.person?.appadmin_fighter_id || '',
            s.person?.nationality || '',
            s.residency || '',
            s.weight_kg ? `${s.weight_kg} kg` : '',
            s.height_cm ? formatHeight(s.height_cm) : '',
            s.reach_cm ? formatReach(s.reach_cm) : '',
            s.fighting_style || '',
            s.team_gym || '',
          ];
        }),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [38, 38, 38], textColor: 255, fontSize: 8 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 12, halign: 'center' } },
        // Blank cells to write on: the whole point is updating on paper.
        didParseCell: (data) => { if (data.section === 'body' && data.cell.text.join('') === '') data.cell.text = ['']; },
      });
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`fighter-stats-${(eventName || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build the PDF');
    } finally {
      setPrinting(false);
    }
  };

  const handleEdit = (s: FighterStats) => {
    setEditingStats(s);
    setEditingCoach(null);
    setIsFormOpen(true);
  };
  
  const handleEditCoach = (c: CoachData) => {
    setEditingCoach(c);
    setEditingStats(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingStats(null);
    setEditingCoach(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [eventName, setEventName] = useState('');
  const [printing, setPrinting] = useState(false);
  const { user } = useUser();

  const filteredStats = stats.filter(s => {
    if (!searchQuery.trim()) return true;
    const terms = searchQuery.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (terms.length === 0) return true;

    return terms.some(term => {
      const nameMatch = s.person?.compiled_name?.toLowerCase().includes(term);
      const nicknameMatch = s.nickname?.toLowerCase().includes(term);
      const weightMatch = s.weight_class?.toLowerCase().includes(term);
      const teamMatch = s.team_gym?.toLowerCase().includes(term);
      return nameMatch || nicknameMatch || weightMatch || teamMatch;
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Statistics</h1>
          <p className="text-muted-foreground">Manage stats, uniforms, and physical data for athletes and coaches</p>
        </div>
        <div className="flex gap-2">
          <CSVImportDropdown
            onImportClick={() => setCsvOpen(true)}
            onTemplateDownload={() => downloadCSVTemplate('stats_import_template.csv', 'Passport Name,Weight Class,Weight (kg),Residency,Height (cm),Reach (cm),Fighting Style,Team Gym,Wins,Losses,Draws,Corner,Uniform Size,Shoe Size\nJohn Doe,welterweight,77.5,Dubai UAE,180,185,Boxing,Team Alpha,15,3,1,RED,L,42\n')}
          />
          {activeTab !== 'history' && activeTab !== 'uniforms' && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
              <TabsList>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="list">Athletes</TabsTrigger>
            <TabsTrigger value="uniforms">Uniforms</TabsTrigger>
            <TabsTrigger value="coaches">Coaches</TabsTrigger>
            <TabsTrigger value="history">Weight History</TabsTrigger>
          </TabsList>

          {activeTab === 'list' && (
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search athletes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={handlePrint} disabled={printing || filteredStats.length === 0}>
                {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Print
              </Button>
            </div>
          )}

          {activeTab === 'uniforms' && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, or corner (use commas)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}

          {activeTab === 'coaches' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coaches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
        </div>

        <TabsContent value="list" className="mt-0">
          {isLoading ? (
            <div className="text-center py-8">Loading stats...</div>
          ) : viewMode === 'table' ? (
            <StatsTable stats={filteredStats} eventId={eventId} onEdit={handleEdit} onToggleConfirm={handleToggleConfirm} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStats.map((s) => (
                <div key={s.id} className="cursor-pointer" onClick={() => handleEdit(s)}>
                  <StatsCard stats={s} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="uniforms" className="mt-0">
           <UniformsTab eventId={eventId} externalSearchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="coaches" className="mt-0">
           {isLoading ? (
            <div className="text-center py-8">Loading coach data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coachStats.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground">No coach data found</div>}
              {coachStats
                .filter(c => {
                  if (!searchQuery.trim()) return true;
                  const terms = searchQuery.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
                  if (terms.length === 0) return true;

                  return terms.some(term => {
                    const nameMatch = c.person?.compiled_name?.toLowerCase().includes(term);
                    const nationalityMatch = c.person?.nationality?.toLowerCase().includes(term);
                    const uniformMatch = c.uniform_size?.toLowerCase().includes(term);
                    return nameMatch || nationalityMatch || uniformMatch;
                  });
                })
                .map((c) => (
                <Card key={c.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleEditCoach(c)}>
                  <CardHeader>
                    <CardTitle>{c.person?.compiled_name}</CardTitle>
                    <CardDescription>{c.person?.nationality}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                       <p><span className="font-medium">Uniform:</span> {c.uniform_size || '-'}</p>
                       <p><span className="font-medium">Shoes:</span> {c.shoe_size || '-'}</p>
                       <p><span className="font-medium">Height:</span> {c.height_cm ? `${c.height_cm}cm` : '-'}</p>
                       <p><span className="font-medium">Weight:</span> {c.weight_kg ? `${c.weight_kg}kg` : '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <StatsHistory eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Dialog/Sheet would be better here but reusing existing pattern if it's a modal */}
      {/* Assuming StatsForm is a wrapper around AthleteStatsForm in a Dialog */}
      
      {isFormOpen && editingStats && (
        <StatsForm
          personId={editingStats.person_id}
          personName={editingStats.person?.compiled_name || ''}
          stats={editingStats}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSuccess={loadData}
        />
      )}
      
      {isFormOpen && editingCoach && (
         <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Edit Coach: {editingCoach.person?.compiled_name}</DialogTitle>
             </DialogHeader>
             <CoachStatsForm 
                personId={editingCoach.person_id}
                initialData={editingCoach}
                onSuccess={() => {
                  loadData();
                  handleFormClose();
                }}
             />
           </DialogContent>
         </Dialog>
      )}

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 border-none bg-transparent gap-0">
          <div className="bg-background rounded-lg border shadow-2xl flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
              <GenericCSVImport
                title="Import Stats via CSV"
                subtitle="Fighter Statistics"
                fields={STATS_FIELDS}
                requiredField="passport_name"
                showUpsert={false}
                onImport={(rows, _upsert, progress) => importStatsFromCSV(eventId, rows as any, progress)}
                onComplete={() => { setCsvOpen(false); loadData(); }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

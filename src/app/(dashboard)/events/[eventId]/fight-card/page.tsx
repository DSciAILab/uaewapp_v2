'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Swords, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getEventById } from '@/lib/services/events';
import { getEventFighterStats } from '@/lib/services/stats-service';
import { getFighterPhotoUrl, normalizeName, getDataUrl } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FighterCSV {
  matchNumber: number;
  event: string;
  corner: 'RED' | 'BLUE';
  division: string;
  name: string;
  nickname: string;
  record: string;
  nationality: string;
  residency: string;
}

interface MatchPair {
  matchNumber: number;
  division: string;
  red?: FighterCSV & { photoUrl?: string; eventValues?: string };
  blue?: FighterCSV & { photoUrl?: string; eventValues?: string };
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8I30mTm8ZyuBttmebz9wv-41TIZ-8HzHiLEYcEhXD2Y5JXCn7AD3aDmOIBpYSp-9tMF7F7obDdQsw/pub?gid=1830739607&single=true&output=csv';

export default function FightCardPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [matches, setMatches] = useState<MatchPair[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const [eventData, fightersData, csvText] = await Promise.all([
          getEventById(eventId),
          getEventFighterStats(eventId),
          fetch(CSV_URL).then(r => r.text())
        ]);

        setEvent(eventData);

        // Parse CSV
        const rows = csvText.split('\n').slice(1); // Skip header
        const parsedRows: FighterCSV[] = rows.map(row => {
            // Simple split handling comma inside quotes if needed, 
            // but for this specific sheet structure simple split mostly works unless commas in names.
            // Let's use a slightly more robust regex for CSV split if needed, 
            // but standard split is usually okay for this specific data source format shown in prompt.
            // Using a simple regex to handle quoted fields just in case.
            const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(col => col.replace(/^"(.*)"$/, '$1')) || [];
            
            return {
                matchNumber: parseInt(cols[0]) || 0,
                event: cols[1],
                corner: cols[2] as 'RED' | 'BLUE',
                division: cols[3],
                name: cols[4],
                nickname: cols[5],
                record: cols[6],
                nationality: cols[7],
                residency: cols[8]
            };
        }).filter(r => r.name); // Filter empty rows

        // Identify Photos
        const matchesMap = new Map<number, MatchPair>();

        parsedRows.forEach(row => {
            if (!row.matchNumber) return;

            if (!matchesMap.has(row.matchNumber)) {
                matchesMap.set(row.matchNumber, { 
                    matchNumber: row.matchNumber, 
                    division: row.division 
                });
            }

            const match = matchesMap.get(row.matchNumber)!;
            
            // Find stats for photo
            // Normalize names for comparison
            const fighterStats = fightersData.find(f => {
                const pName = normalizeName(f.person?.full_name || '');
                const cName = normalizeName(row.name);
                // Exact match or partial match logic if needed
                return pName === cName || pName.includes(cName) || cName.includes(pName);
            });

            const enrichedFighter = {
                ...row,
                photoUrl: fighterStats?.person ? getFighterPhotoUrl((fighterStats.person as any).fighter_id) : '',
                eventValues: (fighterStats?.person as any)?.event_name ? `${(fighterStats.person as any).event_name} ${(fighterStats.person as any).fighter_id}` : ''
            };

            if (row.corner === 'RED') {
                match.red = enrichedFighter;
            } else {
                match.blue = enrichedFighter;
            }
        });

        // Convert map to array and sort
        const matchesArray = Array.from(matchesMap.values()).sort((a, b) => a.matchNumber - b.matchNumber);
        setMatches(matchesArray);

      } catch (e) {
        console.error(e);
        toast.error('Failed to load fight card data');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [eventId]);

  const handleExportPDF = async () => {
     try {
         const doc = new jsPDF();
         const loadingToast = toast.loading('Generating Fight Card PDF...');
 
         doc.setFontSize(22);
         doc.setTextColor(40, 40, 40);
         const title = event ? `Fight Card - ${event.name}` : 'Fight Card';
         doc.text(title, 14, 20);
         
         doc.setFontSize(10);
         doc.setTextColor(100);
         doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 26);
 
         // 1. Pre-fetch images
         const photoMap = new Map<string, string>(); // url -> base64
 
         const matchesToProcess = [...matches];
         const imageUrls = matchesToProcess.flatMap(m => [m.red?.photoUrl, m.blue?.photoUrl]).filter(Boolean) as string[];
 
         // Deduplicate
         const uniqueUrls = Array.from(new Set(imageUrls));
 
         await Promise.all(uniqueUrls.map(async (url) => {
             const base64 = await getDataUrl(url);
             if (base64) {
                 photoMap.set(url, base64);
             }
         }));
 
         // 2. Prepare table data
         const tableData: any[] = [];
 
         for (const m of matches) {
             tableData.push([
                 m.matchNumber,
                 '', // Red Photo Placeholder
                 { content: m.red?.name || 'TBA', styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }, // Red Name
                 m.division,
                 { content: m.blue?.name || 'TBA', styles: { fontStyle: 'bold', textColor: [37, 99, 235] } }, // Blue Name
                 ''  // Blue Photo Placeholder
             ]);
         }
 
         autoTable(doc, {
             head: [['#', '', 'Red Corner', 'Division', 'Blue Corner', '']],
             body: tableData,
             startY: 35,
             styles: { 
                 fontSize: 10, 
                 cellPadding: 3, 
                 valign: 'middle', 
                 halign: 'center',
                 minCellHeight: 25 
             },
             columnStyles: {
                 0: { cellWidth: 15, fontStyle: 'bold' },
                 1: { cellWidth: 25 }, // Red Photo
                 2: { halign: 'left' }, // Red Name
                 3: { cellWidth: 40, fontStyle: 'italic', textColor: [100, 100, 100] },
                 4: { halign: 'right' }, // Blue Name
                 5: { cellWidth: 25 } // Blue Photo
             },
             headStyles: { fillColor: [30, 41, 59] },
             didDrawCell: (data) => {
                 if (data.section === 'body') {
                     const match = matches[data.row.index];
                     
                     // Red Corner Photo (Col 1)
                     if (data.column.index === 1 && match.red?.photoUrl) {
                         const base64 = photoMap.get(match.red.photoUrl);
                         if (base64) {
                             const dim = data.cell.height - 4;
                             const x = data.cell.x + (data.cell.width - dim) / 2;
                             const y = data.cell.y + 2;
                             try {
                                 doc.addImage(base64, 'JPEG', x, y, dim, dim);
                             } catch (e) {
                                 // ignore invalid images
                             }
                         }
                     }
 
                     // Blue Corner Photo (Col 5)
                     if (data.column.index === 5 && match.blue?.photoUrl) {
                         const base64 = photoMap.get(match.blue.photoUrl);
                         if (base64) {
                             const dim = data.cell.height - 4;
                             const x = data.cell.x + (data.cell.width - dim) / 2;
                             const y = data.cell.y + 2;
                             try {
                                 doc.addImage(base64, 'JPEG', x, y, dim, dim);
                             } catch (e) {
                                 // ignore invalid images
                             }
                         }
                     }
                 }
             }
         });
 
         doc.save(`fight-card-${eventId}.pdf`);
         toast.dismiss(loadingToast);
         toast.success('PDF Downloaded');
 
     } catch (error) {
         console.error(error);
         toast.error('Failed to generate PDF');
     }
  };

  if (loading) {
     return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header 
            title="Fight Card" 
            description={event?.name || 'Event Fight Card'}
        >
             <Button variant="ghost" size="sm" onClick={() => router.push(`/events/${eventId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
             </Button>
             <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
             </Button>
        </Header>

        <main className="flex-1 p-6 max-w-[1200px] mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Official Fight Card</h2>
                <Badge variant="outline" className="px-3 py-1 text-sm bg-background">
                    {matches.length} Bouts
                </Badge>
            </div>

            <div className="space-y-4">
                {matches.map((match) => (
                    <Card key={match.matchNumber} className="overflow-hidden border-muted/60 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                            {/* Desktop View */}
                            <div className="flex flex-col md:flex-row items-stretch min-h-[140px]">
                                
                                {/* Red Corner */}
                                <div className="flex-1 bg-gradient-to-r from-red-500/10 to-transparent p-4 flex items-center justify-start gap-4 border-b md:border-b-0 md:border-r border-muted/50">
                                    <div className="relative">
                                        <div className="absolute -inset-1 rounded-full bg-red-500/20 blur-sm"></div>
                                        <Avatar className="h-20 w-20 border-2 border-red-500/50 shadow-sm relative">
                                            <AvatarImage src={match.red?.photoUrl} className="object-cover" />
                                            <AvatarFallback className="text-lg font-bold bg-background text-red-600">
                                                {match.red?.name?.substring(0,2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">
                                                {match.red?.name}
                                            </span>
                                            {match.red?.record && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground">
                                                    {match.red.record}
                                                </Badge>
                                            )}
                                        </div>
                                        {match.red?.nickname && (
                                            <span className="text-sm font-medium text-red-600/80 italic -mt-1 mb-1">
                                                "{match.red.nickname}"
                                            </span>
                                        )}
                                        <div className="flex flex-col gap-0.5 mt-auto">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span className="font-semibold text-slate-600 dark:text-slate-400">NPC:</span> 
                                                {match.red?.nationality || 'N/A'}
                                            </span>
                                            {match.red?.eventValues && (
                                                 <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded-sm w-fit">
                                                    {match.red.eventValues}
                                                 </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* VS / Info */}
                                <div className="w-full md:w-[140px] flex flex-col justify-center items-center py-2 bg-slate-100/50 dark:bg-slate-900/50">
                                    <Badge className="mb-2 bg-slate-800 hover:bg-slate-900 border-none text-white text-[10px] px-2">
                                        BOUT {match.matchNumber} {match.matchNumber === matches.length ? ' • MAIN EVENT' : ''}
                                    </Badge>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-background border shadow-sm mb-2">
                                        <Swords className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs font-bold text-center text-muted-foreground uppercase px-2">
                                        {match.division}
                                    </span>
                                </div>

                                {/* Blue Corner */}
                                <div className="flex-1 bg-gradient-to-l from-blue-500/10 to-transparent p-4 flex items-center justify-end gap-4 flex-row-reverse border-t md:border-t-0 md:border-l border-muted/50">
                                    <div className="relative">
                                        <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-sm"></div>
                                        <Avatar className="h-20 w-20 border-2 border-blue-500/50 shadow-sm relative">
                                            <AvatarImage src={match.blue?.photoUrl} className="object-cover" />
                                            <AvatarFallback className="text-lg font-bold bg-background text-blue-600">
                                                {match.blue?.name?.substring(0,2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <div className="flex items-center gap-2 flex-row-reverse">
                                            <span className="text-2xl font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">
                                                {match.blue?.name}
                                            </span>
                                            {match.blue?.record && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground">
                                                    {match.blue.record}
                                                </Badge>
                                            )}
                                        </div>
                                        {match.blue?.nickname && (
                                            <span className="text-sm font-medium text-blue-600/80 italic -mt-1 mb-1">
                                                "{match.blue.nickname}"
                                            </span>
                                        )}
                                        <div className="flex flex-col gap-0.5 mt-auto items-end">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-row-reverse">
                                                <span className="font-semibold text-slate-600 dark:text-slate-400">NPC:</span> 
                                                {match.blue?.nationality || 'N/A'}
                                            </span>
                                             {match.blue?.eventValues && (
                                                 <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded-sm w-fit">
                                                    {match.blue.eventValues}
                                                 </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                ))}

                {matches.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        No matches found in the fight card data.
                    </div>
                )}
            </div>
        </main>
    </div>
  );
}

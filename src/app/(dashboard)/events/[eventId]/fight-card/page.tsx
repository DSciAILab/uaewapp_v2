'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Swords, Download, FileText, RefreshCw, Database } from 'lucide-react';
import { getEventById } from '@/lib/services/events';
import { getEventFighterStats } from '@/lib/services/stats-service';
import { getEventMatches, syncFightCardToDatabase } from '@/lib/services/matches-service';
import { getFighterPhotoUrl, normalizeName, getDataUrl } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import Papa from 'papaparse';

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const GLOVE_SIZES = ['S', 'M', 'L', 'XL'];

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
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [matches, setMatches] = useState<MatchPair[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFromDB, setIsFromDB] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function init() {
      try {
        const [eventData, fightersData, dbMatches] = await Promise.all([
          getEventById(eventId),
          getEventFighterStats(eventId),
          getEventMatches(eventId)
        ]);

        setEvent(eventData);

        if (dbMatches && dbMatches.length > 0) {
            const mappedMatches = dbMatches.map(m => {
               const red = m.red_corner;
               const blue = m.blue_corner;

               const createFighterUI = (cornerData: any, cornerLabel: 'RED' | 'BLUE'): (FighterCSV & { photoUrl?: string; eventValues?: string }) | undefined => {
                  if (!cornerData) return undefined;
                  const p = cornerData.person;
                  const stArray = p?.stats;
                  const st = Array.isArray(stArray) && stArray.length > 0 ? stArray[0] : null;
                  return {
                      matchNumber: m.match_number,
                      event: eventData?.code || '',
                      corner: cornerLabel,
                      division: m.division || '',
                      name: p?.compiled_name || '',
                      nickname: st?.nickname || '',
                      record: st ? `${st.wins}-${st.losses}${st.draws > 0 ? `-${st.draws}` : ''}${st.no_contests > 0 ? ` (${st.no_contests} NC)` : ''}` : '',
                      nationality: p?.nationality || '',
                      residency: st?.residency || '',
                      photoUrl: p ? getFighterPhotoUrl(p.appadmin_fighter_id) : '',
                      eventValues: p ? `${p.event_name ?? ''} ${p.appadmin_fighter_id ?? ''}`.trim() : ''
                  };
               };

               return {
                  matchNumber: m.match_number,
                  division: m.division || '',
                  red: createFighterUI(red, 'RED'),
                  blue: createFighterUI(blue, 'BLUE')
               };
            });
            setMatches(mappedMatches);
            setIsFromDB(true);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        setIsFromDB(false);
        // Add cache buster to avoid stale data
        const baseUrl = eventData?.fight_card_csv_url || CSV_URL;
        const targetUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        
        if (!targetUrl) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        const csvText = await fetch(targetUrl).then(r => r.text());

        // Parse CSV with PapaParse
        const { data: rawData } = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
        });

        const parsedRows: FighterCSV[] = (rawData as any[]).map(row => {
            // Map header names to our interface
            return {
                matchNumber: row['#'] || 0,
                event: row['EVENT'],
                corner: row['CORNER'] as 'RED' | 'BLUE',
                division: row['DIVISION'],
                name: row['NAME'],
                nickname: row['NICKNAME'],
                record: row['RECORD'],
                nationality: row['NATIONALITY'],
                residency: row['RESIDENCY']
            };
        }).filter(r => 
            r.name && 
            r.event?.toString().toUpperCase() === eventData?.code?.toUpperCase()
        );

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
                const pName = normalizeName(f.person?.compiled_name || '');
                const eName = normalizeName(f.person?.event_name || '');
                const cName = normalizeName(row.name);
                
                return pName === cName || 
                       eName === cName || 
                       pName.includes(cName) || 
                       cName.includes(pName) ||
                       eName.includes(cName) ||
                       cName.includes(eName);
            });

            const person = fighterStats?.person as any;
            const enrichedFighter = {
                ...row,
                photoUrl: person ? getFighterPhotoUrl(person.appadmin_fighter_id) : '',
                eventValues: person 
                  ? `${person.event_name ?? ''} ${person.appadmin_fighter_id ?? ''}`.trim()
                  : ''
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
        setRefreshing(false);
      }
    }

    init();

    // Fetch every 30 seconds for dynamic updates
    intervalId = setInterval(init, 30000);

    return () => clearInterval(intervalId);
  }, [eventId, refreshKey]);

  const handleSyncToDatabase = async () => {
      try {
          if (!confirm('Deseja salvar o estado atual do Fight Card no Banco de Dados? Isso fará a tela não ler mais o Google Sheets.')) return;
          
          setSyncing(true);
          const count = await syncFightCardToDatabase(eventId);
          toast.success(`Sincronizado histórico de ${count} lutas com sucesso.`);
          setRefreshKey(prev => prev + 1);
      } catch (err: any) {
          toast.error(err.message || 'Falha ao sincronizar');
          console.error(err);
      } finally {
          setSyncing(false);
      }
  };

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
                 { content: m.red?.name || 'TBA', styles: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'right' } }, // Red Name
                 '', // Red Photo Placeholder
                 m.division,
                 '',  // Blue Photo Placeholder
                 { content: m.blue?.name || 'TBA', styles: { fontStyle: 'bold', textColor: [37, 99, 235], halign: 'left' } } // Blue Name
             ]);
         }
 
         autoTable(doc, {
             head: [['#', 'Red Corner', '', 'Division', '', 'Blue Corner']],
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
                 1: { halign: 'right' }, // Red Name
                 2: { cellWidth: 25 }, // Red Photo
                 3: { cellWidth: 40, fontStyle: 'italic', textColor: [100, 100, 100] },
                 4: { cellWidth: 25 }, // Blue Photo
                 5: { halign: 'left' } // Blue Name
             },
             headStyles: { fillColor: [30, 41, 59] },
             didDrawCell: (data) => {
                 if (data.section === 'body') {
                     const match = matches[data.row.index];
                     if (!match) return;
                     
                     // Red Corner Photo (Col 2 -> index 2)
                     if (data.column.index === 2 && match.red?.photoUrl) {
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
 
                     // Blue Corner Photo (Col 4 -> index 4)
                     if (data.column.index === 4 && match.blue?.photoUrl) {
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

  const handleDownloadCollectionTemplate = async () => {
    if (matches.length === 0) {
        toast.error('No matches to export');
        return;
    }

    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    const title = event ? `COLLECTION TEMPLATE - ${event.name}` : 'UNIFORM COLLECTION TEMPLATE';
    doc.text(title, 14, 15);
    
    doc.setFontSize(8);
    const totalFighters = matches.length * 2;
    doc.text(`Generated: ${new Date().toLocaleString()} | ${matches.length} matches | ${totalFighters} Fighters`, 14, 20);

    // Flatten matches to fighters list
    const fightersToExport: any[] = [];
    matches.forEach(m => {
        if (m.red) fightersToExport.push(m.red);
        if (m.blue) fightersToExport.push(m.blue);
    });

    const tableData = fightersToExport.map(f => [
        f.matchNumber || '-',
        f.name || '-',
        f.corner || '-',
        CLOTHING_SIZES.map(s => `${s} [ ]`).join('  '), // T-Shirt
        CLOTHING_SIZES.map(s => `${s} [ ]`).join('  '), // Shorts
        GLOVE_SIZES.map(s => `${s} [ ]`).join('  '),    // Gloves
        CLOTHING_SIZES.slice(1, -2).map(s => `${s} [ ]`).join('  ') // Coach (Simplified)
    ]);

    autoTable(doc, {
        head: [['#', 'Fighter', 'Crn', 'T-Shirt Sizes', 'Shorts Sizes', 'Gloves', 'Coach Size']],
        body: tableData,
        startY: 25,
        styles: { fontSize: 7, cellPadding: 2, minCellHeight: 10, valign: 'middle' },
        headStyles: { fillColor: [51, 65, 85] },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 70 },
            4: { cellWidth: 70 },
            5: { cellWidth: 35 },
            6: { cellWidth: 40 }
        }
    });

    const filename = `collection-template-${event?.name || 'uniforms'}.pdf`.toLowerCase().replace(/\s+/g, '-');
    doc.save(filename);
    toast.success('Collection template generated');
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
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                    setRefreshing(true);
                    setRefreshKey(prev => prev + 1);
                    toast.info('Refreshing fight card...');
                }} 
                disabled={refreshing}
                className="animate-in fade-in slide-in-from-right-2 duration-500"
             >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Force Refresh'}
             </Button>
             {!isFromDB && (
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncToDatabase} 
                    disabled={syncing || loading}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                 >
                    <Database className={`mr-2 h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Gravar no Banco'}
                 </Button>
             )}
              <Button variant="outline" size="sm" onClick={handleDownloadCollectionTemplate} className="bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/50">
                 <FileText className="mr-2 h-4 w-4 text-slate-500" />
                 Collection Template
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                 <Download className="mr-2 h-4 w-4" />
                 Export PDF
              </Button>
        </Header>

        <main className="flex-1 p-6 max-w-[1200px] mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight">Official Fight Card</h2>
                    {isFromDB ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                            Banco de Dados
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                            Google Sheets
                        </Badge>
                    )}
                </div>
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
                                <div className="flex-1 bg-gradient-to-r from-red-500/10 to-transparent p-4 flex items-center justify-end gap-4 border-b md:border-b-0 md:border-r border-muted/50">
                                    <div className="flex flex-col items-end text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            {match.red?.record && (
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground">
                                                    {match.red.record}
                                                </Badge>
                                            )}
                                            <span className="text-2xl font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">
                                                {match.red?.name}
                                            </span>
                                        </div>
                                        {match.red?.nickname && (
                                            <span className="text-sm font-medium text-red-600/80 italic -mt-1 mb-1">
                                                "{match.red.nickname}"
                                            </span>
                                        )}
                                        <div className="flex flex-col gap-0.5 mt-auto items-end">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
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
                                    <div className="relative">
                                        <div className="absolute -inset-1 rounded-full bg-red-500/20 blur-sm"></div>
                                        <Avatar className="h-20 w-20 border-2 border-red-500/50 shadow-sm relative">
                                            <AvatarImage src={match.red?.photoUrl} className="object-cover" />
                                            <AvatarFallback className="text-lg font-bold bg-background text-red-600">
                                                {match.red?.name?.substring(0,2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
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
                                <div className="flex-1 bg-gradient-to-l from-blue-500/10 to-transparent p-4 flex items-center justify-start gap-4 border-t md:border-t-0 md:border-l border-muted/50">
                                    <div className="relative">
                                        <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-sm"></div>
                                        <Avatar className="h-20 w-20 border-2 border-blue-500/50 shadow-sm relative">
                                            <AvatarImage src={match.blue?.photoUrl} className="object-cover" />
                                            <AvatarFallback className="text-lg font-bold bg-background text-blue-600">
                                                {match.blue?.name?.substring(0,2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <div className="flex items-center gap-2">
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
                                        <div className="flex flex-col gap-0.5 mt-auto items-start">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
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

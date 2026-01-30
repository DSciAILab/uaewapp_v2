'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, Search, X, ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { getEventFighterStats, upsertFighterStats, getFightCardData } from '@/lib/services/stats-service';
import { getEventById } from '@/lib/services/events';
import { updateEnrollmentCorner } from '@/lib/services/enrollments';
import { getFighterPhotoUrl, getDataUrl, normalizeName, getDisplayName, cn } from '@/lib/utils';
import type { FighterStats } from '@/types/stats';
import type { Event } from '@/types/database';

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const GLOVE_SIZES = ['S', 'M', 'L', 'XL']; 
const CORNERS = ['Red', 'Blue']; 

interface UniformsTabProps {
  eventId: string;
  externalSearchQuery?: string;
}

export function UniformsTab({ eventId, externalSearchQuery }: UniformsTabProps) {
  const [fighters, setFighters] = useState<FighterStats[]>([]);
  const [eventData, setEventData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  // Sync internal search with external search
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredFighters = fighters.filter(f => {
    if (!searchQuery.trim()) return true;
    
    const terms = searchQuery.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (terms.length === 0) return true;

    return terms.some(term => {
      const nameMatch = getDisplayName(f.person || {}).toLowerCase().includes(term);
      const idMatch = (f.person as any)?.fighter_id?.toString().toLowerCase().includes(term);
      const weightMatch = f.weight_class?.toLowerCase().includes(term);
      const cornerMatch = f.corner?.toLowerCase().includes(term);
      const eventMatch = f.person?.event_name?.toLowerCase().includes(term);
      
      return nameMatch || idMatch || weightMatch || cornerMatch || eventMatch;
    });
  });

  const sortedFighters = [...filteredFighters].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = '';
    let bValue: any = '';

    // Handle nested person properties
    if (sortConfig.key === 'fighter_id') {
      aValue = (a.person as any)?.fighter_id || '';
      bValue = (b.person as any)?.fighter_id || '';
    } else if (sortConfig.key === 'matchNumber') {
      aValue = (a as any).matchNumber || 999;
      bValue = (b as any).matchNumber || 999;
    } else if (sortConfig.key === 'name') {
      aValue = a.person?.full_name || '';
      bValue = b.person?.full_name || '';
    } else {
      // Direct properties
      aValue = (a as any)[sortConfig.key] || '';
      bValue = (b as any)[sortConfig.key] || '';
    }

    // Convert to string for consistent comparison if not number
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, event, fightCard] = await Promise.all([
        getEventFighterStats(eventId),
        getEventById(eventId),
        getFightCardData()
      ]);

      // Cross-reference corners
      const enrichedFighters = data.map((f: FighterStats) => {
        // Only auto-fill if corner is null
        if (!f.corner) {
          const match = fightCard.find((c: any) => {
            const pName = normalizeName(f.person?.full_name || '');
            const cName = normalizeName(c.name);
            return pName === cName || pName.includes(cName) || cName.includes(pName);
          });
          
          if (match) {
            return { 
              ...f, 
              corner: (match.corner.charAt(0).toUpperCase() + match.corner.slice(1).toLowerCase()) as any,
              matchNumber: match.matchNumber,
              _auto_corner: true // Internal flag for UI hint
            } as FighterStats & { _auto_corner?: boolean; matchNumber?: number };
          }
        }
        return f;
      });

      setFighters(enrichedFighters);
      setEventData(event);
    } catch (error) {
      toast.error('Failed to load fighter data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (personId: string, currentStats: FighterStats, field: keyof FighterStats, value: string) => {
     const key = `${personId}_${String(field)}`;
     setSavingState(prev => ({ ...prev, [key]: true }));
     try {
        if (field === 'corner') {
            await updateEnrollmentCorner(eventId, personId, value);
        } else {
            await upsertFighterStats(personId, {
                ...currentStats,
                [field]: value
            } as any);
        }
        
        setFighters(prev => prev.map(f => {
            if (f.person_id === personId) {
                return { 
                    ...f, 
                    [field]: value,
                    updated_at: new Date().toISOString()
                };
            }
            return f;
        }));
        toast.success('Saved');
     } catch (err) {
        toast.error('Failed to save');
     } finally {
        setSavingState(prev => ({ ...prev, [key]: false }));
     }
  };

  const generatePDF = async () => {
    // Capture the current visible list to ensure consistency
    const fightersToExport = [...sortedFighters];
    if (fightersToExport.length === 0) {
        toast.error('No fighters to export');
        return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    const title = eventData ? `Uniforms - ${eventData.name}` : 'Uniforms and Equipment Report';
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

    const loadingToast = toast.loading('Generating PDF with photos...');

    try {
        // 1. Prepare table data and pre-fetch images
        const photoMap = new Map<string, string>(); // person_id -> base64

        await Promise.all(fightersToExport.map(async (f) => {
            const fighterId = (f.person as any)?.fighter_id;
            const photoUrl = getFighterPhotoUrl(fighterId);
            if (photoUrl) {
                const base64 = await getDataUrl(photoUrl);
                if (base64) {
                    photoMap.set(f.person_id, base64);
                }
            }
        }));

        // 2. Add Summary Sections to PDF
        let currentY = 32;
        const summaryRows: any[] = [];
        ['Red', 'Blue'].forEach(corner => {
            const counts: Record<string, number> = {};
            const cornerLower = corner.toLowerCase();
            fightersToExport.forEach(f => {
                if (f.corner?.toLowerCase() === cornerLower) {
                    [f.tshirt_size, f.coach1_size, f.coach2_size, f.coach3_size].forEach(size => {
                        if (size && size !== 'none') {
                            counts[size] = (counts[size] || 0) + 1;
                        }
                    });
                }
            });

            const rowData = CLOTHING_SIZES.filter(s => counts[s] > 0).map(s => `${s}: ${counts[s]}`).join('   |   ');
            if (rowData) {
                summaryRows.push([
                    { 
                        content: `${corner.toUpperCase()} CORNER`, 
                        styles: { 
                            fontStyle: 'bold', 
                            textColor: cornerLower === 'red' ? [185, 28, 28] : [29, 78, 216],
                            fillColor: cornerLower === 'red' ? [254, 242, 242] : [239, 246, 255]
                        } 
                    },
                    { 
                        content: rowData,
                        styles: {
                            fillColor: cornerLower === 'red' ? [254, 242, 242] : [239, 246, 255]
                        }
                    }
                ]);
            }
        });

        if (summaryRows.length > 0) {
            autoTable(doc, {
                body: summaryRows,
                startY: currentY,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 35 } },
                margin: { left: 14, right: 14 }
            });
            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 8;
        }

        // 3. Prepare and add main table
        const tableData = fightersToExport.map(f => [
            '', // Placeholder for Photo
            (f.person as any)?.fighter_id || '-',
            getDisplayName(f.person || {}),
            f.corner || '-',
            f.tshirt_size || '-',
            f.shorts_size || '-',
            f.jacket_size || '-',
            f.gloves_size || '-',
            f.coach1_size || '-',
            f.coach2_size || '-',
            f.coach3_size || '-'
        ]);

        autoTable(doc, {
            head: [['Photo', 'ID', 'Fighter', 'Corner', 'T-Shirt', 'Shorts', 'Jacket', 'Gloves', 'Coach 1', 'Coach 2', 'Coach 3']],
            body: tableData,
            startY: currentY,
            styles: { fontSize: 8, minCellHeight: 15, valign: 'middle' },
            headStyles: { fillColor: [41, 128, 185] },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 0) {
                    const fighter = fightersToExport[data.row.index];
                    if (!fighter) return;

                    const base64 = photoMap.get(fighter.person_id);
                    if (base64) {
                         try {
                             doc.addImage(base64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 11, 11);
                         } catch (e) {
                             console.warn('Failed to add image to PDF', e);
                         }
                    }
                }
            }
        });

        doc.save('uniforms-report.pdf');
    toast.success('PDF Generated successfully');
  } catch (err) {
    console.error('PDF Generation error:', err);
    toast.error('Failed to generate PDF');
  } finally {
    toast.dismiss(loadingToast);
  }
};

  const generateCollectionPDF = async () => {
    const fightersToExport = [...sortedFighters];
    if (fightersToExport.length === 0) {
        toast.error('No fighters to export');
        return;
    }

    const loadingToast = toast.loading('Generating Template with photos...');

    try {
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        
        // Pre-fetch photos
        const photoMap = new Map<string, string>(); // person_id -> base64
        await Promise.all(fightersToExport.map(async (f) => {
            const fighterId = (f.person as any)?.fighter_id;
            const photoUrl = getFighterPhotoUrl(fighterId);
            if (photoUrl) {
                const base64 = await getDataUrl(photoUrl);
                if (base64) {
                    photoMap.set(f.person_id, base64);
                }
            }
        }));

        doc.setFontSize(16);
        const title = eventData ? `COLLECTION TEMPLATE - ${eventData.name}` : 'UNIFORM COLLECTION TEMPLATE';
        doc.text(title, 14, 15);
        
        doc.setFontSize(8);
        doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${fightersToExport.length} Fighters`, 14, 20);

        const clothingSizesStr = CLOTHING_SIZES.join('    ');
        const gloveSizesStr = GLOVE_SIZES.join('    ');

        const tableData = fightersToExport.map(f => [
            '', // Photo
            (f as any).matchNumber || '-',
            `${getDisplayName(f.person || {})} \n(${f.corner || '-'})`,
            clothingSizesStr, // T-Shirt
            clothingSizesStr, // Shorts
            gloveSizesStr,    // Gloves
            clothingSizesStr, // Coach 1
            clothingSizesStr, // Coach 2
            clothingSizesStr  // Coach 3
        ]);

        autoTable(doc, {
            head: [['Photo', '#', 'Fighter', 'T-Shirt', 'Shorts', 'Gloves', 'Coach 1', 'Coach 2', 'Coach 3']],
            body: tableData,
            startY: 25,
            theme: 'grid',
            styles: { 
                fontSize: 7, 
                cellPadding: 1, 
                minCellHeight: 20, 
                valign: 'middle', 
                halign: 'center',
                lineWidth: 0.1,
                lineColor: [200, 200, 200]
            },
            headStyles: { 
                fillColor: [51, 65, 85], 
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 12 },
                2: { cellWidth: 40, halign: 'left' },
                3: { cellWidth: 32 },
                4: { cellWidth: 32 },
                5: { cellWidth: 25 },
                6: { cellWidth: 32 },
                7: { cellWidth: 32 },
                8: { cellWidth: 32 }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 0) {
                    const fighter = fightersToExport[data.row.index];
                    if (!fighter) return;

                    const base64 = photoMap.get(fighter.person_id);
                    if (base64) {
                         try {
                             // Center image in the cell
                             const imgSize = 18;
                             const x = data.cell.x + (data.cell.width - imgSize) / 2;
                             const y = data.cell.y + (data.cell.height - imgSize) / 2;
                             doc.addImage(base64, 'JPEG', x, y, imgSize, imgSize);
                         } catch (e) {
                             console.warn('Failed to add image to PDF', e);
                         }
                    }
                }
            }
        });

        const filename = `collection-template-${eventData?.name || 'uniforms'}.pdf`.toLowerCase().replace(/\s+/g, '-');
        doc.save(filename);
        toast.success('Collection template generated');
    } catch (err) {
        console.error('Template Generation error:', err);
        toast.error('Failed to generate template');
    } finally {
        toast.dismiss(loadingToast);
    }
  };

  if (loading) return <div className="text-center py-8">Loading uniform data...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 gap-4">
         <div className="flex-1">
             <h2 className="text-xl font-semibold tracking-tight">Uniform Management</h2>
             <p className="text-muted-foreground text-sm">
               Track uniform sizes for fighters and their coaches.
             </p>
         </div>
         <div className="flex items-center gap-2">
            <Button onClick={generateCollectionPDF} variant="outline" size="sm" className="gap-2 h-9 bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/50">
                <FileText className="w-4 h-4 text-slate-500" />
                Download Template
            </Button>
            <Button onClick={generatePDF} variant="outline" size="sm" className="gap-2 h-9">
                <Download className="w-4 h-4" />
                Export Results
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {['Red', 'Blue'].map(corner => {
              const cornerLower = corner.toLowerCase();
              const counts = fighters.reduce((acc, f) => {
                  if (f.corner?.toLowerCase() === cornerLower) {
                      [f.tshirt_size, f.coach1_size, f.coach2_size, f.coach3_size].forEach(size => {
                          if (size && size !== 'none') {
                              acc[size] = (acc[size] || 0) + 1;
                          }
                      });
                  }
                  return acc;
              }, {} as Record<string, number>);

              const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

              if (totalCount === 0) return null;

              return (
                  <Card key={corner} className={cn(
                      "border-none shadow-sm overflow-hidden",
                      cornerLower === 'red' ? "bg-red-50/50 dark:bg-red-950/10" : "bg-blue-50/50 dark:bg-blue-950/10"
                  )}>
                      <div className={cn(
                          "px-4 py-2 flex items-center justify-between border-b",
                          cornerLower === 'red' ? "bg-red-500/10 border-red-200/50" : "bg-blue-500/10 border-blue-200/50"
                      )}>
                          <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", cornerLower === 'red' ? "bg-red-500" : "bg-blue-600")} />
                              <span className="text-xs font-bold uppercase tracking-wider">{corner} Corner Summary</span>
                          </div>
                          <Badge variant="outline" className="bg-background/50 border-none font-mono text-[10px]">
                              Total: {totalCount} items
                          </Badge>
                      </div>
                      <CardContent className="p-4">
                          <div className="flex flex-wrap gap-2">
                              {CLOTHING_SIZES.map(size => {
                                  const count = counts[size] || 0;
                                  if (count === 0) return null;
                                  return (
                                      <div key={size} className="flex flex-col items-center min-w-[45px] p-2 rounded-md bg-background/60 shadow-xs border border-muted/20">
                                          <span className="text-[10px] text-muted-foreground font-medium uppercase">{size}</span>
                                          <span className="text-sm font-bold">{count}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </CardContent>
                  </Card>
              );
          })}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
             <TableRow>
               <TableHead className="w-12 px-4"></TableHead>
               <TableHead className="w-[80px]">Foto</TableHead>
               <SortableHeader label="Luta #" sortKey="matchNumber" currentSort={sortConfig} onSort={handleSort} className="w-[80px]" />
               <SortableHeader label="Fighter ID" sortKey="fighter_id" currentSort={sortConfig} onSort={handleSort} />
               <SortableHeader label="Nome" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
               <SortableHeader label="Corner" sortKey="corner" currentSort={sortConfig} onSort={handleSort} className="text-center" />
               <SortableHeader label="T-Shirt" sortKey="tshirt_size" currentSort={sortConfig} onSort={handleSort} className="text-center" />
               <SortableHeader label="Shorts" sortKey="shorts_size" currentSort={sortConfig} onSort={handleSort} className="text-center" />
               <SortableHeader label="Jacket" sortKey="jacket_size" currentSort={sortConfig} onSort={handleSort} className="text-center" />
               <SortableHeader label="Gloves" sortKey="gloves_size" currentSort={sortConfig} onSort={handleSort} className="text-center" />
               <SortableHeader label="C1 Size" sortKey="coach1_size" currentSort={sortConfig} onSort={handleSort} className="text-center border-l bg-muted/30" />
               <SortableHeader label="C2 Size" sortKey="coach2_size" currentSort={sortConfig} onSort={handleSort} className="text-center bg-muted/30" />
               <SortableHeader label="C3 Size" sortKey="coach3_size" currentSort={sortConfig} onSort={handleSort} className="text-center bg-muted/30" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFighters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                    {searchQuery ? 'No results found matching your search.' : 'No fighters enrolled.'}
                  </TableCell>
                </TableRow>
            )}
            
            {sortedFighters.map((fighter) => (
              <TableRow key={fighter.person_id} className="hover:bg-muted/50">
                <TableCell className="w-12 px-4">
                     <div className="h-4 w-4 rounded-sm border border-primary/20" /> 
                </TableCell>
                <TableCell>
                  <Avatar className="h-10 w-10 border border-muted shadow-sm">
                       <AvatarImage src={getFighterPhotoUrl(fighter.person?.fighter_id)} />
                       <AvatarFallback className="text-xs font-bold bg-muted/50">
                           {(fighter.person?.event_name || fighter.person?.full_name || '??').substring(0,2).toUpperCase()}
                       </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black">
                        {(fighter as any).matchNumber || '-'}
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] bg-background w-fit">
                        {fighter.person?.fighter_id || '-'}
                    </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">
                        {getDisplayName(fighter.person || {})}
                    </span>
                    <div className="text-[10px] text-muted-foreground italic mt-0.5">
                      {fighter.weight_class ? fighter.weight_class.replace(/_/g, ' ') : '-'}
                    </div>
                  </div>
                </TableCell>

                {/* Corner Selection */}
                <TableCell className="p-1">
                    <div className="flex flex-col gap-1 items-center px-2">
                        {fighter.corner ? (
                            <Badge className={cn(
                                "text-[10px] h-5 px-2 py-0 border-none font-black uppercase text-white shadow-sm min-w-[60px] justify-center",
                                fighter.corner.toLowerCase() === 'red' ? "bg-red-500" : "bg-blue-600"
                            )}>
                                {fighter.corner}
                            </Badge>
                        ) : (
                            <div className="h-5 w-[60px] rounded-full bg-muted/20 border border-muted/30 flex items-center justify-center opacity-40">
                                <span className="text-[9px] text-muted-foreground font-medium uppercase">None</span>
                            </div>
                        )}
                    </div>
                </TableCell>
                 
                 {/* Fighter Uniforms */}
                 <TableCell className="p-1">
                    <SelectWrapper 
                       value={fighter.tshirt_size} 
                       options={CLOTHING_SIZES} 
                       placeholder="-"
                       onChange={(v) => saveField(fighter.person_id, fighter, 'tshirt_size', v)}
                    />
                </TableCell>
                <TableCell className="p-1">
                   <SelectWrapper 
                      value={fighter.shorts_size} 
                      options={CLOTHING_SIZES} 
                      placeholder="-"
                      onChange={(v) => saveField(fighter.person_id, fighter, 'shorts_size', v)}
                   />
                </TableCell>
                <TableCell className="p-1">
                   <SelectWrapper 
                      value={fighter.jacket_size} 
                      options={CLOTHING_SIZES} 
                      placeholder="-"
                      onChange={(v) => saveField(fighter.person_id, fighter, 'jacket_size', v)}
                   />
                </TableCell>
                <TableCell className="p-1">
                   <SelectWrapper 
                      value={fighter.gloves_size} 
                      options={GLOVE_SIZES} 
                      placeholder="-"
                      onChange={(v) => saveField(fighter.person_id, fighter, 'gloves_size', v)}
                   />
                </TableCell>

                {/* Coach Sizes */}
                <TableCell className="p-1 border-l bg-muted/10">
                   <SelectWrapper 
                      value={fighter.coach1_size} 
                      options={CLOTHING_SIZES} 
                      placeholder="-"
                      onChange={(v) => saveField(fighter.person_id, fighter, 'coach1_size', v)}
                   />
                </TableCell>
                <TableCell className="p-1 bg-muted/10">
                   <SelectWrapper 
                      value={fighter.coach2_size} 
                      options={CLOTHING_SIZES} 
                      placeholder="-"
                      onChange={(v) => saveField(fighter.person_id, fighter, 'coach2_size', v)}
                   />
                </TableCell>
                <TableCell className="p-1 bg-muted/10">
                   <SelectWrapper 
                      value={fighter.coach3_size} 
                      options={CLOTHING_SIZES} 
                      placeholder="-"
                      onChange={(v) => saveField(fighter.person_id, fighter, 'coach3_size', v)}
                   />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SelectWrapper({ value, options, placeholder, onChange }: { value: string | null | undefined, options: string[], placeholder: string, onChange: (v: string) => void }) {
    const isEmpty = !value || value === 'none';
    
    return (
        <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
            <SelectTrigger className={cn(
                "h-7 w-full min-w-[50px] text-[10px] px-1 font-medium transition-all duration-200",
                isEmpty ? "bg-muted/10 border-muted/20 text-muted-foreground/40 opacity-50 hover:opacity-100 hover:bg-muted/20" : "bg-background border-input text-foreground font-bold",
                value?.toLowerCase() === 'red' && "border-red-200 text-red-600 bg-red-50/30",
                value?.toLowerCase() === 'blue' && "border-blue-200 text-blue-600 bg-blue-50/30"
            )}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none" className="text-[10px] text-muted-foreground italic">None / Reset</SelectItem>
                {options.map(s => <SelectItem key={s} value={s} className="text-[10px]">{s}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}
function SortableHeader({ label, sortKey, currentSort, onSort, className }: { 
    label: string, 
    sortKey: string, 
    currentSort: { key: string, direction: 'asc' | 'desc' } | null, 
    onSort: (key: string) => void,
    className?: string
}) {
    const isActive = currentSort?.key === sortKey;
    const Icon = isActive ? (currentSort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <TableHead 
            className={cn("cursor-pointer hover:bg-muted/50 transition-colors group whitespace-nowrap", className)}
            onClick={() => onSort(sortKey)}
        >
            <div className={cn("flex items-center gap-1", className?.includes('text-center') && "justify-center")}>
                {label}
                <Icon className={cn(
                    "h-3 w-3 transition-colors", 
                    isActive ? "text-primary" : "text-muted-foreground/30 group-hover:text-muted-foreground"
                )} />
            </div>
        </TableHead>
    );
}

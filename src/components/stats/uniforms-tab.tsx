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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { getEventFighterStats, upsertFighterStats } from '@/lib/services/stats-service';
import { getEventById } from '@/lib/services/events';
import { getFighterPhotoUrl, getDataUrl } from '@/lib/utils';
import type { FighterStats } from '@/types/stats';
import type { Event } from '@/types/database';

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const GLOVE_SIZES = ['S', 'M', 'L', 'XL']; 
const CORNERS = ['Red', 'Blue']; 

interface UniformsTabProps {
  eventId: string;
}

export function UniformsTab({ eventId }: UniformsTabProps) {
  const [fighters, setFighters] = useState<FighterStats[]>([]);
  const [eventData, setEventData] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFighters = [...fighters].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = '';
    let bValue: any = '';

    // Handle nested person properties
    if (sortConfig.key === 'fighter_id') {
      aValue = (a.person as any)?.fighter_id || '';
      bValue = (b.person as any)?.fighter_id || '';
    } else if (sortConfig.key === 'name') {
      aValue = a.person?.full_name || '';
      bValue = b.person?.full_name || '';
    } else {
      // Direct properties
      aValue = (a as any)[sortConfig.key] || '';
      bValue = (b as any)[sortConfig.key] || '';
    }

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
      const [data, event] = await Promise.all([
        getEventFighterStats(eventId),
        getEventById(eventId)
      ]);
      setFighters(data);
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
        await upsertFighterStats(personId, {
            ...currentStats,
            [field]: value
        } as any);
        
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
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    const title = eventData ? `Uniforms - ${eventData.name}` : 'Uniforms and Equipment Report';
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

    const loadingToast = toast.loading('Generating PDF with photos...');

    // 1. Prepare table data
    const tableData: any[] = [];
    const photoMap = new Map<string, string>(); // fighterId -> base64

    // 2. Pre-fetch images
    await Promise.all(fighters.map(async (f) => {
        const fighterId = (f.person as any)?.fighter_id;
        const photoUrl = getFighterPhotoUrl(fighterId);
        if (photoUrl) {
            const base64 = await getDataUrl(photoUrl);
            if (base64) {
                photoMap.set(f.person_id, base64);
            }
        }
    }));

    for (const f of fighters) {
        // Prepare row data
        tableData.push([
            '', // Placeholder for Photo
            (f.person as any)?.fighter_id || '-',
            f.person?.full_name || 'Unknown',
            f.corner || '-',
            f.tshirt_size || '-',
            f.shorts_size || '-',
            f.jacket_size || '-',
            f.gloves_size || '-',
            f.coach1_size || '-',
            f.coach2_size || '-',
            f.coach3_size || '-'
        ]);
    }

    autoTable(doc, {
        head: [['Photo', 'ID', 'Fighter', 'Corner', 'T-Shirt', 'Shorts', 'Jacket', 'Gloves', 'Coach 1', 'Coach 2', 'Coach 3']],
        body: tableData,
        startY: 32,
        styles: { fontSize: 8, minCellHeight: 15, valign: 'middle' },
        headStyles: { fillColor: [41, 128, 185] },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
                // Get fighter for this row
                const fighter = fighters[data.row.index];
                const base64 = photoMap.get(fighter.person_id);
                
                if (base64) {
                     try {
                         doc.addImage(base64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 10, 10);
                     } catch (e) {
                         // invalid image
                         console.warn('Failed to add image to PDF', e);
                     }
                }
            }
        }
    });

    doc.save('uniforms-report.pdf');
    toast.dismiss(loadingToast);
    toast.success('PDF Generated successfully');
  };

  if (loading) return <div className="text-center py-8">Loading uniform data...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
         <div>
             <h2 className="text-xl font-semibold tracking-tight">Uniform Management</h2>
             <p className="text-muted-foreground text-sm">
               Track uniform sizes for fighters and their coaches.
             </p>
         </div>
         <Button onClick={generatePDF} variant="outline" className="gap-2">
             <Download className="w-4 h-4" />
             Export PDF
         </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
             <TableRow>
               <TableHead className="w-12 px-4"></TableHead> {/* Empty header for checkboxes visual alignment if requested, though functionality isn't there yet. Let's strictly follow the image provided by user which shows checkboxes. */}
               <TableHead className="w-[80px]">Foto</TableHead>
               <TableHead className="w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('fighter_id')}>
                 Fighter ID {sortConfig?.key === 'fighter_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="w-[200px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                 Nome {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[80px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('corner')}>
                 Corner {sortConfig?.key === 'corner' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('tshirt_size')}>
                 T-Shirt {sortConfig?.key === 'tshirt_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('shorts_size')}>
                 Shorts {sortConfig?.key === 'shorts_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('jacket_size')}>
                 Jacket {sortConfig?.key === 'jacket_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('gloves_size')}>
                 Gloves {sortConfig?.key === 'gloves_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] border-l bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('coach1_size')}>
                 C1 Size {sortConfig?.key === 'coach1_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('coach2_size')}>
                 C2 Size {sortConfig?.key === 'coach2_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
               <TableHead className="text-center w-[70px] bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('coach3_size')}>
                 C3 Size {sortConfig?.key === 'coach3_size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
               </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fighters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                    No fighters enrolled.
                  </TableCell>
                </TableRow>
            )}
            
            {sortedFighters.map((fighter) => (
              <TableRow key={fighter.person_id} className="hover:bg-muted/50">
                <TableCell className="w-12 px-4">
                     {/* Placeholder checkbox to match the look. Logic can be added later if bulk actions are needed here. */}
                     <div className="h-4 w-4 rounded-sm border border-primary/20" /> 
                </TableCell>
                <TableCell>
                  <Avatar className="h-10 w-10 border border-muted shadow-sm">
                       <AvatarImage src={getFighterPhotoUrl(fighter.person?.fighter_id)} />
                       <AvatarFallback className="text-xs font-bold bg-muted/50">
                           {fighter.person?.full_name?.substring(0,2).toUpperCase()}
                       </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] bg-background w-fit">
                        {fighter.person?.fighter_id || '-'}
                    </Badge>
                </TableCell>
                 <TableCell className="font-medium">
                   <div>
                     {fighter.person?.full_name}
                     {fighter.person?.event_name && (
                       <span className="text-muted-foreground ml-1">({fighter.person.event_name})</span>
                     )}
                   </div>
                   <div className="text-xs text-muted-foreground italic truncate max-w-[120px]">
                     {fighter.weight_class ? fighter.weight_class.replace(/_/g, ' ') : '-'}
                   </div>
                   {fighter.updated_at && (
                       <div className="text-[10px] text-muted-foreground/70 mt-1">
                           Updated: {new Date(fighter.updated_at).toLocaleDateString()} {new Date(fighter.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </div>
                   )}
                 </TableCell>

                 {/* Corner Selection */}
                 <TableCell className="p-1">
                    <SelectWrapper 
                       value={fighter.corner} 
                       options={CORNERS} 
                       placeholder="-"
                       onChange={(v) => saveField(fighter.person_id, fighter, 'corner', v)}
                    />
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
    return (
        <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-full min-w-[50px] text-xs px-1">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

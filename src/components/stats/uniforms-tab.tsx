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
import { Input } from '@/components/ui/input';
import { Download, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { getEventFighterStats, upsertFighterStats, getFightCardData } from '@/lib/services/stats-service';
import { getEventById } from '@/lib/services/events';
import { getFighterPhotoUrl, getDataUrl, normalizeName, cn } from '@/lib/utils';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

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
      const nameMatch = f.person?.full_name?.toLowerCase().includes(term);
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
              _auto_corner: true // Internal flag for UI hint
            } as FighterStats & { _auto_corner?: boolean };
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
      <div className="flex justify-between items-center mb-4 gap-4">
         <div className="flex-1">
             <h2 className="text-xl font-semibold tracking-tight">Uniform Management</h2>
             <p className="text-muted-foreground text-sm">
               Track uniform sizes for fighters and their coaches.
             </p>
         </div>
         <div className="flex items-center gap-2">
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search name, ID, corner..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            <Button onClick={generatePDF} variant="outline" size="sm" className="gap-2 h-9">
                <Download className="w-4 h-4" />
                Export PDF
            </Button>
         </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
             <TableRow>
               <TableHead className="w-12 px-4"></TableHead>
               <TableHead className="w-[80px]">Foto</TableHead>
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
                    <Badge variant="outline" className="font-mono text-[10px] bg-background w-fit">
                        {fighter.person?.fighter_id || '-'}
                    </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">
                        {fighter.person?.event_name || fighter.person?.full_name}
                    </span>
                    {fighter.person?.event_name && fighter.person.full_name && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {fighter.person.full_name}
                        </span>
                    )}
                    <div className="text-[10px] text-muted-foreground italic mt-0.5">
                      {fighter.weight_class ? fighter.weight_class.replace(/_/g, ' ') : '-'}
                    </div>
                  </div>
                </TableCell>

                {/* Corner Selection */}
                <TableCell className="p-1">
                  <div className="flex flex-col gap-1 items-center px-2">
                      <div className="flex items-center gap-1 w-full justify-center">
                          <SelectWrapper 
                             value={fighter.corner} 
                             options={CORNERS} 
                             placeholder="Select"
                             onChange={(v) => saveField(fighter.person_id, fighter, 'corner', v)}
                          />
                      </div>
                      <div className="flex items-center gap-1">
                          {fighter.corner && (
                              <Badge className={cn(
                                  "text-[9px] h-3.5 px-1 py-0 border-none font-black uppercase text-white shadow-sm",
                                  fighter.corner.toLowerCase() === 'red' ? "bg-red-500" : "bg-blue-600"
                              )}>
                                  {fighter.corner}
                              </Badge>
                          )}
                          {(fighter as any)._auto_corner && (
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 leading-none bg-blue-50/50 text-blue-600 border-blue-200 dark:bg-blue-900/20 whitespace-nowrap">
                                  SUGGESTED
                              </Badge>
                          )}
                      </div>
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
    return (
        <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={cn(
                "h-7 w-full min-w-[50px] text-[10px] px-1 font-medium",
                value?.toLowerCase() === 'red' && "border-red-200 text-red-600",
                value?.toLowerCase() === 'blue' && "border-blue-200 text-blue-600"
            )}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
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

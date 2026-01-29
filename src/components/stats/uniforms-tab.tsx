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
import { getFighterPhotoUrl } from '@/lib/utils';
import type { FighterStats } from '@/types/stats';

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const GLOVE_SIZES = ['S', 'M', 'L', 'XL']; 

interface UniformsTabProps {
  eventId: string;
}

export function UniformsTab({ eventId }: UniformsTabProps) {
  const [fighters, setFighters] = useState<FighterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getEventFighterStats(eventId);
      setFighters(data);
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
                return { ...f, [field]: value };
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

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Uniforms and Equipment Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

    const tableData = fighters.map(f => {
        return [
            (f.person as any)?.fighter_id || '-',
            f.person?.full_name || 'Unknown',
            f.tshirt_size || '-',
            f.shorts_size || '-',
            f.jacket_size || '-',
            f.gloves_size || '-',
            f.coach1_size || '-',
            f.coach2_size || '-',
            f.coach3_size || '-'
        ];
    });

    autoTable(doc, {
        head: [['ID', 'Fighter', 'T-Shirt', 'Shorts', 'Jacket', 'Gloves', 'Coach 1', 'Coach 2', 'Coach 3']],
        body: tableData,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save('uniforms-report.pdf');
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
              <TableHead className="w-[100px]">Fighter ID</TableHead> {/* Renamed to match image */}
              <TableHead className="w-[200px]">Nome</TableHead> {/* Renamed to match image */}
              <TableHead className="text-center w-[70px]">T-Shirt</TableHead>
              <TableHead className="text-center w-[70px]">Shorts</TableHead>
              <TableHead className="text-center w-[70px]">Jacket</TableHead>
              <TableHead className="text-center w-[70px]">Gloves</TableHead>
              <TableHead className="text-center w-[70px] border-l bg-muted/30">C1 Size</TableHead>
              <TableHead className="text-center w-[70px] bg-muted/30">C2 Size</TableHead>
              <TableHead className="text-center w-[70px] bg-muted/30">C3 Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fighters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                    No fighters enrolled.
                  </TableCell>
                </TableRow>
            )}
            
            {fighters.map((fighter) => (
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
                        ID: {fighter.person?.fighter_id || '-'}
                    </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div>{fighter.person?.full_name}</div>
                  <div className="text-xs text-muted-foreground italic truncate max-w-[120px]">
                    {fighter.weight_class ? fighter.weight_class.replace(/_/g, ' ') : '-'}
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
            <SelectTrigger className="h-8 w-full min-w-[50px] text-xs px-1">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Bus, Users, CheckCircle2, Circle, Filter, Download, FileText, ArrowUpDown, ArrowUp, ArrowDown, Minus, Plus } from 'lucide-react';
import { StagingRow } from '@/types/staging';
import { updateStagingItem } from '@/lib/services/staging-service';
import { StagingStatusCell } from './staging-status-cell';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, getDataUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StagingTableProps {
  data: StagingRow[];
  eventId: string;
}

const BUS_OPTIONS = [
  'Private',
  ...Array.from({ length: 10 }, (_, i) => `Bus ${i + 1}`)
];

type SortDirection = 'asc' | 'desc';
type SortKey = keyof StagingRow | 'person.compiled_name';

export function StagingTable({ data: initialData, eventId }: StagingTableProps) {
  const [data, setData] = useState<StagingRow[]>(initialData);
  const [search, setSearch] = useState('');
  const [cornerFilter, setCornerFilter] = useState<'ALL' | 'RED' | 'BLUE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'fight_order',
    direction: 'asc'
  });

  // Extract unique events
  const uniqueEvents = Array.from(new Set(data.map(r => r.event_name).filter(Boolean))) as string[];

  // Update Helper
  const handleUpdate = async (enrolledId: string, field: keyof StagingRow, value: any) => {
    // Optimistic update
    setData(prev => prev.map(row => 
      row.enrolled_id === enrolledId 
        ? { ...row, [field]: value } 
        : row
    ));

    try {
      await updateStagingItem(eventId, enrolledId, { [field]: value });
    } catch (error) {
      toast.error('Failed to save update');
      console.error(error);
      // Revert in case of error (optional, but good practice - simplified here for now)
    }
  };

  // Toggle Completion
  const handleToggleComplete = async (enrolledId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic
    setData(prev => prev.map(row => 
      row.enrolled_id === enrolledId 
        ? { ...row, is_completed: newStatus }
        : row
    ));

    try {
        await updateStagingItem(eventId, enrolledId, { is_completed: newStatus });
        if (newStatus) {
            toast.success('Check-in completed');
        }
    } catch (error) {
        toast.error('Failed to update status');
        // Revert?
    }
  };

  // Sort Helper
  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter & Sort Logic
  const filteredData = data.filter(row => {
     // 1. Search
    let matchesSearch = true;
    if (search.trim()) {
      const terms = search.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
      matchesSearch = terms.some(term => {
         return (
            row.person.compiled_name.toLowerCase().includes(term) ||
            row.person.appadmin_fighter_id?.toLowerCase().includes(term) ||
            row.corner?.toLowerCase().includes(term) ||
            row.bus_number?.toLowerCase().includes(term)
         );
      });
    }

    // 2. Corner
    let matchesCorner = true;
    if (cornerFilter !== 'ALL') {
        matchesCorner = row.corner?.toUpperCase() === cornerFilter;
    }

    // 3. Status
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
        matchesStatus = statusFilter === 'DONE' ? row.is_completed : !row.is_completed;
    }

    // 4. Event
    let matchesEvent = true;
    if (eventFilter !== 'ALL') {
        matchesEvent = row.event_name === eventFilter;
    }

    return matchesSearch && matchesCorner && matchesStatus && matchesEvent;
  }).sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue: any;
    let bValue: any;

    if (key === 'person.compiled_name') {
        aValue = a.person.compiled_name;
        bValue = b.person.compiled_name;
    } else {
        aValue = a[key as keyof StagingRow];
        bValue = b[key as keyof StagingRow];
    }

    // Handle nulls
    if (aValue === undefined || aValue === null) aValue = '';
    if (bValue === undefined || bValue === null) bValue = '';

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // PDF Generation
  const generatePDF = async () => {
    const dataToExport = filteredData.length > 0 ? filteredData : data;
    if (dataToExport.length === 0) {
        toast.error('No data to export');
        return;
    }

    const toastId = toast.loading('Generating PDF...');

    try {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        doc.setFontSize(18);
        doc.text('Staging & Bus Check-in Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

        const photoMap = new Map<string, string>();
        await Promise.all(dataToExport.map(async (row) => {
            const photoUrl = row.person.photo_url;
            if (photoUrl) {
                const base64 = await getDataUrl(photoUrl);
                if (base64) photoMap.set(row.enrolled_id, base64);
            }
        }));

        const tableData = dataToExport.map(row => [
            '', // Photo placeholder
            row.fight_order?.toString() || '-',
            `${row.person.compiled_name}\n${row.corner || '-'}`, 
            row.bus_number || '-',
            row.passport_status === 'checked' ? 'OK' : row.passport_status,
            row.nails_status === 'checked' ? 'OK' : row.nails_status,
            row.cup_status === 'checked' ? 'OK' : row.cup_status,
            row.mouthguard_status === 'checked' ? 'OK' : row.mouthguard_status,
            `Creds: ${row.coaches_credentials_given}`,
            row.notes || '-'
        ]);

        autoTable(doc, {
            head: [['Photo', '#', 'Fighter', 'Bus', 'Passport', 'Nails', 'Cup', 'Mouth', 'Coaches', 'Notes']],
            body: tableData,
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 8, valign: 'middle', cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 50 },
                3: { cellWidth: 20 },
                8: { cellWidth: 25 },
                9: { cellWidth: 40 }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 0) {
                    const row = dataToExport[data.row.index];
                    const base64 = photoMap.get(row.enrolled_id);
                    if (base64) {
                        try {
                             const dim = data.cell.height - 2;
                             doc.addImage(base64, 'JPEG', data.cell.x + 1, data.cell.y + 1, dim, dim);
                        } catch (e) { console.warn('Image add failed', e); }
                    }
                }
            }
        });

        doc.save('staging-report.pdf');
        toast.success('PDF Exported');
    } catch (err) {
        console.error(err);
        toast.error('Export failed');
    } finally {
        toast.dismiss(toastId);
    }
  };

  const generateTemplate = async () => {
    const dataToExport = filteredData.length > 0 ? filteredData : data;
    if (dataToExport.length === 0) {
        toast.error('No data to export');
        return;
    }

    const toastId = toast.loading('Generating Template...');

    try {
        const doc = new jsPDF({ orientation: 'landscape' });
        
        doc.setFontSize(18);
        doc.text('Staging Check-in Template', 14, 15);
        doc.setFontSize(10);
        doc.text(`Event ID: ${eventId} | Date: ${new Date().toLocaleDateString()}`, 14, 22);

        const photoMap = new Map<string, string>();
        await Promise.all(dataToExport.map(async (row) => {
            const photoUrl = row.person.photo_url;
            if (photoUrl) {
                const base64 = await getDataUrl(photoUrl);
                if (base64) photoMap.set(row.enrolled_id, base64);
            }
        }));

        const tableData = dataToExport.map(row => [
            '', // Photo
            row.fight_order?.toString() || '-',
            `${row.person.compiled_name}\n${row.corner || '-'}`,
            '', // Bus
            '', // Passport
            '', // Nails
            '', // Cup
            '', // Mouth
            '', // Coaches
            ''  // Notes
        ]);

        autoTable(doc, {
            head: [['Photo', '#', 'Fighter', 'Bus #', 'Passport', 'Nails', 'Cup', 'Mouth', 'Coaches', 'Notes']],
            body: tableData,
            startY: 28,
            theme: 'grid',
            styles: { fontSize: 9, valign: 'middle', minCellHeight: 15 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 60 },
                3: { cellWidth: 20 },
                9: { cellWidth: 40 }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 0) {
                    const row = dataToExport[data.row.index];
                    const base64 = photoMap.get(row.enrolled_id);
                    if (base64) {
                        try {
                             const dim = data.cell.height - 2;
                             doc.addImage(base64, 'JPEG', data.cell.x + 1, data.cell.y + 1, dim, dim);
                        } catch (e) { console.warn('Image add failed', e); }
                    }
                }
            }
        });

        doc.save('staging-template.pdf');
        toast.success('Template Exported');
    } catch (err) {
        console.error(err);
        toast.error('Export failed');
    } finally {
        toast.dismiss(toastId);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
     if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/30" />;
     return sortConfig.direction === 'asc' 
        ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
        : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const renderHeader = (label: string, key: SortKey, className?: string) => (
    <TableHead 
        className={cn("cursor-pointer hover:bg-muted/50 transition-colors select-none", className)}
        onClick={() => handleSort(key)}
    >
        <div className="flex items-center justify-center gap-1">
            {label}
            <SortIcon column={key} />
        </div>
    </TableHead>
  );

  // Calculate Stats
  const redTotal = data.filter(r => r.corner === 'RED').length;
  const redDone = data.filter(r => r.corner === 'RED' && r.is_completed).length;
  const blueTotal = data.filter(r => r.corner === 'BLUE').length;
  const blueDone = data.filter(r => r.corner === 'BLUE' && r.is_completed).length;

  return (
    <div className="space-y-4">
      {/* Corner Status Summary */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex justify-between items-center">
              <span className="font-bold text-red-700">RED CORNER</span>
              <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-800">{redDone}/{redTotal}</span>
                  <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Checked In</span>
              </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex justify-between items-center">
              <span className="font-bold text-blue-700">BLUE CORNER</span>
              <div className="flex items-center gap-2">
                   <span className="text-2xl font-bold text-blue-800">{blueDone}/{blueTotal}</span>
                   <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Checked In</span>
              </div>
          </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input 
              placeholder="Search by Name, ID, Corner..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
             <div className="flex items-center gap-2">
                 <Filter className="h-4 w-4 text-muted-foreground" />
                 <span className="text-sm font-medium whitespace-nowrap">Filters:</span>
             </div>

             {/* Event Filter */}
             {uniqueEvents.length > 1 && (
                 <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue placeholder="Event" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Events</SelectItem>
                        {uniqueEvents.map(evt => (
                            <SelectItem key={evt} value={evt}>{evt}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
             )}
             
             <Select value={cornerFilter} onValueChange={(v: any) => setCornerFilter(v)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Corner" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Corners</SelectItem>
                    <SelectItem value="RED">Red Corner</SelectItem>
                    <SelectItem value="BLUE">Blue Corner</SelectItem>
                </SelectContent>
             </Select>

             <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
             </Select>

             <div className="flex items-center gap-1 bg-muted/50 px-3 py-1.5 rounded-md border text-xs text-muted-foreground whitespace-nowrap">
                 <Users className="h-3 w-3" />
                 <span>Total: {filteredData.length}</span>
             </div>

             <div className="flex items-center gap-2 border-l pl-3 ml-2">
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={() => generatePDF()}>
                    <Download className="h-3.5 w-3.5" />
                    PDF
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs" onClick={() => generateTemplate()}>
                    <FileText className="h-3.5 w-3.5" />
                    Template
                </Button>
             </div>
          </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {renderHeader('#', 'fight_order', 'w-[60px] text-center bg-yellow-50/50')}
              <TableHead className="w-[80px] text-center">Photo</TableHead>
              {renderHeader('Fighter', 'person.compiled_name', 'w-[250px] justify-start')}
              <TableHead 
                className="w-[180px] bg-blue-50/50 cursor-pointer hover:bg-blue-100/50 transition-colors"
                onClick={() => handleSort('bus_number')}
              >
                <div className="flex items-center justify-center gap-1"><Bus className="h-3 w-3" /> Bus Info <SortIcon column="bus_number" /></div>
              </TableHead>
              {renderHeader('Uniforms', 'uniform_status', 'text-center w-[120px]')}
              {/* Checks */}
              {renderHeader('Passport', 'passport_status', 'text-center w-[120px]')}
              {renderHeader('Nails', 'nails_status', 'text-center w-[120px]')}
              {renderHeader('Cup', 'cup_status', 'text-center w-[120px]')}
              {renderHeader('Mouthguard', 'mouthguard_status', 'text-center w-[120px]')}
              {/* Coaches */}
              <TableHead 
                className="w-[140px] text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('coaches_credentials_given')}
              >
                <div className="flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Coaches <SortIcon column="coaches_credentials_given" /></div>
              </TableHead>
              {renderHeader('Notes', 'notes')}
              {renderHeader('Status', 'is_completed', 'text-center w-[80px]')}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        No fighters found matching filters.
                    </TableCell>
                </TableRow>
            )}

            {filteredData.map((row) => {
              const isReadOnly = row.is_completed;
              
              return (
              <TableRow 
                key={row.enrolled_id} 
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  row.is_completed ? "bg-emerald-50/60 hover:bg-emerald-50/80" : ""
                )}
              >
                {/* Fight Order */}
                <TableCell className="p-2 text-center bg-yellow-50/20 font-bold text-lg text-yellow-700/80">
                   {row.fight_order || '-'}
                </TableCell>

                {/* Photo */}
                <TableCell className="text-center p-2">
                  <div className="flex justify-center">
                    <Avatar className={cn(
                        "h-12 w-12 border-4 shadow-sm cursor-pointer hover:scale-110 transition-transform",
                        row.corner === 'RED' ? "border-red-600" : row.corner === 'BLUE' ? "border-blue-600" : "border-muted"
                    )}>
                        <AvatarImage src={row.person.photo_url || ''} className="object-cover" />
                        <AvatarFallback className="font-bold bg-muted text-muted-foreground">
                            {row.person.compiled_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                  </div>
                </TableCell>
                
                {/* Identity */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-base truncate">{row.person.compiled_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] bg-background/80 text-muted-foreground border-muted-foreground/30 px-1 py-0 h-4">
                             ID: {row.person.appadmin_fighter_id || 'N/A'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{row.event_name}</span>
                      </div>
                  </div>
                </TableCell>

                {/* Bus Info - Dropdown */}
                <TableCell className="bg-blue-50/20 p-2 align-top">
                   <Select 
                      value={row.bus_number || ''} 
                      onValueChange={(val) => handleUpdate(row.enrolled_id, 'bus_number', val)}
                      disabled={isReadOnly}
                   >
                     <SelectTrigger className="h-8 text-xs bg-white/80 border-blue-200 focus:ring-blue-400">
                        <SelectValue placeholder="Select Bus" />
                     </SelectTrigger>
                     <SelectContent>
                        {BUS_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                     </SelectContent>
                   </Select>
                </TableCell>

                {/* Uniforms */}
                <TableCell className="p-1">
                   <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.uniform_status || 'pending'} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'uniform_status', val)}
                      disabled={isReadOnly}
                    />
                   </div>
                </TableCell>

                {/* Physical Checks */}
                <TableCell className="p-1">
                  <div className="flex justify-center">
                    <StagingStatusCell 
                      status={row.passport_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'passport_status', val)}
                      disabled={isReadOnly}
                    />
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.nails_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'nails_status', val)}
                      disabled={isReadOnly}
                    />
                  </div>
                </TableCell>
                <TableCell className="p-1">
                   <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.cup_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'cup_status', val)}
                      disabled={isReadOnly}
                    />
                   </div>
                </TableCell>
                 <TableCell className="p-1">
                   <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.mouthguard_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'mouthguard_status', val)}
                      disabled={isReadOnly}
                    />
                   </div>
                </TableCell>

                {/* Coaches Stepper */}
                <TableCell>
                  <div className="flex flex-col gap-2 items-center justify-center">
                     <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            disabled={isReadOnly || row.coaches_credentials_given <= 0}
                            onClick={() => handleUpdate(row.enrolled_id, 'coaches_credentials_given', Math.max(0, row.coaches_credentials_given - 1))}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-4 text-center text-sm font-bold min-w-[20px]">{row.coaches_credentials_given}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            disabled={isReadOnly}
                            onClick={() => handleUpdate(row.enrolled_id, 'coaches_credentials_given', row.coaches_credentials_given + 1)}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                     </div>
                  </div>
                </TableCell>

                {/* Notes */}
                <TableCell>
                  <Textarea 
                    className="min-h-[50px] text-xs resize-none bg-white/50 focus:bg-white"
                    placeholder="..."
                    value={row.notes || ''}
                    onChange={(e) => handleUpdate(row.enrolled_id, 'notes', e.target.value)}
                    disabled={isReadOnly}
                  />
                </TableCell>

                {/* Status Button */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Button
                        variant={row.is_completed ? "default" : "outline"}
                        size="sm"
                        className={cn(
                        "h-9 w-9 p-0 rounded-full shadow-sm transition-all duration-300",
                        row.is_completed 
                            ? "bg-emerald-600 hover:bg-emerald-700 animate-in zoom-in" 
                            : "text-muted-foreground border-dashed hover:border-solid hover:border-primary/50"
                        )}
                        onClick={() => handleToggleComplete(row.enrolled_id, row.is_completed)}
                    >
                        {row.is_completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

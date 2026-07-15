'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPublicStagingData } from '@/lib/actions/public-staging';
import { StagingRow } from '@/types/staging';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, RefreshCw, Users, CheckCircle2, XCircle, AlertTriangle, Minus, Scissors, Shield, Smile, CreditCard, Shirt, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { use } from 'react';


interface PublicStagingProps {
    params: Promise<{
        eventId: string;
    }>
}

const POLL_INTERVAL = 15000; // 15 seconds auto-refresh

export default function PublicStagingPage({ params }: PublicStagingProps) {
    const { eventId } = use(params);
    const [data, setData] = useState<StagingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [cornerFilter, setCornerFilter] = useState<'ALL' | 'RED' | 'BLUE'>('ALL');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'order', direction: 'asc' });
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        try {
            console.log('[PublicPage] Fetching data for event:', eventId);
            const result = await getPublicStagingData(eventId);
            console.log('[PublicPage] Data received:', result?.length);
             
            if (result) {
                setData(result);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('[PublicPage] Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    // Initial Fetch & Polling
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Filtering
    const filteredData = data.filter(row => {
        // 1. Corner Filter
        if (cornerFilter !== 'ALL' && row.corner !== cornerFilter) return false;

        // 2. Search Query (Multi-field, Comma separated)
        if (!searchQuery.trim()) return true;

        const terms = searchQuery.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
        
        return terms.some(term => {
            // Bus Check (e.g. "bus 1", "bus 2")
            if (term.startsWith('bus')) {
                const busNum = term.replace('bus', '').trim();
                return row.bus_number === busNum;
            }
            
            // Exact Number Check (Fight Order)
            if (!isNaN(Number(term))) {
                return row.fight_order === Number(term);
            }

            // General Text Check (Name, Corner, Fighter ID)
            return (
                row.person.compiled_name?.toLowerCase().includes(term) ||
                row.person.appadmin_fighter_id?.toLowerCase().includes(term) ||
                row.corner?.toLowerCase().includes(term) ||
                (row.bus_number && `bus ${row.bus_number}`.includes(term))
            );
        });
    });

    // Sorting
    const sortedData = [...filteredData].sort((a, b) => {
        const { key, direction } = sortConfig;
        
        let aValue: any = '';
        let bValue: any = '';

        if (key === 'fighter') {
            aValue = (a.person.compiled_name || '').toLowerCase();
            bValue = (b.person.compiled_name || '').toLowerCase();
        } else if (key === 'bus') {
            // Handle null bus numbers (put them last if asc, first if desc? Usually last)
            aValue = a.bus_number || 'zzz'; 
            bValue = b.bus_number || 'zzz';
        } else {
             // Default Order
             aValue = a.fight_order || 999;
             bValue = b.fight_order || 999;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4 text-foreground" />;
        return <ArrowDown className="ml-2 h-4 w-4 text-foreground" />;
    };

    // Stats
    const redTotal = data.filter(r => r.corner === 'RED').length;
    const redDone = data.filter(r => r.corner === 'RED' && r.is_completed).length;
    const blueTotal = data.filter(r => r.corner === 'BLUE').length;
    const blueDone = data.filter(r => r.corner === 'BLUE' && r.is_completed).length;



    return (
        <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
            {/* Header / Stats */}
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex flex-col gap-2">
                     <h1 className="text-xl font-bold">
                        {data[0]?.event_name || 'Event Pre-Departure Check'} Monitor
                     </h1>
                     <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                        <div className="flex items-center gap-2">
                             <span className="hidden sm:inline">Auto-refresh active</span>
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                     </div>
                </div>

                {/* Corner Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                        "rounded-lg p-3 border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer",
                         cornerFilter === 'RED' ? "bg-red-500/10 border-red-500/50 ring-2 ring-red-500/20" : "bg-card border-border hover:bg-accent"
                    )} onClick={() => setCornerFilter(f => f === 'RED' ? 'ALL' : 'RED')}>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Red Corner</span>
                        <span className="text-2xl font-bold">{redDone}/{redTotal}</span>
                        <span className="text-[10px] text-muted-foreground">Checked In</span>
                    </div>
                    <div className={cn(
                        "rounded-lg p-3 border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer",
                         cornerFilter === 'BLUE' ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20" : "bg-card border-border hover:bg-accent"
                    )} onClick={() => setCornerFilter(f => f === 'BLUE' ? 'ALL' : 'BLUE')}>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Blue Corner</span>
                        <span className="text-2xl font-bold">{blueDone}/{blueTotal}</span>
                        <span className="text-[10px] text-muted-foreground">Checked In</span>
                    </div>
                </div>



            
                {/* Desktop Table (Hidden on Mobile) */}
                <div className="hidden md:block bg-card rounded-lg border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 text-xs">
                                <TableHead className="w-[50px] text-center cursor-pointer hover:bg-muted" onClick={() => requestSort('order')}>
                                    <div className="flex items-center justify-center">
                                       # {sortConfig.key === 'order' && <SortIcon column="order" />} 
                                    </div>
                                </TableHead>
                                <TableHead className="w-[60px]">Photo</TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('fighter')}>
                                    <div className="flex items-center">
                                        Fighter <SortIcon column="fighter" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-center w-[120px] cursor-pointer hover:bg-muted" onClick={() => requestSort('bus')}>
                                    <div className="flex items-center justify-center">
                                        Bus <SortIcon column="bus" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-center min-w-[300px]">Checks</TableHead>
                                <TableHead className="text-left">Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            )}
                            {!loading && sortedData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No athletes found.</TableCell>
                                </TableRow>
                            )}
                            {sortedData.map(row => (
                                <TableRow 
                                    key={row.enrolled_id}
                                    className={cn(
                                        "transition-colors",
                                        row.is_completed ? "bg-emerald-500/30 dark:bg-emerald-500/10 hover:bg-emerald-500/40 dark:hover:bg-emerald-500/20" : ""
                                    )}
                                >
                                    <TableCell className="text-center font-bold text-muted-foreground">
                                        {row.fight_order || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Avatar className={cn(
                                            "h-10 w-10 border-2",
                                            row.corner === 'RED' ? "border-red-500" : row.corner === 'BLUE' ? "border-blue-500" : "border-muted"
                                        )}>
                                            <AvatarImage src={row.person.photo_url || ''} />
                                            <AvatarFallback>{row.person.compiled_name?.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm leading-tight">{row.person.compiled_name}</span>
                                            <span className="text-[10px] text-muted-foreground">{row.person.appadmin_fighter_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {row.bus_number ? (
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{row.bus_number}</span>
                                                {row.bus_time && <span className="text-[10px] text-muted-foreground">{row.bus_time}</span>}
                                            </div>
                                        ) : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                                            {/* Coach Count (Only if > 0) */}
                                            {(row.coaches_with_bus_count > 0 || row.coaches_credentials_given > 0) && (
                                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 mr-2" title="Coaches Credentials / Bus">
                                                    <Users className="h-4 w-4 text-slate-500" />
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        {row.coaches_credentials_given}
                                                    </span>
                                                </div>
                                            )}

                                            <CategoryIcon type="nails" title="Nails" status={row.nails_status} />
                                            <CategoryIcon type="cup" title="Cup" status={row.cup_status} />
                                            <CategoryIcon type="mouth" title="Mouthguard" status={row.mouthguard_status} />
                                            <CategoryIcon type="pass" title="Passport" status={row.passport_status} />
                                            <CategoryIcon type="uniform" title="Uniform" status={row.uniform_status || 'pending'} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-left max-w-[200px] whitespace-normal break-words text-xs text-muted-foreground" title={row.notes || ''}>
                                        {row.notes || '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card List (Visible on Mobile) */}
                <div className="md:hidden space-y-2">
                    {loading && data.length === 0 && <div className="text-center p-4">Loading...</div>}
                    {!loading && filteredData.length === 0 && <div className="text-center p-4">No athletes found.</div>}
                    
                    {filteredData.map(row => (
                        <div key={row.enrolled_id} className={cn(
                            "bg-card border rounded-lg overflow-hidden shadow-sm flex flex-col",
                            row.is_completed ? "border-green-500/50 bg-green-500/15 dark:border-green-500/30 dark:bg-green-500/5" : "border-border"
                        )}>
                            <div className="flex w-full">
                                {/* Left Side: 50% - Identity */}
                                <div className="w-1/2 p-3 flex flex-col gap-2 border-r border-border/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-muted-foreground">#{row.fight_order || '-'}</span>
                                        <Badge variant="outline" className={cn(
                                            "h-5 text-[10px] px-1",
                                            row.corner === 'RED' ? "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900" : 
                                            row.corner === 'BLUE' ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900" : ""
                                        )}>
                                            {row.corner || 'N/A'}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Avatar className={cn(
                                            "h-10 w-10 border-2 shrink-0",
                                            row.corner === 'RED' ? "border-red-500" : row.corner === 'BLUE' ? "border-blue-500" : "border-muted"
                                        )}>
                                            <AvatarImage src={row.person.photo_url || ''} />
                                            <AvatarFallback>{row.person.compiled_name?.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold text-sm leading-tight truncate">{row.person.compiled_name}</span>
                                            <span className="text-[10px] text-muted-foreground">{row.person.appadmin_fighter_id}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {row.bus_number && (
                                             <div className="flex items-center gap-1 text-[10px] bg-muted/50 rounded px-1 py-0.5 w-fit">
                                                <span className="font-semibold">Bus: {row.bus_number}</span>
                                             </div>
                                        )}
                                        {(row.coaches_with_bus_count > 0 || row.coaches_credentials_given > 0) && (
                                             <div className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded px-1 py-0.5 w-fit border border-blue-100 dark:border-blue-800">
                                                <Users className="h-3 w-3" />
                                                <span className="font-semibold">{row.coaches_credentials_given}</span>
                                             </div>
                                        )}
                                    </div>
                                    {row.notes && (
                                        <div className="mt-2 text-[10px] text-muted-foreground italic border-t pt-1 whitespace-normal break-words">
                                            {row.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: 50% - Icons Grid */}
                                <div className="w-1/2 p-2 bg-muted/10 grid grid-cols-3 gap-2 place-items-center content-center">
                                    <CategoryIcon type="nails" title="Nails" status={row.nails_status} />
                                    <CategoryIcon type="cup" title="Cup" status={row.cup_status} />
                                    <CategoryIcon type="mouth" title="Mouthguard" status={row.mouthguard_status} />
                                    <CategoryIcon type="pass" title="Passport" status={row.passport_status} />
                                    <CategoryIcon type="uniform" title="Uniform" status={row.uniform_status || 'pending'} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Helper for Status Icon (CATEGORY VERSION)
function CategoryIcon({ type, status, title }: { type: 'nails' | 'cup' | 'mouth' | 'pass' | 'uniform', status: string, title: string }) {
    let Icon = Minus;
    let colorClass = "text-muted-foreground/20"; // Very faint for pending

    // Icon Mapping
    switch (type) {
        case 'nails': Icon = Scissors; break;
        case 'cup': Icon = Shield; break;
        case 'mouth': Icon = Smile; break;
        case 'pass': Icon = CreditCard; break; // ID/Passport
        case 'uniform': Icon = Shirt; break;
    }

    // Color Mapping
    if (status === 'checked') {
        colorClass = "text-green-600 dark:text-green-500";
    } else if (status === 'missed') {
        colorClass = "text-red-600 dark:text-red-500";
    } else if (status === 'verify_at_venue') {
            colorClass = "text-orange-500 dark:text-orange-400";
    }

    return (
        <div className="flex items-center justify-center p-1" title={title}>
                <Icon className={cn("h-5 w-5 hover:scale-110 transition-transform", colorClass)} />
        </div>
    );
};

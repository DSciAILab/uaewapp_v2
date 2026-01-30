'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPublicStagingData } from '@/lib/actions/public-staging';
import { StagingRow } from '@/types/staging';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, RefreshCw, Users } from 'lucide-react';
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

    const fetchData = useCallback(async () => {
        try {
            const result = await getPublicStagingData(eventId);
            setData(result);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch public staging data', error);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Filtering
    const filteredData = data.filter(row => {
        if (cornerFilter === 'ALL') return true;
        return row.corner === cornerFilter;
    });

    // Stats
    const redTotal = data.filter(r => r.corner === 'RED').length;
    const redDone = data.filter(r => r.corner === 'RED' && r.is_completed).length;
    const blueTotal = data.filter(r => r.corner === 'BLUE').length;
    const blueDone = data.filter(r => r.corner === 'BLUE' && r.is_completed).length;

    // Helper for Status Badge
    // Helper for Status Badge
    const StatusBadge = ({ status, label }: { status: string, label: string }) => {
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
        let className = "text-[10px] h-5 px-1 border-dashed text-muted-foreground";

        if (status === 'checked') {
            variant = "default";
            className = "bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1";
        } else if (status === 'missed') {
            variant = "destructive";
            className = "text-[10px] h-5 px-1";
        } else if (status === 'verify_at_venue') {
            variant = "secondary";
            className = "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 text-[10px] h-5 px-1";
        }

        return (
            <Badge variant={variant} className={className}>
                {label}
            </Badge>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-2 sm:p-4">
            {/* Header / Stats */}
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex flex-col gap-2">
                     <h1 className="text-xl font-bold text-slate-900">
                        {data[0]?.event_name || 'Event Staging'} Monitor
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
                        "rounded-lg p-3 border flex flex-col items-center justify-center gap-1 transition-colors",
                         cornerFilter === 'RED' ? "bg-red-100 border-red-300 ring-2 ring-red-500/20" : "bg-white border-red-100"
                    )} onClick={() => setCornerFilter(f => f === 'RED' ? 'ALL' : 'RED')}>
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Red Corner</span>
                        <span className="text-2xl font-bold text-red-900">{redDone}/{redTotal}</span>
                        <span className="text-[10px] text-red-600">Checked In</span>
                    </div>
                    <div className={cn(
                        "rounded-lg p-3 border flex flex-col items-center justify-center gap-1 transition-colors",
                         cornerFilter === 'BLUE' ? "bg-blue-100 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-blue-100"
                    )} onClick={() => setCornerFilter(f => f === 'BLUE' ? 'ALL' : 'BLUE')}>
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Blue Corner</span>
                        <span className="text-2xl font-bold text-blue-900">{blueDone}/{blueTotal}</span>
                        <span className="text-[10px] text-blue-600">Checked In</span>
                    </div>
                </div>

                {/* Filter Control (Visible on larger screens or distinct from cards) */}
                <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={cornerFilter} onValueChange={(v: any) => setCornerFilter(v)}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue placeholder="Filter Corner" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Corners</SelectItem>
                                <SelectItem value="RED">Red Corner Only</SelectItem>
                                <SelectItem value="BLUE">Blue Corner Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>

                {/* Mobile Friendly Cards List for very small screens, Table for tablet+ */}
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 text-xs">
                                <TableHead className="w-[50px] text-center">#</TableHead>
                                <TableHead className="w-[60px]">Photo</TableHead>
                                <TableHead>Fighter</TableHead>
                                <TableHead className="text-center w-[60px]">Status</TableHead> {/* Completed? */}
                                <TableHead className="text-center w-[80px] hidden sm:table-cell">Bus</TableHead>
                                <TableHead className="text-center w-[150px] hidden md:table-cell">Checks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            )}
                            {!loading && filteredData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No athletes found.</TableCell>
                                </TableRow>
                            )}
                            {filteredData.map(row => (
                                <TableRow 
                                    key={row.enrolled_id}
                                    className={cn(
                                        "transition-colors",
                                        row.is_completed ? "bg-emerald-50/60 hover:bg-emerald-50/80" : ""
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
                                            <AvatarFallback>{row.person.full_name?.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm leading-tight">{row.person.full_name}</span>
                                            <span className="text-[10px] text-muted-foreground">{row.person.fighter_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                         {row.is_completed ? (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-[10px] h-5">DONE</Badge>
                                         ) : (
                                            <Badge variant="outline" className="text-muted-foreground text-[10px] h-5 border-dashed">PENDING</Badge>
                                         )}
                                    </TableCell>
                                    <TableCell className="text-center hidden sm:table-cell">
                                        {row.bus_number ? (
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{row.bus_number}</span>
                                                {row.bus_time && <span className="text-[10px] text-muted-foreground">{row.bus_time}</span>}
                                            </div>
                                        ) : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell align-middle">
                                        <div className="flex flex-col gap-2 w-full min-w-[180px]">
                                            {/* Row 1: Physical Checks - Distributed Wide */}
                                            <div className="flex justify-between items-center px-1">
                                                <StatusBadge label="Nail" status={row.nails_status} />
                                                <StatusBadge label="Cup" status={row.cup_status} />
                                                <StatusBadge label="Mth" status={row.mouthguard_status} />
                                            </div>
                                            
                                            {/* Row 2: Admin Checks - Distributed Wide */}
                                            <div className="flex justify-between items-center px-1">
                                                <StatusBadge label="Pass" status={row.passport_status} />
                                                <StatusBadge label="Uni" status={row.uniform_status || 'pending'} />
                                                <div className="min-w-[40px] flex justify-end">
                                                    {(row.coaches_with_bus_count > 0 || row.coaches_credentials_given > 0) && (
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-slate-100 text-slate-600 border-slate-200 whitespace-nowrap">
                                                            {row.coaches_credentials_given}/{row.coaches_with_bus_count} C
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

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
    const StatusBadge = ({ status, label }: { status: string, label: string }) => {
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
        let className = "text-[10px] h-5 px-1 border-dashed text-muted-foreground w-full justify-center";

        if (status === 'checked') {
            variant = "default";
            // Explicit green for both light/dark
            className = "bg-green-600 hover:bg-green-600 text-white border-green-700 text-[10px] h-5 px-1 w-full justify-center";
        } else if (status === 'missed') {
            variant = "destructive";
             // Explicit red for both light/dark
            className = "bg-red-600 hover:bg-red-600 text-white border-red-700 text-[10px] h-5 px-1 w-full justify-center";
        } else if (status === 'verify_at_venue') {
            variant = "secondary";
             // Orange
            className = "bg-orange-500 hover:bg-orange-600 text-white border-orange-600 text-[10px] h-5 px-1 w-full justify-center";
        }

        return (
            <Badge variant={variant} className={className}>
                {label}
            </Badge>
        );
    };

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

                {/* Filter Control */}
                <div className="flex justify-between items-center bg-card p-2 rounded-lg border shadow-sm">
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

                {/* Desktop Table (Hidden on Mobile) */}
                <div className="hidden md:block bg-card rounded-lg border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 text-xs">
                                <TableHead className="w-[50px] text-center">#</TableHead>
                                <TableHead className="w-[60px]">Photo</TableHead>
                                <TableHead>Fighter</TableHead>
                                <TableHead className="text-center w-[80px]">Bus</TableHead>
                                <TableHead className="text-right min-w-[300px]">Checks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            )}
                            {!loading && filteredData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No athletes found.</TableCell>
                                </TableRow>
                            )}
                            {filteredData.map(row => (
                                <TableRow 
                                    key={row.enrolled_id}
                                    className={cn(
                                        "transition-colors",
                                        row.is_completed ? "bg-emerald-500/10 hover:bg-emerald-500/20" : ""
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
                                        {row.bus_number ? (
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{row.bus_number}</span>
                                                {row.bus_time && <span className="text-[10px] text-muted-foreground">{row.bus_time}</span>}
                                            </div>
                                        ) : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap items-center justify-end gap-1.5 w-full">
                                            <div className="w-16"><StatusBadge label="Nail" status={row.nails_status} /></div>
                                            <div className="w-16"><StatusBadge label="Cup" status={row.cup_status} /></div>
                                            <div className="w-16"><StatusBadge label="Mth" status={row.mouthguard_status} /></div>
                                            <div className="w-px h-4 bg-border mx-1" />
                                            <div className="w-16"><StatusBadge label="Pass" status={row.passport_status} /></div>
                                            <div className="w-16"><StatusBadge label="Uni" status={row.uniform_status || 'pending'} /></div>
                                        </div>
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
                            row.is_completed ? "border-green-500/30 bg-green-500/5" : "border-border"
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
                                            <AvatarFallback>{row.person.full_name?.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold text-sm leading-tight truncate">{row.person.full_name}</span>
                                            <span className="text-[10px] text-muted-foreground">{row.person.fighter_id}</span>
                                        </div>
                                    </div>

                                    {row.bus_number && (
                                         <div className="mt-1 flex items-center gap-1 text-[10px] bg-muted/50 rounded px-1 py-0.5 w-fit">
                                            <span className="font-semibold">Bus: {row.bus_number}</span>
                                         </div>
                                    )}
                                </div>

                                {/* Right Side: 50% - Badges Grid */}
                                <div className="w-1/2 p-2 bg-muted/10 grid grid-cols-2 gap-1 content-start">
                                    <StatusBadge label="Nail" status={row.nails_status} />
                                    <StatusBadge label="Cup" status={row.cup_status} />
                                    <StatusBadge label="Mth" status={row.mouthguard_status} />
                                    <StatusBadge label="Pass" status={row.passport_status} />
                                    <StatusBadge label="Uni" status={row.uniform_status || 'pending'} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

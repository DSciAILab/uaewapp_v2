'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  XCircle, Plane, PlaneLanding, PlaneTakeoff, Car, Bus, 
  ShieldCheck, Hotel, UserCircle, Briefcase, 
  Loader2, Trash2, CheckCircle2
} from 'lucide-react';
import { Person, Role, Event } from '@/types/database';
import { getRoles, bulkCreateEnrollments } from '@/lib/services/enrollments';
import { getActiveEvents } from '@/lib/services/events';
import { getFighterPhotoUrl, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PeopleBatchEnrollmentProps {
  selectedPeople: Person[];
  onCancel: () => void;
  onSuccess: () => void;
  onRemovePerson: (id: string) => void;
}

const FLIGHT_OPTIONS = [
  { value: 'none', label: 'Não', icon: XCircle },
  { value: 'arrival_only', label: 'Chegada', icon: PlaneLanding },
  { value: 'departure_only', label: 'Partida', icon: PlaneTakeoff },
  { value: 'full', label: 'Ambos', icon: Plane },
];

const TRANSPORT_OPTIONS = [
  { value: 'none', label: 'Não', icon: XCircle },
  { value: 'arrival', label: 'Chegada', icon: Car },
  { value: 'departure', label: 'Partida', icon: Car },
  { value: 'both', label: 'Ambos', icon: Bus },
];

export function PeopleBatchEnrollment({ 
  selectedPeople, 
  onCancel, 
  onSuccess, 
  onRemovePerson 
}: PeopleBatchEnrollmentProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Global settings for all selected
  const [globalEventId, setGlobalEventId] = useState<string>('');
  const [globalRoleId, setGlobalRoleId] = useState<string>('');
  const [globalFlight, setGlobalFlight] = useState<string>('none');
  const [globalTransport, setGlobalTransport] = useState<string>('none');
  const [globalHotel, setGlobalHotel] = useState(false);
  const [globalVisa, setGlobalVisa] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [eventsData, rolesData] = await Promise.all([
        getActiveEvents(),
        getRoles()
      ]);
      setEvents(eventsData);
      setRoles(rolesData);
      if (eventsData.length > 0) setGlobalEventId(eventsData[0].id);
      if (rolesData.length > 0) setGlobalRoleId(rolesData.find(r => r.code === 'C')?.id || rolesData[0].id);
    } catch (error) {
      toast.error('Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBulk = () => {
    if (!globalEventId) {
        toast.error('Select an event first');
        return;
    }
    setSubmitting(true);
    
    bulkCreateEnrollments(globalEventId, selectedPeople.map(p => p.id), {
        role_id: globalRoleId,
        needs_flight: globalFlight as any,
        needs_transport: globalTransport as any,
        needs_hotel: globalHotel,
        needs_visa: globalVisa
    }).then(res => {
        toast.success(`Successfully enrolled ${res.success} people`);
        if (res.errors.length > 0) {
            toast.error(`Failed for ${res.errors.length} people`);
        }
        onSuccess();
    }).catch(err => {
        toast.error(err.message || 'Batch enrollment failed');
    }).finally(() => {
        setSubmitting(false);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading batch tools...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h2 className="font-bold text-lg">Bulk Enrollment</h2>
          <Badge variant="secondary" className="rounded-full px-3">{selectedPeople.length} people selected</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <XCircle className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Selected People List */}
        <div className="w-1/3 border-r bg-muted/10 flex flex-col">
          <div className="p-3 border-b bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirm Selection</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {selectedPeople.map(person => (
                <div key={person.id} className="group flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    {person.fighter_id && <AvatarImage src={getFighterPhotoUrl(person.fighter_id)} />}
                    <AvatarFallback className="text-[10px]">{person.name[0]}{(person.surname || '')[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none">{person.compiled_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{person.nationality || '-'}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                    onClick={() => onRemovePerson(person.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side: Global Configuration */}
        <div className="flex-1 p-6 space-y-8 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-bold opacity-60">1. CHOOSE TARGET EVENT</Label>
              <div className="flex flex-wrap gap-2">
                {events.map(event => (
                  <Button
                    key={event.id}
                    variant={globalEventId === event.id ? "default" : "outline"}
                    className={cn(
                      "h-auto py-3 px-4 flex flex-col items-start gap-1 transition-all",
                      globalEventId === event.id ? "ring-2 ring-primary ring-offset-2" : ""
                    )}
                    onClick={() => setGlobalEventId(event.id)}
                  >
                    <span className="font-bold">{event.name}</span>
                    <span className="text-[10px] opacity-70 uppercase">{event.code} • {new Date(event.event_date).toLocaleDateString()}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div>
                  <Label className="text-sm font-bold opacity-60 block mb-3">2. DEFINE ROLE FOR ALL</Label>
                  <ToggleGroup 
                    type="single" 
                    variant="segmented" 
                    value={globalRoleId} 
                    onValueChange={(v) => v && setGlobalRoleId(v)}
                    className="flex-wrap"
                  >
                    {roles.map(role => (
                      <ToggleGroupItem key={role.id} value={role.id} className="min-w-[100px] h-12 flex-col gap-0 px-4">
                        <span className="text-xs font-bold leading-none">{role.code}</span>
                        <span className="text-[10px] opacity-70">{role.name}</span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold opacity-60 block">LOGISTICS: FLIGHT</Label>
                    <ToggleGroup 
                      type="single" 
                      variant="segmented" 
                      value={globalFlight} 
                      onValueChange={(v) => v && setGlobalFlight(v)}
                      className="w-full"
                    >
                      {FLIGHT_OPTIONS.map(opt => (
                        <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1 h-10 px-0">
                          <opt.icon className="h-4 w-4 mr-2" />
                          <span className="text-xs">{opt.label}</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold opacity-60 block">LOGISTICS: TRANSPORT</Label>
                    <ToggleGroup 
                      type="single" 
                      variant="segmented" 
                      value={globalTransport} 
                      onValueChange={(v) => v && setGlobalTransport(v)}
                      className="w-full"
                    >
                      {TRANSPORT_OPTIONS.map(opt => (
                        <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1 h-10 px-0">
                          <opt.icon className="h-4 w-4 mr-2" />
                          <span className="text-xs">{opt.label}</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={globalHotel ? "default" : "outline"}
                    className={cn(
                      "h-16 justify-between px-6 transition-all",
                      globalHotel ? "bg-primary border-primary" : "border-dashed"
                    )}
                    onClick={() => setGlobalHotel(!globalHotel)}
                  >
                    <div className="flex items-center gap-3">
                      <Hotel className={cn("h-5 w-5", globalHotel ? "text-primary-foreground" : "text-muted-foreground")} />
                      <div className="text-left">
                        <p className="font-bold">Hotel Required</p>
                        <p className="text-[10px] opacity-70">Auto-create reservation</p>
                      </div>
                    </div>
                    <Checkbox checked={globalHotel} className="border-current" />
                  </Button>

                  <Button
                    variant={globalVisa ? "default" : "outline"}
                    className={cn(
                      "h-16 justify-between px-6 transition-all",
                      globalVisa ? "bg-primary border-primary" : "border-dashed"
                    )}
                    onClick={() => setGlobalVisa(!globalVisa)}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className={cn("h-5 w-5", globalVisa ? "text-primary-foreground" : "text-muted-foreground")} />
                      <div className="text-left">
                        <p className="font-bold">Visa Assistance</p>
                        <p className="text-[10px] opacity-70">Mark for tracking</p>
                      </div>
                    </div>
                    <Checkbox checked={globalVisa} className="border-current" />
                  </Button>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          All {selectedPeople.length} people will be enrolled in the event above.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button 
            className="px-8 h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            disabled={submitting}
            onClick={handleApplyBulk}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Bulk Enrollment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

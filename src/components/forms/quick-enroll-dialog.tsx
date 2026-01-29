'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createEnrollment, getRoles } from '@/lib/services/enrollments';
import { getActiveEvents } from '@/lib/services/events';
import { Person, Event, Role } from '@/types/database';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFighterPhotoUrl } from '@/lib/utils';

interface QuickEnrollDialogProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickEnrollDialog({ person, open, onOpenChange, onSuccess }: QuickEnrollDialogProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [needsFlight, setNeedsFlight] = useState(false);
  const [needsHotel, setNeedsHotel] = useState(false);
  const [needsVisa, setNeedsVisa] = useState(false);
  const [needsTransport, setNeedsTransport] = useState(false);

  useEffect(() => {
    if (open) {
      loadOptions();
      // Reset form
      setSelectedEventId('');
      setSelectedRoleId('');
      setNeedsFlight(false);
      setNeedsHotel(false);
      setNeedsVisa(false);
      setNeedsTransport(false);
    }
  }, [open]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const [eventsData, rolesData] = await Promise.all([
        getActiveEvents(),
        getRoles()
      ]);
      setEvents(eventsData);
      setRoles(rolesData);
      
      // Auto-select first event if only one exists
      if (eventsData.length === 1) {
          setSelectedEventId(eventsData[0].id);
      }
      // Auto-select "Guest" or "Fighter" if name matches person role? 
      // Nah, just default to first maybe? No, force selection.
    } catch (error) {
      console.error(error);
      toast.error('Failed to load events/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!person || !selectedEventId || !selectedRoleId) {
      toast.error('Please select an event and a role');
      return;
    }

    setSubmitting(true);
    try {
      await createEnrollment({
        event_id: selectedEventId,
        person_id: person.id,
        role_id: selectedRoleId,
        needs_flight: needsFlight ? 'full' : 'none', // Simple boolean to 'full' logic
        needs_hotel: needsHotel,
        needs_visa: needsVisa,
        needs_transport: needsTransport ? 'both' : 'none'
      });

      toast.success(`${person.compiled_name} enrolled successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-12 w-12 border">
            {person?.fighter_id && (
              <AvatarImage src={getFighterPhotoUrl(person.fighter_id)} />
            )}
            <AvatarFallback>
              {person?.name?.[0]}{person?.surname?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <DialogTitle>Quick Enroll</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Enrolling <span className="font-semibold text-foreground">{person?.compiled_name}</span>
            </p>
          </div>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="event">Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading..." : "Select Event"} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} ({event.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading..." : "Select Role"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
              <Label>Requirements</Label>
              <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <Checkbox id="flight" checked={needsFlight} onCheckedChange={(c) => setNeedsFlight(!!c)} />
                      <Label htmlFor="flight" className="cursor-pointer">Flight</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <Checkbox id="hotel" checked={needsHotel} onCheckedChange={(c) => setNeedsHotel(!!c)} />
                      <Label htmlFor="hotel" className="cursor-pointer">Hotel</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <Checkbox id="transport" checked={needsTransport} onCheckedChange={(c) => setNeedsTransport(!!c)} />
                      <Label htmlFor="transport" className="cursor-pointer">Transport</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                      <Checkbox id="visa" checked={needsVisa} onCheckedChange={(c) => setNeedsVisa(!!c)} />
                      <Label htmlFor="visa" className="cursor-pointer">Visa</Label>
                  </div>
              </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? 'Enrolling...' : 'Enroll Person'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

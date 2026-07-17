'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';

const MIN_PASSWORD = 6;

/**
 * First-access password prompt (UAE-20).
 *
 * Staff accounts ship with their PS number as the password, so the first thing
 * they see is an offer to change it. Offer, not force: they choose.
 *
 * "First access" = mma_users.last_login_at is null. Recording the visit is what
 * closes the prompt for good, so it's written on either choice — including
 * "keep", otherwise the dialog would greet them forever.
 */
export function FirstLoginDialog() {
  const { user, loading } = useUser();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.last_login_at) setOpen(true);
  }, [user, loading]);

  const markVisited = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('mma_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) console.error('[first-login] could not record the visit:', error.message);
  };

  const keepPassword = async () => {
    await markVisited();
    setOpen(false);
  };

  const savePassword = async () => {
    if (password.length < MIN_PASSWORD) {
      toast.error(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await markVisited();
      toast.success('Password updated');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      // Not dismissible: closing it without a choice would leave last_login_at
      // null and the prompt would come back on the next page anyway.
      onOpenChange={() => {}}
    >
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </DialogTitle>
          <DialogDescription>
            Your password is currently your PS number. You can change it now, or keep it and change it later.
          </DialogDescription>
        </DialogHeader>

        {!changing ? (
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => setChanging(true)}>
              Change password
            </Button>
            <Button variant="outline" className="flex-1" onClick={keepPassword}>
              Keep current
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePassword()}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={savePassword} disabled={saving}>
                {saving ? 'Saving…' : 'Save password'}
              </Button>
              <Button variant="ghost" onClick={() => setChanging(false)} disabled={saving}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

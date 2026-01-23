'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, UserX } from 'lucide-react';
import { Driver } from '@/types/transport';
import { deactivateDriver } from '@/lib/services/transport-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DriverTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
  onRefresh: () => void;
}

export function DriverTable({ drivers, onEdit, onRefresh }: DriverTableProps) {
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    
    setIsDeactivating(true);
    try {
      await deactivateDriver(deactivateId);
      toast.success('Driver deactivated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to deactivate driver');
    } finally {
      setIsDeactivating(false);
      setDeactivateId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No drivers found
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name}</TableCell>
                  <TableCell>{driver.phone || '-'}</TableCell>
                  <TableCell>{driver.email || '-'}</TableCell>
                  <TableCell>{driver.vehicle_info || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={driver.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(driver)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        {driver.is_active && (
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeactivateId(driver.id)}>
                            <UserX className="mr-2 h-4 w-4" />Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This driver will be marked as inactive and won't appear as an option for new assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={isDeactivating} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

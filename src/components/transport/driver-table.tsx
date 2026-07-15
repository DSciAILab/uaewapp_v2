'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { Driver } from '@/types/transport';
import { deactivateDriver, updateDriver } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface DriverTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
  onRefresh: () => void;
}

export function DriverTable({ drivers, onEdit, onRefresh }: DriverTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleActive = async (driver: Driver) => {
    setUpdatingId(driver.id);
    try {
      await updateDriver(driver.id, { is_active: !driver.is_active });
      toast.success(`Driver ${driver.is_active ? 'deactivated' : 'activated'}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No drivers found
              </TableCell>
            </TableRow>
          ) : (
            drivers.map((driver) => (
              <TableRow 
                key={driver.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onEdit(driver)}
              >
                <TableCell>
                  <span className="font-medium">{driver.name}</span>
                </TableCell>
                <TableCell>
                   {driver.phone || <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={driver.is_active ? 'default' : 'secondary'} className={driver.is_active ? 'bg-green-600 text-white hover:bg-green-700' : ''}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(driver)}>
                        <Pencil className="mr-2 h-4 w-4" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(driver)}>
                        {driver.is_active ? (
                            <><XCircle className="mr-2 h-4 w-4 text-red-500" />Deactivate</>
                        ) : (
                            <><CheckCircle className="mr-2 h-4 w-4 text-green-500" />Activate</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

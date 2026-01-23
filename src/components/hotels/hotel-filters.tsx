'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { HotelFilters as HotelFiltersType, HotelStatus } from '@/types/hotel';

interface HotelFiltersProps {
  filters: HotelFiltersType;
  onChange: (filters: HotelFiltersType) => void;
}

export function HotelFilters({ filters, onChange }: HotelFiltersProps) {
  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search });
  };

  const handleStatusChange = (status: string) => {
    onChange({ ...filters, status: status === 'all' ? undefined : status as HotelStatus });
  };

  const handleDivergenceChange = (value: string) => {
    let has_divergence: boolean | undefined;
    let divergence_approved: boolean | undefined;

    if (value === 'with_divergence') {
      has_divergence = true;
      divergence_approved = undefined;
    } else if (value === 'pending_approval') {
      has_divergence = true;
      divergence_approved = false;
    } else if (value === 'approved') {
      has_divergence = true;
      divergence_approved = true;
    } else {
      has_divergence = undefined;
      divergence_approved = undefined;
    }

    onChange({ ...filters, has_divergence, divergence_approved });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters = !!(filters.search || filters.status || filters.has_divergence !== undefined);

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guest, hotel, confirmation..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={
          filters.has_divergence === undefined ? 'all'
            : filters.divergence_approved === false ? 'pending_approval'
            : filters.divergence_approved === true ? 'approved'
            : 'with_divergence'
        }
        onValueChange={handleDivergenceChange}
      >
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Divergence" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Date</SelectItem>
          <SelectItem value="with_divergence">With Divergence</SelectItem>
          <SelectItem value="pending_approval">Pending Approval</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}

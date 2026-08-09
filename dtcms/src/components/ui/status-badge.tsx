import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  
  const s = status.toUpperCase();
  
  if (['APPROVED', 'ACTIVE', 'CONFIRMED', 'COMPLETED'].includes(s)) {
    return <Badge className={`bg-success text-success-foreground hover:bg-success/90 ${className || ''}`} data-testid={`badge-status-${s}`}>{status}</Badge>;
  }
  
  if (['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(s)) {
    return <Badge className={`bg-warning text-warning-foreground hover:bg-warning/90 ${className || ''}`} data-testid={`badge-status-${s}`}>{status}</Badge>;
  }
  
  if (['REJECTED', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(s)) {
    return <Badge variant="destructive" className={className} data-testid={`badge-status-${s}`}>{status}</Badge>;
  }
  
  return <Badge variant="secondary" className={className} data-testid={`badge-status-${s}`}>{status}</Badge>;
}
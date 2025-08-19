import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Pin } from 'lucide-react';

interface PaymentMethodBadgeProps {
  payoutMethod?: string;
  hasCashback?: boolean;
  className?: string;
}

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ 
  payoutMethod, 
  hasCashback = false,
  className = ""
}) => {
  // Determine if it supports in-app payment (PSP)
  const supportsInAppPayment = payoutMethod !== 'manual';

  if (supportsInAppPayment) {
    return (
      <Badge variant="secondary" className={`text-xs ${className}`}>
        <CreditCard className="h-3 w-3 mr-1" />
        In-app payment
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      <Pin className="h-3 w-3 mr-1" />
      Pay at counter (PIN only)
    </Badge>
  );
};

export default PaymentMethodBadge;
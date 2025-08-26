import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAuthBypass } from '@/utils/envAccess';

export type MerchantRole = 'owner' | 'manager' | 'staff';

interface MerchantAccess {
  merchantId: string;
  role: MerchantRole;
  permissions: {
    validate: boolean;
    collect_cash: boolean;
    view_transactions: boolean;
    manage_staff?: boolean;
    manage_deals?: boolean;
    view_analytics?: boolean;
  };
}

export function useMerchantAccess(merchantId?: string) {
  const [access, setAccess] = useState<MerchantAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setIsLoading(false);
      return;
    }

    checkAccess();
  }, [merchantId]);

  const checkAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Auth bypass for development
      if (isAuthBypass() && merchantId) {
        setAccess({
          merchantId,
          role: 'owner',
          permissions: {
            validate: true,
            collect_cash: true,
            view_transactions: true,
            manage_staff: true,
            manage_deals: true,
            view_analytics: true,
          }
        });
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccess(null);
        setIsLoading(false);
        return;
      }

      // Check if user is owner
      const { data: merchant } = await supabase
        .from('merchants')
        .select('owner_id')
        .eq('id', merchantId)
        .single();

      if (merchant?.owner_id === user.id) {
        setAccess({
          merchantId: merchantId!,
          role: 'owner',
          permissions: {
            validate: true,
            collect_cash: true,
            view_transactions: true,
            manage_staff: true,
            manage_deals: true,
            view_analytics: true,
          }
        });
        setIsLoading(false);
        return;
      }

      // Check staff permissions
      const { data: staffRecord } = await supabase
        .from('merchant_staff')
        .select('role, permissions')
        .eq('user_id', user.id)
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .single();

      if (staffRecord) {
        const permissions = staffRecord.permissions as any;
        setAccess({
          merchantId: merchantId!,
          role: staffRecord.role as MerchantRole,
          permissions: {
            validate: permissions?.validate ?? true,
            collect_cash: permissions?.collect_cash ?? true,
            view_transactions: permissions?.view_transactions ?? true,
            manage_staff: staffRecord.role === 'manager',
            manage_deals: staffRecord.role === 'manager',
            view_analytics: staffRecord.role === 'manager',
          }
        });
      } else {
        setAccess(null);
      }
    } catch (err) {
      console.error('Error checking merchant access:', err);
      setError('Failed to check access permissions');
      setAccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: keyof MerchantAccess['permissions']) => {
    return access?.permissions[permission] ?? false;
  };

  const isOwner = access?.role === 'owner';
  const isManager = access?.role === 'manager' || isOwner;
  const isStaff = access?.role === 'staff' || isManager;

  return {
    access,
    isLoading,
    error,
    hasPermission,
    isOwner,
    isManager,
    isStaff,
    refetch: checkAccess
  };
}
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCustomerCreditSelection() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCreditSelection = async (
    paymentCode: string,
    localCreditsSelected: number,
    networkCreditsSelected: number
  ) => {
    setIsUpdating(true);

    try {
      const { data, error } = await supabase.functions.invoke('updateCustomerCreditSelection', {
        body: {
          paymentCode,
          localCreditsSelected,
          networkCreditsSelected
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error updating credit selection:', error);
      toast.error('Failed to update credit selection');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateCreditSelection, isUpdating };
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, dealData, dealId, merchantId } = await req.json()
    
    console.log('Merchant manage deals:', { action, merchantId, dealId })

    // For demo purposes, allow unauthenticated access to demo merchant
    const demoMerchantId = 'e8d2f33c-cddd-4943-8963-f26fb0022176'
    
    if (merchantId !== demoMerchantId) {
      // For non-demo merchants, require authentication
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Authorization required')
      }
    }

    let result

    switch (action) {
      case 'create':
        // Sanitize dealData to only include fields that exist in the database
        const sanitizedDealData = {
          title: dealData.title,
          description: dealData.description,
          reward_mode: dealData.reward_mode,
          cashback_pct: dealData.cashback_pct,
          discount_pct: dealData.discount_pct,
          stock: dealData.stock,
          is_active: dealData.is_active,
          start_at: dealData.start_at,
          end_at: dealData.end_at,
          visibility: dealData.visibility || 'PUBLIC'
        }
        
        const { data: newDeal, error: createError } = await supabaseClient
          .from('deals')
          .insert({
            ...sanitizedDealData,
            merchant_id: merchantId
          })
          .select()
          .single()
        
        if (createError) throw createError
        result = newDeal
        break

      case 'update':
        // Sanitize dealData for updates too
        const sanitizedUpdateData = {
          title: dealData.title,
          description: dealData.description,
          reward_mode: dealData.reward_mode,
          cashback_pct: dealData.cashback_pct,
          discount_pct: dealData.discount_pct,
          stock: dealData.stock,
          is_active: dealData.is_active,
          start_at: dealData.start_at,
          end_at: dealData.end_at,
          visibility: dealData.visibility
        }
        
        const { data: updatedDeal, error: updateError } = await supabaseClient
          .from('deals')
          .update(sanitizedUpdateData)
          .eq('id', dealId)
          .eq('merchant_id', merchantId)
          .select()
          .single()
        
        if (updateError) throw updateError
        result = updatedDeal
        break

      case 'delete':
        const { error: deleteError } = await supabaseClient
          .from('deals')
          .delete()
          .eq('id', dealId)
          .eq('merchant_id', merchantId)
        
        if (deleteError) throw deleteError
        result = { success: true }
        break

      case 'list':
        const { data: deals, error: listError } = await supabaseClient
          .from('deals')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('created_at', { ascending: false })
        
        if (listError) throw listError
        result = deals
        break

      default:
        throw new Error('Invalid action')
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in merchant-manage-deals:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
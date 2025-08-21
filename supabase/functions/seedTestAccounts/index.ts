import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Test accounts to create
    const testAccounts = [
      {
        email: 'admin@test.com',
        password: 'testpass123',
        role: 'admin',
        displayName: 'Test Admin'
      },
      {
        email: 'merchant@test.com', 
        password: 'testpass123',
        role: 'merchant',
        displayName: 'Test Merchant'
      },
      {
        email: 'user@test.com',
        password: 'testpass123', 
        role: 'user',
        displayName: 'Test User'
      }
    ]

    const createdAccounts = []

    for (const account of testAccounts) {
      console.log(`Creating account: ${account.email}`)
      
      // Create user with admin client (bypasses email confirmation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          display_name: account.displayName
        }
      })

      if (authError) {
        console.error(`Error creating user ${account.email}:`, authError)
        continue
      }

      const userId = authData.user?.id
      if (!userId) {
        console.error(`No user ID returned for ${account.email}`)
        continue
      }

      // Insert into users table
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          user_id: userId,
          email: account.email,
          display_name: account.displayName
        })

      if (userError) {
        console.error(`Error creating user profile for ${account.email}:`, userError)
      }

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: account.role
        })

      if (roleError) {
        console.error(`Error assigning role for ${account.email}:`, roleError)
      }

      // Create merchant if role is merchant
      if (account.role === 'merchant') {
        const { error: merchantError } = await supabaseAdmin
          .from('merchants')
          .upsert({
            name: 'Test Merchant Store',
            owner_id: userId,
            category: 'food',
            is_active: true
          })

        if (merchantError) {
          console.error(`Error creating merchant for ${account.email}:`, merchantError)
        }
      }

      createdAccounts.push({
        email: account.email,
        password: account.password,
        role: account.role,
        displayName: account.displayName
      })

      console.log(`Successfully created account: ${account.email}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdAccounts.length} test accounts`,
        accounts: createdAccounts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in seedTestAccounts:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
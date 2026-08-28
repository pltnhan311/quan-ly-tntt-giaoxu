import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, phone, password, baptism_name, address } = await req.json();

    console.log('Creating auth account for GLV:', email);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw authError;
    }

    console.log('Auth account created:', authData.user.id);

    // Delete the auto-created catechist from trigger (role will be 'admin')
    const { error: deleteError } = await supabase
      .from('catechists')
      .delete()
      .eq('user_id', authData.user.id);

    if (deleteError) {
      console.error('Delete auto-created catechist error:', deleteError);
    }

    // Delete the auto-created role from trigger
    const { error: deleteRoleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', authData.user.id);

    if (deleteRoleError) {
      console.error('Delete auto-created role error:', deleteRoleError);
    }

    // Insert catechist with full details
    const { data: catechistData, error: catechistError } = await supabase
      .from('catechists')
      .insert({
        user_id: authData.user.id,
        name: name,
        email: email,
        phone: phone,
        baptism_name: baptism_name,
        address: address,
        is_active: true
      });

    if (catechistError) {
      console.error('Catechist creation error:', catechistError);
      throw catechistError;
    }

    // Set role to glv
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ 
        user_id: authData.user.id, 
        role: 'glv' 
      });

    if (roleError) {
      console.error('Role creation error:', roleError);
      throw roleError;
    }

    console.log('GLV account setup complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        login_info: {
          email: email,
          password: password
        },
        catechist: {
          id: catechistData.id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-glv-account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

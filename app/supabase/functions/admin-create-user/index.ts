import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  email: string;
  password: string;
  company_id: string;
  role: string;
  tool_permissions: Record<string, boolean>; // product_id -> has_access
  invited_by: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validar autenticação do chamador (deve ser admin/owner)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar que o chamador é admin ou owner da empresa
    const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CreateUserPayload = await req.json();
    const { email, password, company_id, role, tool_permissions, invited_by } = body;

    if (!email || !password || !company_id || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que o chamador tem permissão nesta empresa
    const { data: callerMember } = await supabaseAdmin
      .from('company_members')
      .select('role')
      .eq('company_id', company_id)
      .eq('user_id', caller.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!callerMember) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar usuários nesta empresa' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Checar se email já existe no sistema
    const { data: existingCheck } = await supabaseAdmin.rpc('get_subscriber_id_by_email', {
      p_email: email,
    });

    if (existingCheck && (existingCheck as any)?.id) {
      return new Response(JSON.stringify({ error: 'Este email já está cadastrado na plataforma. Use o fluxo de convite normal.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar usuário no Auth com email já confirmado
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newAuthUser?.user) {
      throw new Error(createError?.message || 'Falha ao criar usuário no auth');
    }

    const userId = newAuthUser.user.id;

    // Inserir na tabela subscribers (trigger pode já ter feito isso, upsert por segurança)
    await supabaseAdmin
      .from('subscribers')
      .upsert({ id: userId, email, name: email.split('@')[0] }, { onConflict: 'id' });

    // Inserir em company_members
    const { data: newMember, error: memberError } = await supabaseAdmin
      .from('company_members')
      .insert({
        company_id,
        user_id: userId,
        role,
        user_type: 'collaborator',
      })
      .select('id')
      .single();

    if (memberError) throw new Error(memberError.message);

    // Inserir permissões de ferramentas
    const permEntries = Object.entries(tool_permissions || {})
      .filter(([, hasAccess]) => hasAccess)
      .map(([product_id]) => ({
        company_member_id: newMember.id,
        product_id,
        access_level: 'user',
        granted_by: invited_by,
      }));

    if (permEntries.length > 0) {
      await supabaseAdmin.from('member_product_access').insert(permEntries);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[admin-create-user]', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

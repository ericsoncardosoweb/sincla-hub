// Sincla Hub - Sync Contacts Edge Function
// Receives contacts from satellite products and upserts into company_contacts

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ContactInput {
    name: string
    email?: string | null
    phone?: string | null
    whatsapp?: string | null
    cpf?: string | null
    contact_type?: string
    source?: string
    tags?: string[]
    metadata?: Record<string, unknown>
    notes?: string | null
}

interface RequestBody {
    company_id: string
    contacts: ContactInput[]
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Authenticate the caller
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: authHeader } },
        })

        // Verify the caller is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { company_id, contacts }: RequestBody = await req.json()

        if (!company_id || !contacts || !Array.isArray(contacts)) {
            return new Response(
                JSON.stringify({ error: 'company_id and contacts array are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify user is a member of the company
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const { data: membership } = await adminClient
            .from('company_members')
            .select('id, role')
            .eq('user_id', user.id)
            .eq('company_id', company_id)
            .eq('status', 'active')
            .single()

        if (!membership) {
            return new Response(
                JSON.stringify({ error: 'User is not a member of this company' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Process contacts: upsert by email, cpf, or whatsapp
        const results = {
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: [] as string[],
        }

        for (const contact of contacts) {
            if (!contact.name?.trim()) {
                results.skipped++
                results.errors.push(`Contato sem nome foi ignorado`)
                continue
            }

            try {
                // Try to find existing contact by email, cpf, or whatsapp
                let existingId: string | null = null

                if (contact.email) {
                    const { data } = await adminClient
                        .from('company_contacts')
                        .select('id')
                        .eq('company_id', company_id)
                        .eq('email', contact.email)
                        .single()
                    if (data) existingId = data.id
                }

                if (!existingId && contact.cpf) {
                    const { data } = await adminClient
                        .from('company_contacts')
                        .select('id')
                        .eq('company_id', company_id)
                        .eq('cpf', contact.cpf)
                        .single()
                    if (data) existingId = data.id
                }

                if (!existingId && contact.whatsapp) {
                    const { data } = await adminClient
                        .from('company_contacts')
                        .select('id')
                        .eq('company_id', company_id)
                        .eq('whatsapp', contact.whatsapp)
                        .single()
                    if (data) existingId = data.id
                }

                const payload = {
                    company_id,
                    name: contact.name.trim(),
                    email: contact.email?.trim() || null,
                    phone: contact.phone?.trim() || null,
                    whatsapp: contact.whatsapp?.trim() || null,
                    cpf: contact.cpf?.trim() || null,
                    contact_type: contact.contact_type || 'Contato',
                    source: contact.source || 'manual',
                    tags: contact.tags || [],
                    metadata: contact.metadata || {},
                    notes: contact.notes?.trim() || null,
                }

                if (existingId) {
                    // Update existing
                    const { error } = await adminClient
                        .from('company_contacts')
                        .update(payload)
                        .eq('id', existingId)
                    if (error) throw error
                    results.updated++
                } else {
                    // Insert new
                    const { error } = await adminClient
                        .from('company_contacts')
                        .insert(payload)
                    if (error) throw error
                    results.inserted++
                }
            } catch (err: any) {
                results.skipped++
                results.errors.push(`${contact.name}: ${err.message}`)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                results,
                total: contacts.length,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error syncing contacts:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

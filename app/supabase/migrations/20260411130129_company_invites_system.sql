-- 1. Create table company_invites
CREATE TABLE public.company_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    user_type TEXT NOT NULL DEFAULT 'collaborator',
    tool_permissions JSONB DEFAULT '{}'::jsonb,
    invited_by UUID REFERENCES public.subscribers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
    
    -- Ensure an email can only have one active invite per company at a time
    UNIQUE (company_id, email)
);

-- RLS for company_invites
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- Admins and owners can manage (view, insert, delete) invites for their companies
CREATE POLICY "Admins can manage company invites" 
    ON public.company_invites 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = company_invites.company_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );

-- Any authenticated user can view an invite if they match the email
CREATE POLICY "Users can view their own invites"
    ON public.company_invites
    FOR SELECT
    USING (
        lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    );

-- 2. Create RPC function to accept invite
CREATE OR REPLACE FUNCTION accept_company_invite(p_invite_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
    v_user_email TEXT;
    v_new_member_id UUID;
    v_subscriber_id UUID;
    v_product_id TEXT;
    v_level TEXT;
BEGIN
    v_subscriber_id := auth.uid();
    
    IF v_subscriber_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the user's email securely from auth.users
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_subscriber_id;

    -- Look up the invite
    SELECT * INTO v_invite FROM company_invites 
    WHERE id = p_invite_id AND expires_at > now();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found or expired';
    END IF;

    -- Strict check: The invite email must match the auth.user email
    IF lower(v_invite.email) != lower(v_user_email) THEN
        RAISE EXCEPTION 'Invite does not match your email address';
    END IF;

    -- Check if already a member
    IF EXISTS (SELECT 1 FROM company_members WHERE company_id = v_invite.company_id AND user_id = v_subscriber_id) THEN
        DELETE FROM company_invites WHERE id = p_invite_id;
        RETURN TRUE;
    END IF;

    INSERT INTO company_members (company_id, user_id, role, user_type)
    VALUES (v_invite.company_id, v_subscriber_id, v_invite.role, v_invite.user_type)
    RETURNING id INTO v_new_member_id;

    -- Insert permissions if present (from JSONB)
    IF v_invite.tool_permissions IS NOT NULL AND jsonb_typeof(v_invite.tool_permissions) = 'object' THEN
        FOR v_product_id, v_level IN SELECT key, value#>>'{}' FROM jsonb_each(v_invite.tool_permissions)
        LOOP
            INSERT INTO member_product_access (company_member_id, product_id, access_level, granted_by)
            VALUES (v_new_member_id, v_product_id, CASE WHEN v_level = 'advanced' THEN 'admin' ELSE 'user' END, v_invite.invited_by)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Delete the invite
    DELETE FROM company_invites WHERE id = p_invite_id;

    RETURN TRUE;
END;
$$;

-- 3. Auto-consume invites on user creation
CREATE OR REPLACE FUNCTION set_user_invites_on_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
    v_new_member_id UUID;
    v_product_id TEXT;
    v_level TEXT;
BEGIN
    FOR v_invite IN
        SELECT * FROM company_invites 
        WHERE lower(email) = lower(NEW.email) AND expires_at > now()
    LOOP
        -- Insert into company_members if not already there
        IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = v_invite.company_id AND user_id = NEW.id) THEN
            INSERT INTO company_members (company_id, user_id, role, user_type)
            VALUES (v_invite.company_id, NEW.id, v_invite.role, v_invite.user_type)
            RETURNING id INTO v_new_member_id;

            -- Insert permissions
            IF v_invite.tool_permissions IS NOT NULL AND jsonb_typeof(v_invite.tool_permissions) = 'object' THEN
                FOR v_product_id, v_level IN SELECT key, value#>>'{}' FROM jsonb_each(v_invite.tool_permissions)
                LOOP
                    INSERT INTO member_product_access (company_member_id, product_id, access_level, granted_by)
                    VALUES (v_new_member_id, v_product_id, CASE WHEN v_level = 'advanced' THEN 'admin' ELSE 'user' END, v_invite.invited_by)
                    ON CONFLICT DO NOTHING;
                END LOOP;
            END IF;
        END IF;

        -- Delete the invite
        DELETE FROM company_invites WHERE id = v_invite.id;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscriber_created_consume_invites ON public.subscribers;

CREATE TRIGGER on_subscriber_created_consume_invites
AFTER INSERT ON public.subscribers
FOR EACH ROW EXECUTE FUNCTION public.set_user_invites_on_creation();


-- =====================================================
-- FIX: Adicionar policies de admin para product_plans
-- Bug: edição de planos (features, limits) não salvava porque
-- RLS tinha apenas policy de SELECT, sem policies de UPDATE/INSERT/DELETE
-- =====================================================

-- Permitir admins verem TODOS os planos (incluindo inativos)
CREATE POLICY "Admins can view all plans" ON product_plans
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- Permitir admins criarem planos
CREATE POLICY "Admins can create plans" ON product_plans
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- Permitir admins atualizarem planos
CREATE POLICY "Admins can update plans" ON product_plans
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- Permitir admins excluírem planos
CREATE POLICY "Admins can delete plans" ON product_plans
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

# 🚀 Padrões de Performance — Sincla Platform

Guia obrigatório para todos os módulos Sincla (Hub, Agenda, RH, EAD).

---

## 1. Paginação Server-Side

### ❌ Nunca fazer
```typescript
// PROIBIDO: carrega tudo, bate no limite de 1000 do Supabase
const { data } = await supabase.from('bookings').select('*').eq('tenant_id', id);
```

### ✅ Padrão correto
```typescript
const PAGE_SIZE = 50;
const offset = (page - 1) * PAGE_SIZE;

const { data, count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

// No TSX: <Pagination total={Math.ceil(count / PAGE_SIZE)} />
```

### Regras
- **Listagens**: Sempre `.range()` + `count: 'exact'` + `<Pagination>`
- **Busca**: Sempre `.ilike` + `.limit(50)`
- **Lookups únicos**: `.single()` ou `.limit(1)`
- **Exportação**: Loop batch (1000 por vez) como `getAllContacts()`
- **Safety net**: Mesmo datasets pequenos devem ter `.limit()` (ex: event_types → `.limit(100)`)

---

## 2. Indexes no Supabase

### Regra: toda query frequente precisa de index composto

```sql
-- Padrão: tabela(tenant_id, coluna_filtro, coluna_ordenação)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_start
    ON bookings(tenant_id, status, start_at);

-- Partial indexes para queries com WHERE fixo
CREATE INDEX IF NOT EXISTS idx_tasks_pending
    ON tasks(tenant_id, due_date)
    WHERE is_completed = false;

-- Lookup por campo único
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_email
    ON contacts(tenant_id, email);
```

### Checklist de Index por Módulo
- [ ] Listagem principal (tenant + filtro + ordenação)
- [ ] Busca por campo (tenant + email, tenant + name)
- [ ] Status não processados (partial index)
- [ ] Joins frequentes (FK columns)

---

## 3. TanStack Query — Carregamento Assíncrono

### Padrão de Hook

```typescript
export function useItems(tenantId: string, options?: { page?: number; search?: string }) {
    return useQuery({
        queryKey: ['items', tenantId, options],  // granular key
        queryFn: () => itemService.getItems(tenantId, options),
        enabled: !!tenantId,                     // não busca sem tenant
        staleTime: 30_000,                       // 30s cache
    });
}
```

### Regras
- **staleTime**: 15-60s para dados que mudam (bookings), 5min para referência (event_types)
- **enabled**: Sempre condicional (`!!tenantId`)
- **queryKey**: Incluir TODOS os filtros para cache correto
- **Mutations**: Sempre `invalidateQueries` após mutação

---

## 4. Supabase Realtime

### Hook genérico

```typescript
// Escuta mudanças e invalida TanStack Query automaticamente
useRealtimeSubscription('bookings', tenantId, [
    ['bookings'],      // queryKeys a invalidar
    ['booking-stats'],
]);
```

### Quando usar
- **Dashboard**: bookings + tasks (dados ao vivo)
- **Calendário**: bookings (agendamentos em tempo real)
- **Chat/Notificações**: alta prioridade

### Quando NÃO usar
- **Configurações**: dados estáticos (staleTime basta)
- **Relatórios**: dados batch (desnecessário)

---

## 5. Database Webhooks vs Cron

| Cenário | Usar | Exemplo |
|---|---|---|
| **Reação a evento** | Database Webhook (Trigger) | Notificar ao criar booking |
| **Processamento batch** | Cron (pg_cron) | Relatórios diários |
| **Fallback de segurança** | Cron baixa frequência | Processar eventos perdidos |

### Padrão de Trigger

```sql
CREATE OR REPLACE FUNCTION notify_on_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    PERFORM net.http_post(
        url := '<EDGE_FUNCTION_URL>',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object('id', NEW.id)::text
    );
    RETURN NEW;
END;
$$;
```

---

## 6. Vault — Segurança de Secrets

```sql
-- Armazenar
SELECT vault.create_secret('minha_api_key', 'valor_secreto');

-- Ler (via helper)
SELECT get_vault_secret('minha_api_key');
```

### O que encriptar
- API keys de terceiros
- Tokens OAuth (refresh_token)
- Chaves de webhook

---

## 7. Checklist por Módulo

Usar esta checklist ao auditar/criar um novo módulo:

### Queries
- [ ] Todas as listagens usam `.range()` + `count: 'exact'`
- [ ] Todas as buscas usam `.limit()`
- [ ] Nenhuma query sem `.limit()` ou `.range()`
- [ ] Campos select específicos (não `select('*')` quando possível)

### Indexes
- [ ] Index composto para query principal
- [ ] Index para lookups por email/slug
- [ ] Partial index para status pendentes
- [ ] `EXPLAIN ANALYZE` nas top 5 queries

### Frontend
- [ ] TanStack Query com `staleTime` adequado
- [ ] `<Pagination>` em todas as listagens
- [ ] Skeleton loading (não tela em branco)
- [ ] Realtime nas tabelas críticas

### Backend
- [ ] Edge Functions com timeout handling
- [ ] Webhook trigger para eventos críticos
- [ ] Cron como fallback (não primário)
- [ ] Secrets no Vault (não hardcoded)

---

## 8. Referência de Implementação

O **Sincla Agenda** é o módulo de referência. Consultar:

| Recurso | Arquivo |
|---|---|
| Paginação service | `tools/agenda/src/services/bookingService.ts` |
| Paginação hook | `tools/agenda/src/hooks/useBookings.ts` |
| Realtime hook | `tools/agenda/src/hooks/useRealtimeSubscription.ts` |
| Indexes | `tools/agenda/supabase/migrations/023_performance_security.sql` |
| Webhook trigger | `tools/agenda/supabase/migrations/023_performance_security.sql` |
| Cron jobs | `tools/agenda/supabase/migrations/022_cron_jobs.sql` |
| Templates notificação | `tools/agenda/src/services/defaultTemplates.ts` |

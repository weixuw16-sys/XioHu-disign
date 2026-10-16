create table if not exists public.love_push_tokens (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.love_couples (id) on delete cascade,
    role text not null check (role in ('boy', 'girl')),
    token text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (couple_id, token)
);

create index if not exists love_push_tokens_couple_role_idx
    on public.love_push_tokens (couple_id, role);

alter table public.love_push_tokens enable row level security;
revoke all on public.love_push_tokens from anon, authenticated;
grant all on public.love_push_tokens to service_role;

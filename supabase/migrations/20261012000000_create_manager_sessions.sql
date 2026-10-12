create table if not exists public.manager_sessions (
    id_hash text primary key,
    github_token text not null,
    github_login text not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists manager_sessions_expires_at_idx
    on public.manager_sessions (expires_at);

alter table public.manager_sessions enable row level security;

revoke all on public.manager_sessions from anon, authenticated;
grant all on public.manager_sessions to service_role;

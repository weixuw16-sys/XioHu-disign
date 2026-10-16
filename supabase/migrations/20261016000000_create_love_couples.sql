create table if not exists public.love_couples (
    id uuid primary key default gen_random_uuid(),
    invite_hash text not null unique,
    invite_expires_at timestamptz not null,
    boy_token_hash text not null unique,
    girl_token_hash text unique,
    boy_name text not null,
    girl_name text,
    confession text not null,
    confession_status text not null default 'pending'
        check (confession_status in ('pending', 'accepted')),
    created_at timestamptz not null default now(),
    paired_at timestamptz,
    accepted_at timestamptz,
    check ((girl_token_hash is null) = (girl_name is null)),
    check ((girl_token_hash is null) = (paired_at is null))
);

create index if not exists love_couples_invite_expiry_idx
    on public.love_couples (invite_expires_at);

create table if not exists public.love_wake_messages (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.love_couples (id) on delete cascade,
    sender_role text not null check (sender_role in ('boy', 'girl')),
    body text not null check (char_length(body) between 1 and 300),
    created_at timestamptz not null default now(),
    received_at timestamptz
);

create index if not exists love_wake_messages_couple_created_idx
    on public.love_wake_messages (couple_id, created_at desc);

alter table public.love_couples enable row level security;
alter table public.love_wake_messages enable row level security;

revoke all on public.love_couples from anon, authenticated;
revoke all on public.love_wake_messages from anon, authenticated;
grant all on public.love_couples to service_role;
grant all on public.love_wake_messages to service_role;

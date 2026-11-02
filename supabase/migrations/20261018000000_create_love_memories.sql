create table if not exists public.love_memories (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.love_couples (id) on delete cascade,
    author_role text not null check (author_role in ('boy', 'girl')),
    memory_date date not null,
    body text not null default '',
    media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
    created_at timestamptz not null default now(),
    check (char_length(body) <= 1000)
);

create index if not exists love_memories_couple_date_idx
    on public.love_memories (couple_id, memory_date desc, created_at desc);

alter table public.love_memories enable row level security;
revoke all on public.love_memories from anon, authenticated;
grant all on public.love_memories to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'love-memories',
    'love-memories',
    false,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

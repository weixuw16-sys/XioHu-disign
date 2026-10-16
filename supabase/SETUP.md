# One-time Supabase and GitHub setup

The portfolio site is static GitHub Pages, so it cannot keep a GitHub write
credential private. This setup moves that credential to Supabase Edge Functions.
The browser receives only a random, revocable manager session ID; the GitHub
OAuth access token stays in the server-only `manager_sessions` table.

The OAuth app requests only GitHub's `public_repo` scope and the backend allows
only the `weixuw16-sys` account to manage `weixuw16-sys/XioHu-disign`.

## 1. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Install the Supabase CLI and sign in:

   ```sh
   npx supabase login
   ```

3. From the repository root, link the project and create the private session table:

   ```sh
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   `YOUR_PROJECT_REF` is the project reference in the Supabase project URL,
   before `.supabase.co`.

## 2. Create a GitHub OAuth App

Open **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.

- **Application name:** `XioHu Portfolio Manager`
- **Homepage URL:** `https://weixuw16-sys.github.io/XioHu-disign/`
- **Authorization callback URL:**
  `https://YOUR_PROJECT_REF.supabase.co/functions/v1/github-auth/callback`

Create the app and keep its client secret private. The app requests `public_repo`
only; do not add the `repo` scope.

## 3. Create and store the GitHub OAuth credentials

Keep the OAuth app's client secret private. In the GitHub repository, open
**Settings → Secrets and variables → Actions → New repository secret** and add
these two repository secrets:

- `SUPABASE_ACCESS_TOKEN`: create an access token from
  [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens).
- `SUPABASE_PROJECT_REF`: `gttcyzjomilimqrrnrow`.

Do not put the client secret, a GitHub token, the Supabase service-role key,
or the Supabase access token in the website or chat. The Supabase Edge
Functions receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase
at runtime.

## 4. Create the private manager-session table

Open the Supabase project's **SQL Editor**, create a new query, and run:

```sql
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
```

This one-time SQL setup avoids exposing or repeatedly troubleshooting the
database password. The Management API's SQL endpoint only permits read-only
queries, so it cannot apply schema migrations.

## 5. Add OAuth credentials to Supabase

Open [Supabase Edge Function secrets](https://supabase.com/dashboard/project/gttcyzjomilimqrrnrow/functions/secrets)
and add these three secrets using the values from the GitHub OAuth App:

- `GITHUB_CLIENT_ID`: the OAuth app's client ID.
- `GITHUB_CLIENT_SECRET`: the OAuth app's client secret.
- `APP_URL`: `https://weixuw16-sys.github.io/XioHu-disign/admin.html`

These OAuth credentials are stored only by Supabase, not in the repository.

## 6. Deploy the Edge Functions

After the setup change is merged to `main`, open the repository's **Actions**
tab and run **Deploy portfolio manager backend** to deploy both Edge Functions.

The functions validate a random manager session ID themselves. `github-auth`
uses OAuth state validation, and `github-manager` permits requests only from
the published admin page and from a live server-side session.

## 7. Connect the website

After the workflow succeeds, open the live
[作品管理页](https://weixuw16-sys.github.io/XioHu-disign/admin.html) and select
**继续使用 GitHub 登录**. The app remembers a server-backed session for 30
days. Use **退出登录** to revoke and clear the current device's session.

If GitHub organization or repository rules require OAuth app approval, approve
the OAuth app for the repository owner before logging in.

## 8. Enable the couple Android app

The couple app uses the same Supabase project for one-time invitation codes,
confession responses, and wake-up messages. Before sharing an updated Android
app:

1. In the Supabase SQL Editor, run
   `supabase/migrations/20261016000000_create_love_couples.sql`.
2. Merge the app changes to `main`, then run **Deploy portfolio manager
   backend** from the repository's Actions tab. The workflow deploys the
   `couple-sync` function with JWT verification disabled because the function
   validates each device's random, private pairing token itself.
3. Build and share the updated Android APK. The boy creates a 10-character
   invitation code; the girl installs the app, chooses **我是女生**, and enters
   the code to receive the confession.

The Android client contains only the project's publishable key. Pairing codes
and device tokens are stored as hashes by the database; the service-role key
stays in Supabase. Wake-up messages sync when the app is opened. System
notifications while the app is closed require a Firebase Cloud Messaging
project and are not enabled by this setup. Daily photos and videos remain
device-local for now.

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
the following repository secrets:

- `SUPABASE_ACCESS_TOKEN`: create an access token from
  [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens).
- `SUPABASE_PROJECT_REF`: `gttcyzjomilimqrrnrow`.
- `SUPABASE_DB_PASSWORD`: the database password you set when creating the project.
- `OAUTH_CLIENT_ID`: the OAuth app's client ID.
- `OAUTH_CLIENT_SECRET`: the OAuth app's client secret.

Do not put the client secret, a GitHub token, the Supabase service-role key,
database password, or the Supabase access token in the website or chat. The
Supabase Edge Functions receive `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from Supabase at runtime.

## 4. Deploy the database migration and Edge Functions

After this setup change is merged to `main`, open the repository's **Actions**
tab, run **Deploy portfolio manager backend**, and confirm the run succeeds.
The workflow links the project, applies the migration, writes the OAuth
credentials and exact admin-page URL as server secrets, and deploys both Edge
Functions.

The functions validate a random manager session ID themselves. `github-auth`
uses OAuth state validation, and `github-manager` permits requests only from
the published admin page and from a live server-side session.

## 5. Connect the website

After the workflow succeeds, open the live
[作品管理页](https://weixuw16-sys.github.io/XioHu-disign/admin.html) and select
**继续使用 GitHub 登录**. The app remembers a server-backed session for 30
days. Use **退出登录** to revoke and clear the current device's session.

If GitHub organization or repository rules require OAuth app approval, approve
the OAuth app for the repository owner before logging in.

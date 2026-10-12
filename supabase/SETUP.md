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

## 3. Set the server-only OAuth secrets

From the repository root, set the OAuth app credentials and the exact admin-page
URL. Do not put the client secret or any GitHub token in the website, source
code, or chat.

```sh
npx supabase secrets set --project-ref YOUR_PROJECT_REF `
  GITHUB_CLIENT_ID=YOUR_GITHUB_OAUTH_CLIENT_ID `
  GITHUB_CLIENT_SECRET=YOUR_GITHUB_OAUTH_CLIENT_SECRET `
  APP_URL=https://weixuw16-sys.github.io/XioHu-disign/admin.html
```

In PowerShell, the same command can be entered on one line without the
backticks. The Supabase Edge Functions already provide `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` to the runtime; never copy the service-role key
into the browser.

## 4. Deploy the Edge Functions

```sh
npx supabase functions deploy github-auth --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase functions deploy github-manager --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

The functions validate a random manager session ID themselves. `github-auth`
uses OAuth state validation, and `github-manager` permits requests only from
the published admin page and from a live server-side session.

## 5. Connect the website

In Supabase **Project Settings → API**, copy the **Project URL** and the
**anon / publishable key** (not the service-role key). Open the live
[作品管理页](https://weixuw16-sys.github.io/XioHu-disign/admin.html), enter
those two public values once on each device, and select **使用 GitHub 登录**.
The app remembers the public Supabase connection settings and keeps a
server-backed session for 30 days. Use **退出登录** to revoke and clear the
current device's session.

If GitHub organization or repository rules require OAuth app approval, approve
the OAuth app for the repository owner before logging in.

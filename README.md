# PlayChale Admin

The admin desk: a separate app from the one players use, for the few people who work on PlayChale.
None of its code or routes exist in the player app.

- **Overview** — new and active players, games created, played and called off, joins, messages
- **People** — find someone by name, handle, email or phone (typed `024…` or `+233…`), see what
  happened to them, and export everything held about them for a data request
- **Messages** — talk from games, newest first, and a way to take one down with a reason

It reads and acts through the PlayChale API's `/admin` endpoints. **The API is the real gate**:
every call is refused (as "not found") unless the signed-in person is in `platform_staff`. This app
only spares non-staff a screen of errors. Every search, every look at someone's history, every
export and every removal is written to the API's event stream with the staff member's name on it.

Nuxt 4, Tailwind 4, the same design tokens and base components as the player app (copied, not
shared — the two apps share the API and nothing else). A static single-page app: no server.

## Running it

You need the API running locally (in `backend/`: `./mvnw spring-boot:run`). Then:

```bash
pnpm install
pnpm dev            # http://localhost:3200
```

On a laptop the demo data makes **Kojo** a staff owner. Sign in with his phone, `024 000 0002`;
the code is shown on screen (`123456`). Any other demo player signs in and is told there's nothing
here for them.

Use the phone, not `kojo@example.com`: that's only his contact address. The demo players have no
sign-in email, so signing in with it creates a new account — which isn't staff.

The API allows `http://localhost:3200` in its dev config (`application-dev.yml`).

```bash
pnpm typecheck
pnpm test:e2e       # needs the API and this app running; resets the demo data per test
```

## Putting it live

Four steps. The first two fail **silently** if skipped, so do them in order.

### 1. It must be on a playchale.com subdomain

The API's session cookie is `SameSite=Lax`, which a browser only sends between same-site addresses.
`admin.playchale.com` → `api.playchale.com` works. A `*.pages.dev` address would sign in and then be
signed out on every request, with no error to explain why.

### 2. Allow it on the API

In the API's environment on the server, add the admin origin **after** the player app:

```
PLAYCHALE_CORS_ORIGINS=https://playchale.com,https://admin.playchale.com
```

Order matters: the first origin is also used for links and the logo in emails
(`PlaychaleProperties.webAppUrl`), and those must never send players to the admin desk. Restart the
API: `docker compose up -d api`.

### 3. Deploy

```bash
NUXT_PUBLIC_API_BASE=https://api.playchale.com pnpm deploy
```

That builds the static site and publishes it to the Cloudflare Pages project `playchale-admin`
(created on first deploy). Then in Cloudflare → Pages → `playchale-admin` → **Custom domains**, add
`admin.playchale.com`.

`public/_headers` keeps it out of search engines and out of frames.

### 4. Make yourself staff

Nothing in any app can create the first staff member — that's deliberate, since an admin account can
read every player's phone number and email. Sign in to the player app once with your email, then on
the server:

```sql
INSERT INTO platform_staff (user_id, role, note)
SELECT id, 'owner', 'founder' FROM users WHERE lower(sign_in_email) = lower('you@example.com');
```

After that, add anyone else from the database the same way with `role` `'support'` (can look and
moderate) or `'owner'` (can also manage staff).

### Strongly recommended: Cloudflare Access

Put `admin.playchale.com` behind **Cloudflare Zero Trust → Access** (free for small teams), allowing
only your team's email addresses. Then nobody else can even load the sign-in page. The API still
checks staff on every call either way, so this is a second lock, not the only one.

## A note on signing out

The session is the API's own cookie, shared with the player app. So a player already signed in at
playchale.com arrives here signed in. The app never signs anyone out on its own for that reason —
it would sign them out of PlayChale too. **Sign out** here signs you out of both.

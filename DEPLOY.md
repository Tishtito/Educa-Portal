# Deploying Educa Staff

Production is **https://portal.educa.codepasstech.top**, a static build of this
repo served by nginx on the Codepasstech VPS. There is no server process: `npm
run build` produces a folder of files, and nginx serves it.

This covers the routine deploy after work lands on `dev`. First-time server
set-up is at the bottom, for reference only.

| | |
|---|---|
| Host | `tito@102.212.246.251`, SSH alias `codepasstech` |
| App directory | `/home/tito/educa-portal` |
| Served from | `/home/tito/educa-portal/current` (symlink to a release) |
| API it talks to | `https://educa-api.codepasstech.top/api` |
| Branch deployed | `dev` |

---

## The two things that bite

**1. Config is compiled in, not read at runtime.** `VITE_API_URL` and
`VITE_GOOGLE_WEB_CLIENT_ID` are baked into the JavaScript by Vite
(`src/lib/api/client.ts`, `src/lib/google.ts`). There is no `.env` on the
server, and editing one there would do nothing. Point the build at the wrong
API and the only fix is to rebuild.

**2. Users are running a service worker.** `vite-plugin-pwa` is set to
`registerType: 'prompt'`, so an installed client keeps the old app until the
person accepts the update prompt. A deploy is not "live for everyone" the
moment it lands. This is deliberate — it stops the app swapping underneath
someone halfway through entering marks.

---

## Deploy

**Push to `dev`. That is the whole deploy.**

GitHub Actions runs typecheck, lint, tests and the build, checks the right API
URL got compiled in, then streams the built `dist/` to the server over SSH. The
server unpacks it into a timestamped release and swaps the `current` symlink.
If the site does not return 200 afterwards, it rolls itself back.

```bash
git checkout dev
git add -A && git commit -m "..."
git push origin dev          # ~2 minutes to live
```

Watch it at <https://github.com/Tishtito/Educa-Portal/actions>.

`dev` is the only branch CI touches. `main` is dormant: nothing builds or
deploys from it.

### What the pipeline needs

Configured once, in the repo's Settings -> Secrets and variables -> Actions.

**Variables** (not secrets - every `VITE_` value compiles into the bundle and
is readable by anyone who opens DevTools):

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://educa-api.codepasstech.top/api` |
| `VITE_GOOGLE_WEB_CLIENT_ID` | the shared Google web client |
| `VITE_GOOGLE_IOS_CLIENT_ID` | only if an iOS client exists |

**Secrets:** `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_KNOWN_HOSTS`. The key is pinned on the server to a single forced
command (`educa-portal-deploy`) with no shell, no pty and no port forwarding, so a leaked
secret can only publish a release of this one app.

### Rollback

```bash
ssh codepasstech 'ls -1t <built-in function dir>/releases'
ssh codepasstech 'ln -sfn <built-in function dir>/releases/<previous> <built-in function dir>/current'
```

Three releases are kept. Clients that already accepted the new service worker
keep it until they fetch the older one.

---

## Deploying by hand

Only needed if Actions is down, or to test a build before committing. Everything
below is what the pipeline does for you.


Everything runs from this machine. The build happens locally on purpose: the
VPS has 1 vCPU and 1.9 GB RAM and already runs ~20 sites, so a `tsc` + `vite`
build there risks thrashing swap.

### 1. Get the code

```bash
cd ~/Projects/Codepasstech/Educa_Portal
git checkout dev && git pull
```

### 2. Make sure the production env file is present

Only needed once per machine — `.env.*.local` is gitignored, so it will not
arrive with a clone.

```bash
cat > .env.production.local <<'EOF'
VITE_API_URL=https://educa-api.codepasstech.top/api
VITE_GOOGLE_WEB_CLIENT_ID=211465295102-kkd9j9ls1aracs6musd39g5v2hust7ns.apps.googleusercontent.com
EOF
```

Vite picks `.env.production.local` up automatically for `npm run build`, and
leaves `.env.local` (your dev API) alone.

### 3. Check, then build

```bash
npm ci                  # lockfile-exact, unlike npm install
npm run typecheck
npm run test
rm -rf dist && npm run build
```

`npm run build` is `tsc -b && vite build`, so a type error stops the deploy.

### 4. Confirm what got baked in

Skipping this is the most common way a frontend deploy goes out broken — the
app loads fine and every API call quietly fails.

```bash
grep -rho 'https://educa-api[^"]*' dist/assets/*.js | sort -u | head -1
grep -rl 'localhost:8000' dist/ || echo "no localhost leaked"
```

Expect `https://educa-api.codepasstech.top/api` and `no localhost leaked`.

> Write that second check exactly as above. `grep -rl … | head` exits 0 even
> with no matches, so piping it into `head` inside an `if` reports a leak that
> is not there.

### 5. Ship it

```bash
TS=$(date +%Y%m%d%H%M%S)
ssh codepasstech "mkdir -p /home/tito/educa-portal/releases/$TS"
rsync -az --delete dist/ codepasstech:/home/tito/educa-portal/releases/$TS/
ssh codepasstech "ln -sfn /home/tito/educa-portal/releases/$TS /home/tito/educa-portal/current
                  chmod -R o+rX /home/tito/educa-portal"
```

Uploading to a fresh directory and swapping a symlink is what makes this safe:
the switch is atomic, so nobody can be served an `index.html` that references
assets still in flight. **No nginx reload is needed** — `open_file_cache` is
off, so nginx follows the symlink per request.

### 6. Tidy up

```bash
ssh codepasstech "cd /home/tito/educa-portal/releases && ls -1t | tail -n +4 | xargs -r rm -rf"
```

Keeps the three most recent releases, which is what makes rollback instant.

---

## Verify

```bash
curl -sI https://portal.educa.codepasstech.top/ | head -1          # 200
curl -sI http://portal.educa.codepasstech.top/  | head -1          # 301

# Deep links must return the app shell, not 404
for p in / /marking /marklist /auth/google/callback /nonexistent; do
  printf "%-24s %s\n" "$p" \
    "$(curl -s -o /dev/null -w '%{http_code}' https://portal.educa.codepasstech.top$p)"
done

# Entry points must not be cached; hashed assets must be
curl -sI https://portal.educa.codepasstech.top/sw.js | grep -i cache-control   # no-cache

# Every asset the shell references actually exists
curl -s https://portal.educa.codepasstech.top/ | grep -oE '/assets/[A-Za-z0-9._-]+' | sort -u |
while read -r a; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "https://portal.educa.codepasstech.top$a")
  [ "$c" = 200 ] || echo "BROKEN $c $a"
done
```

Then in a browser: hard-reload, sign in, open a class, save a mark, and confirm
the mark list updates. That one pass exercises the app, the API, Sanctum, the
tenant scope and the `results` queue worker together.

---

## Rolling back

```bash
ssh codepasstech "ls -1t /home/tito/educa-portal/releases"
ssh codepasstech "ln -sfn /home/tito/educa-portal/releases/<previous> /home/tito/educa-portal/current"
```

Instant, and no rebuild. Note that clients who already accepted the newer
service worker keep it until the older one is fetched again.

---

## When the API side also changes

Only relevant if this deploy changes the hostname, adds an origin, or touches
Google sign-in. All of it lives in `/home/tito/educa/.env` on the same box:

| Key | Current value |
|---|---|
| `EDUCA_PORTAL_URL` | `https://portal.educa.codepasstech.top` |
| `CORS_ALLOWED_ORIGINS` | must contain `https://portal.educa.codepasstech.top` |
| `GOOGLE_WEB_CLIENT_ID` | must match `VITE_GOOGLE_WEB_CLIENT_ID` here |

The API caches its config, so an edit does nothing until:

```bash
ssh codepasstech "cd /home/tito/educa && php8.4 artisan config:cache && php8.4 artisan queue:restart"
```

A new origin also needs adding in Google Cloud Console (authorised JavaScript
origin, plus `/auth/google/callback` as a redirect URI) or the sign-in popup is
refused before it ever reaches the API.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| App loads, every API call fails with a CORS error | The origin is missing from `CORS_ALLOWED_ORIGINS`, or `config:cache` was not re-run |
| App loads, API calls go to `localhost:8000` | Built without `.env.production.local` — rebuild |
| Blank page, console shows 404s for `/assets/…` | Symlink points at a release that was pruned, or rsync was interrupted |
| A deep link 404s | The `try_files $uri $uri/ /index.html` fallback is missing from the vhost |
| Users still see the old version | Expected: `registerType: 'prompt'` waits for them to accept |
| Old version returns after a hard reload | `index.html` or `sw.js` got a long `Cache-Control` — they must stay `no-cache` |
| Google button does nothing | Origin not authorised in Google Cloud Console |

Logs: `/var/log/nginx/educa-portal.{access,error}.log`.

---

## Server set-up (already done)

For reference, should it ever need rebuilding.

The host is **grey-clouded** in Cloudflare (DNS only, A → `102.212.246.251`).
Cloudflare's free Universal SSL covers `codepasstech.top` and
`*.codepasstech.top` but **not** a third-level name like this one, so the edge
would present no certificate at all. Bypassing the proxy lets Let's Encrypt
serve it from the origin instead — and the origin then sees real client IPs.

- `/etc/nginx/sites-available/portal.educa.codepasstech.top` — static vhost,
  SPA fallback, gzip, security headers
- `/etc/nginx/conf.d/educa-portal-map.conf` — `Cache-Control` as a `map`, so
  the server block needs one `add_header`. An `add_header` inside a `location`
  discards every `add_header` inherited from the parent, which is how security
  headers silently go missing.
- Certificate from `certbot --nginx -d portal.educa.codepasstech.top --redirect`,
  renewed by the box's existing `certbot.timer`.

Deliberately **no `Cross-Origin-Opener-Policy`** header: Google sign-in returns
through a popup that needs `window.opener`, and `COOP: same-origin` breaks it.

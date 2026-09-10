# Deploying to a Linux VM

A runbook for putting the site on your own VM, in two stages: **first on a bare IP over
HTTP**, then **on a domain with HTTPS**. Stage 2 does not undo stage 1 — it adds to it.

Everything here assumes Debian or Ubuntu. On RHEL/Alma the package names differ (`nginx` is
the same, `ufw` becomes `firewalld`) and SELinux needs `sudo setsebool -P httpd_read_user_content 1`
if you put the webroot outside `/var/www`.

## The shape of it

The site is static files. There is no application server, no database, no PHP, and nothing on
the VM ever executes site code — nginx reads files off disk and sends them. That means:

- **The VM needs no Node.** You build locally; `npm run deploy` rsyncs the finished `_site/`.
- **The VM is disposable.** It holds nothing that isn't in git. If it burns down, make a new
  one, re-run this document, and `npm run deploy`. Do not treat it as something to back up.
- **`tools/deploy.sh` already does the deploying.** It was written for the CS server but is
  host-agnostic: it reads `deploy.env` and rsyncs. Stage 1 is mostly about giving it somewhere
  to rsync *to*.

---

# Stage 1 — on the IP, over HTTP

## 1. Prepare the VM

SSH in as your user, then:

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx
sudo mkdir -p /var/www/tdk
sudo chown -R "$USER:$USER" /var/www/tdk
```

That `chown` is what lets `rsync` write as you, over plain SSH, with no `sudo` and no root
login. Keep it that way.

## 2. Configure nginx

Write `/etc/nginx/sites-available/tdk`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/tdk;
    index index.html;

    error_page 404 /404.html;

    # Eleventy writes /news/index.html etc., so directory URLs resolve as-is
    # and nginx redirects /news to /news/ by itself.
    location / {
        try_files $uri $uri/ =404;
    }

    # Long cache on fingerprint-free but rarely-changing assets.
    # NOTE: `expires` sets Cache-Control on its own. Do not add an `add_header`
    # here — see "the add_header trap" below.
    location ~* ^/(assets|css|js)/ {
        expires 30d;
    }

    server_tokens off;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" always;

    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/xml application/rss+xml image/svg+xml;
}
```

Enable it and drop the stock default site:

```sh
sudo ln -s /etc/nginx/sites-available/tdk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### The `add_header` trap

nginx does **not** merge `add_header` down into a `location` that has its own `add_header`.
The moment you add one inside `location ~* ^/(assets|css|js)/`, every security header above
silently stops being sent for those paths. This is why the asset block uses `expires` alone.
If you ever need a header in a location block, repeat all the others there too.

## 3. Open the firewall

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp     # for stage 2; harmless now
sudo ufw --force enable
sudo ufw status
```

## 4. Point the deploy script at it

On your laptop:

```sh
ssh-copy-id your-vm-user@YOUR_IP      # key auth, so rsync never prompts
cp deploy.env.example deploy.env
```

Fill in `deploy.env`:

```sh
DEPLOY_HOST=YOUR_IP
DEPLOY_USER=your-vm-user
DEPLOY_PATH=/var/www/tdk
```

`deploy.env` is gitignored and must stay that way — it names your server and account.

## 5. Deploy

```sh
npm run deploy
```

This validates the content, builds `_site/`, prints the `rsync` command, and runs it. Open
`http://YOUR_IP/` and you should have the site.

> ⚠️ **`rsync --delete`.** Everything in `DEPLOY_PATH` that is not in `_site/` is deleted on
> every deploy. `/var/www/tdk` must belong to this site and nothing else. Never point
> `DEPLOY_PATH` at a home directory, a shared webroot, or `/`.

## What to expect on a bare IP

- **The browser will say "Not secure", and that is unavoidable.** Certificate authorities do
  not issue publicly-trusted certificates for bare IP addresses. A self-signed certificate is
  worse than plain HTTP here: it trains people to click through a full-page warning. Stay on
  HTTP until you have a hostname.
- **Every link works.** The site is served from the webroot, so its root-relative paths
  (`/assets/…`, `/css/site.css`) resolve correctly. This is the thing that would have broken
  on a GitHub Pages project subpath.
- **`feed.xml` and `sitemap.xml` will be wrong**, and only those two. They embed absolute URLs
  built from `site.url` in `content/site.yaml`, which still says `https://tdk.cs.technion.ac.il`.
  Harmless while this is a staging box; fixed in stage 2.

---

# Stage 2 — domain and HTTPS

## 1. DNS

Create an `A` record pointing your hostname at the VM's IP (and an `AAAA` record if the VM has
IPv6). For a `*.cs.technion.ac.il` name this is a request to CS IT; for a domain you own it is
a change in your registrar's DNS panel.

Wait for it to resolve before going further — certbot's validation will fail otherwise:

```sh
dig +short tdk.example.org        # must print the VM's IP
```

## 2. Tell nginx the name

In `/etc/nginx/sites-available/tdk`, replace `server_name _;` with your hostname:

```nginx
server_name tdk.example.org;
```

```sh
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Get the certificate

```sh
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tdk.example.org
```

Choose the redirect option when asked. Certbot edits the server block in place — adding
`listen 443 ssl`, the certificate paths, and a second server block that 301s port 80 to HTTPS —
and installs a systemd timer that renews automatically. Your security headers and `location`
blocks are left alone.

Check the renewal path actually works:

```sh
sudo certbot renew --dry-run
```

## 4. Add HSTS — only now

Once you have loaded the site over HTTPS and confirmed it works, add to the server block:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

**Order matters.** HSTS tells browsers to refuse plain HTTP for this hostname for a year. Add
it before HTTPS works and you lock people out of your own site, with no way to reach them.

Do **not** add `preload` unless you have thought hard about it. Preloading bakes the hostname
into browsers' compiled-in lists; removal takes months and is not something you can expedite.
For a lab site the ordinary header is the right amount.

## 5. Update `site.url` and redeploy

In `content/site.yaml`:

```yaml
url: https://tdk.example.org
```

```sh
npm run build && npm run linkcheck
npm run deploy
```

This is a content change, so `npm run validate` runs as part of the build. It fixes the
absolute URLs in `feed.xml` and `sitemap.xml`.

---

# Security

## What you get for free

The largest security decision was already made: **this site replaced WordPress.** There is no
PHP, no database, no plugin surface, no admin login, and no upload directory. The category of
compromise that dominates university web hosting — an unpatched plugin on a public CMS — simply
does not apply to a directory of HTML files. Keep it that way: resist anything that puts a
dynamic endpoint on this VM.

Two consequences worth stating plainly:

- **There is no data to steal.** Everything served is public by definition, and the VM stores
  no submissions, sessions, or credentials.
- **The worst realistic outcome is defacement**, and the recovery is `npm run deploy` from a
  clean checkout, which restores byte-for-byte what git says the site should be.

## SSH is the real attack surface

It is the only authenticated way in, so it is the thing to harden. In `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
```

```sh
sudo systemctl reload ssh
```

Do this **after** `ssh-copy-id` has worked, and keep your existing session open while you test
a new one — a broken sshd config plus a closed session means a console rescue through your
provider's panel.

Add `fail2ban` to stop the constant background brute-forcing from filling your logs:

```sh
sudo apt install -y fail2ban        # ships with a sane sshd jail enabled
```

## Keep it patched without thinking about it

```sh
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

This is the single highest-value thing on this page after key-only SSH. An unattended VM that
nobody patches is how a static site becomes someone else's problem.

## Least privilege for deploys

- Deploy as an **ordinary user that owns `/var/www/tdk`** — never as root, and never with
  `rsync --rsync-path="sudo rsync"`. Nothing about copying HTML needs privilege.
- That user needs no `sudo` for day-to-day deploys. Keep `sudo` for the occasional
  `apt upgrade` and nginx reload.
- If several people deploy, give each their **own** account and SSH key rather than sharing
  one. Revoking a key is then a one-line change.

## The headers, and why these

The `Content-Security-Policy` in the config above is strict — `'self'` everywhere, no
`'unsafe-inline'` — and it is strict *because the site can afford it*. The build emits no
inline `<script>`, no inline `<style>`, no `style=` attributes, no forms and no iframes, and
every stylesheet, script and image is local. The several hundred external URLs in the site are
all ordinary `<a href>` links, which CSP does not restrict.

That policy is therefore free today, but it is a constraint on future work: **an inline script,
an embedded YouTube player, or a CDN font will be blocked and will fail silently.** That is the
intended behaviour and it matches the project's own rule that the site makes no external
requests at runtime. If you ever deliberately add one, widen the policy in the same commit.

The rest:

- `X-Content-Type-Options: nosniff` — stops a browser from second-guessing a declared MIME type.
- `Referrer-Policy` — the lab's URLs stop leaking full paths to the many external sites linked
  from publication pages.
- `frame-ancestors 'none'` — nobody can frame the site. This supersedes `X-Frame-Options`,
  which is why it is not also listed.
- `server_tokens off` — nginx stops advertising its exact version.

Verify after any nginx change:

```sh
curl -sI https://tdk.example.org | grep -iE 'content-security|x-content-type|referrer|strict-transport'
curl -sI https://tdk.example.org/css/site.css | grep -i content-security   # the add_header trap
```

## What not to bother with

- **A WAF, ModSecurity, or Cloudflare in front.** They defend against attacks on dynamic code.
  There is none.
- **Backups of the VM.** Git is the backup. Rebuilding is a documented ten-minute exercise.
- **Anything on port 443 other than nginx.** Keep the firewall at three open ports.

---

# Routine operations

| Task | Command |
|---|---|
| Deploy a change | `npm run deploy` (from your laptop) |
| Check links before a structural change | `npm run build && npm run linkcheck` |
| Reload after an nginx edit | `sudo nginx -t && sudo systemctl reload nginx` |
| See what nginx is serving | `sudo tail -f /var/log/nginx/access.log` |
| Certificate status | `sudo certbot certificates` |

## When something is wrong

**A page 404s that should exist.** Confirm it exists in `_site/` locally. If it does, the
deploy did not run or `DEPLOY_PATH` is wrong; `ls /var/www/tdk` on the VM.

**CSS is missing and the page is unstyled.** Almost always the CSP or a path problem — open the
browser console, which names the blocked resource and the directive that blocked it.

**The site is stale after a deploy.** `expires 30d` is doing its job on `/css/` and `/assets/`.
Hard-reload (Cmd/Ctrl+Shift+R). Visitors will pick it up as caches expire; if you change the
stylesheet often and that becomes annoying, lower it to `expires 1d`.

**Certbot renewal failed.** Usually DNS moved or port 80 closed. `sudo certbot renew --dry-run`
prints the reason. Renewal needs port 80 reachable even though the site is on 443.

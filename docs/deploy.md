# Deploying

The site is published by **GitHub Pages**, built by GitHub Actions on every push to `main`.
There is no server to log into and nothing to rsync: `git push` *is* the deploy.

`.github/workflows/deploy.yml` runs `npm ci`, `npm run build` (which validates the content
first), `npm run linkcheck`, and publishes `_site/`. If validation or the link check fails,
nothing is published and the previous version stays live.

## Publishing a change

```sh
git add -A && git commit -m "…" && git push
```

Then watch it land: the **Actions** tab, or `gh run watch`. A build takes about a minute.

## One-time setup

1. **The repository must be named `techniontdk.github.io`.** GitHub Pages serves a repo of
   that name at the domain root; any other name is served under `/tdk-website/`, and every
   link and asset on this site is root-relative (`/css/site.css`, `/assets/…`), so a subpath
   would load the site unstyled with every link broken. Rename it under
   Settings → General → Repository name, then point the local clone at the new URL:

   ```sh
   git remote set-url origin https://github.com/TechnionTDK/techniontdk.github.io.git
   ```

2. **The repository must be public.** Pages is not available on private repositories under
   the free plan. That costs nothing here: everything in `content/` is published on the site
   anyway, and no credential has ever been committed — `deploy.env` was gitignored from the
   first commit and is now gone entirely. Keep it that way: nothing secret belongs in this repo.

3. **Settings → Pages → Source: GitHub Actions.** Not "Deploy from a branch" — a `*.github.io`
   repo defaults to serving its root through Jekyll, which would publish the README as the
   home page instead of `_site/`.

4. Push to `main`. The site appears at <https://techniontdk.github.io/>.

## The real address

The lab's address stays `tdk.cs.technion.ac.il`. Getting visitors there is a request to CS IT,
and how they do it decides whether one more thing is needed here:

- **A DNS `CNAME` record** pointing `tdk.cs.technion.ac.il` at `techniontdk.github.io` — the
  right answer. Then set Settings → Pages → Custom domain to `tdk.cs.technion.ac.il` (GitHub
  commits a `CNAME` file for you) and tick **Enforce HTTPS** once the certificate is issued,
  which takes a few minutes. Nothing else changes: the site is still served from a domain
  root, so every path keeps working, and `site.url` in `content/site.yaml` is already correct.
- **An HTTP redirect** from the CS web server to `techniontdk.github.io` — works, but the
  github.io name is what visitors see and what search engines index. If it ends up being this,
  change `url:` in `content/site.yaml` to match, or `feed.xml` and `sitemap.xml` will point at
  a domain the site is not served from.

Until one of those is in place, `feed.xml` and `sitemap.xml` are the only wrong things on the
site — they embed `https://tdk.cs.technion.ac.il` from `site.url`. Harmless in the meantime.

## Security

Pages serves static files over HTTPS from GitHub's CDN. There is no server of ours, no PHP, no
database, no admin login and no upload directory — the WordPress category of compromise does
not apply, and the only way to change the site is a push to `main`. So: protect the GitHub
account (2FA), and that is the whole attack surface.

The trade: Pages sets its own headers, so the site cannot carry a `Content-Security-Policy`.
It costs nothing today — the build emits no inline script or style, no forms, no iframes, and
loads nothing from an external host. Keep it that way, per the project's own rule, and there
is nothing for a CSP to defend.

## When something is wrong

**The build failed.** The Actions log names the file. Almost always `npm run validate` — a
slug that resolves to nothing, an unknown field, a missing image. Reproduce it locally with
`npm run build && npm run linkcheck`; it is the same command.

**The push succeeded but the site is unchanged.** Check Settings → Pages says *GitHub Actions*,
not a branch. Otherwise it is the CDN cache — hard-reload (Cmd/Ctrl+Shift+R).

**The site is unstyled and every link 404s.** The repo is not named `techniontdk.github.io`,
so it is being served from `/tdk-website/`. See step 1.

**Custom domain shows a certificate error.** GitHub issues the certificate after the DNS record
resolves; give it a few minutes, then re-tick Enforce HTTPS.

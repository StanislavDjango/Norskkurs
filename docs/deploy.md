# Deployment Guide

## Server preparation
- Install dependencies: `sudo apt-get update && sudo apt-get install -y git docker.io docker-compose-plugin`.
- Add your user (e.g., `stanislav`) to the `docker` group: `sudo usermod -aG docker stanislav` and re-login.
- Clone the repo to `/srv/norskkurs/Norskkurs` (or set your own path) and ensure the deploy script is executable: `chmod +x scripts/deploy.sh`.
- Keep SSH access locked down (key-based auth, restricted sudo). Open only the SSH port you plan to use.

## GitHub Secrets
Set these in the repository settings → Secrets and variables → Actions:

Required:
- `DEPLOY_USER`: SSH user (e.g., `stanislav`).
- `DEPLOY_SSH_KEY`: private SSH key in OpenSSH format with access to the repo directory.
- `DEPLOY_APP_DIR`: deployment path, e.g., `/srv/norskkurs/Norskkurs`.

Cloudflare Access (recommended for SSH over the tunnel):
- `CF_ACCESS_HOSTNAME`: `ssh.norskkurs.xyz` (Access application hostname).
- `CF_ACCESS_CLIENT_ID`: service token ID from the Access app.
- `CF_ACCESS_CLIENT_SECRET`: service token secret from the Access app.

Important note for this project: the hosting ISP blocks direct SSH from the public internet, so **GitHub Actions cannot достучаться до сервера напрямую по `DEPLOY_HOST`/`DEPLOY_PORT`**. Для автодеплоя из CI требуется рабочий Cloudflare Access‑туннель `ssh.norskkurs.xyz` и корректные `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`.

### Cloudflare Access quick setup
1. In Cloudflare Zero Trust → Access → Applications create a self-hosted app for `ssh.norskkurs.xyz` pointing to the existing SSH tunnel.
2. Add an Access policy that allows the service token.
3. Create a service token in Zero Trust → Access → Service tokens; copy the ID/secret into GitHub secrets (`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`).
4. Ensure the DNS record for `ssh.norskkurs.xyz` points to the tunnel (already configured on the server via `.cloudflared/config-ssh.yml`).

Fallback if you want to bypass Cloudflare Access (public SSH):
- `DEPLOY_HOST`: server IP or hostname (used when `CF_ACCESS_HOSTNAME` is empty).
- `DEPLOY_PORT`: SSH port (default `22`).

For this server, this fallback is only suitable for **manual SSH from machines that already have network access to the server** (локальная сеть, VPN, Tailscale). From GitHub Actions it will typically fail with timeouts because the ISP blocks direct SSH.

## How the workflow deploys
On `push` to `main` (or manual `workflow_dispatch`), GitHub Actions:
1) Installs `cloudflared` so SSH can go through Cloudflare Access.  
2) Writes the SSH key/config; if Access secrets are set, it uses `cloudflared access ssh --hostname ssh.norskkurs.xyz` as a ProxyCommand. Otherwise it falls back to direct SSH to `DEPLOY_HOST`.  
3) Runs `scripts/deploy.sh` inside `DEPLOY_APP_DIR`, which fetches `origin/main`, rebuilds Docker images, runs migrations and collectstatic, then restarts the stack and prunes dangling images.

## Manual deployment
From any machine with SSH access:
```bash
ssh -p 22 stanislav@<DEPLOY_HOST> "cd /srv/norskkurs/Norskkurs && ./scripts/deploy.sh"
```
Override the path if you set `DEPLOY_APP_DIR` differently. Ensure the script is executable before first run.

## Safety and troubleshooting
- Verify `docker compose` works without sudo for the deploy user. If not, fix group membership before relying on CI.
- Keep the SSH key used in `DEPLOY_SSH_KEY` read-only and scoped only to this server; rotate it if compromised.
- If migrations fail, the script stops (set `set -euo pipefail`). Re-run after fixing the issue; logs stay on the server.
- Cloudflare Access service tokens are treated like passwords; rotate them together with SSH keys when needed.
- Hardening option: add a static known_hosts entry for `ssh.norskkurs.xyz` or the server IP in the workflow instead of relying on `StrictHostKeyChecking no`.

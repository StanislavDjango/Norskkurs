# Deployment Guide

## Server preparation
- Install dependencies: `sudo apt-get update && sudo apt-get install -y git docker.io docker-compose-plugin`.
- Add your user (e.g., `stanislav`) to the `docker` group: `sudo usermod -aG docker stanislav` and re-login.
- Clone the repo to `/srv/norskkurs/Norskkurs` (or set your own path) and ensure the deploy script is executable: `chmod +x scripts/deploy.sh`.
- Keep SSH access locked down (key-based auth, restricted sudo). Open only the SSH port you plan to use.

## GitHub Secrets (required)
Set these in the repository settings → Secrets and variables → Actions:
- `DEPLOY_HOST`: server IP or hostname.
- `DEPLOY_PORT`: SSH port (default `22`).
- `DEPLOY_USER`: SSH user (e.g., `stanislav`).
- `DEPLOY_SSH_KEY`: private SSH key in OpenSSH format with access to the repo directory.
- `DEPLOY_APP_DIR`: deployment path, e.g., `/srv/norskkurs/Norskkurs`.

## How the workflow deploys
On `push` to `main` (or manual `workflow_dispatch`), GitHub Actions:
1) Opens an SSH session to the server using the provided key/port/user.  
2) Runs `scripts/deploy.sh` inside `DEPLOY_APP_DIR`, which fetches `origin/main`, rebuilds Docker images, runs migrations and collectstatic, then restarts the stack and prunes dangling images.

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
- For host key verification, the workflow records the host fingerprint with `ssh-keyscan`. If the host changes, update the secret or known_hosts entry to avoid MITM risks.

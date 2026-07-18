#!/bin/sh
# Idempotent prod bootstrap: databases + env file scaffold (issue #76).
set -e
cd ~/shelfready

for db in shelfready_prod umami; do
  if ! docker compose exec -T postgres psql -U shelfready -d shelfready -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    docker compose exec -T postgres createdb -U shelfready "$db"
    echo "created database $db"
  fi
done

if [ ! -f .env.prod ]; then
  cat > .env.prod <<ENV
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=https://useshelfready.com
AUTH_TRUST_HOST=true
CREDENTIALS_KEY=$(openssl rand -hex 32)
ENV
  # Share the email key with staging if present.
  grep '^SMTPFAST_API_KEY=' .env >> .env.prod 2>/dev/null || true
  chmod 600 .env.prod
  echo "created .env.prod"
fi

grep -q '^UMAMI_APP_SECRET=' .env || echo "UMAMI_APP_SECRET=$(openssl rand -hex 32)" >> .env

# Inngest self-hosted server keys (issue #129) — shared by the inngest
# service and both apps via compose environment wiring.
grep -q '^INNGEST_EVENT_KEY=' .env || echo "INNGEST_EVENT_KEY=$(openssl rand -hex 32)" >> .env
grep -q '^INNGEST_SIGNING_KEY=' .env || echo "INNGEST_SIGNING_KEY=signkey-prod-$(openssl rand -hex 32)" >> .env

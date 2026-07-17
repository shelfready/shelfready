# SMTPfast sending domain for useshelfready.com, managed as code
# (issues #48/#30). One `terraform apply` registers the domain, publishes
# DKIM/SPF/DMARC/MAIL-FROM records to Cloudflare, and mints the scoped
# send-only API key the app uses.
#
# Auth (env vars, never committed):
#   SMTPFAST_API_KEY      account key from the SMTPfast dashboard
#   CLOUDFLARE_API_TOKEN  token scoped to Zone.DNS:Edit for useshelfready.com
#
# State is local and gitignored — it contains the minted key. See README.

terraform {
  required_providers {
    smtpfast = {
      source  = "smtpfast/smtpfast"
      version = "~> 0.1"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }
}

provider "smtpfast" {}

provider "cloudflare" {}

data "cloudflare_zone" "main" {
  name = "useshelfready.com"
}

resource "smtpfast_domain" "sending" {
  domain = "useshelfready.com"
}

# DKIM CNAMEs, SPF + DMARC TXT, and MAIL-FROM MX/TXT on the bounce
# subdomain, exactly as SMTPfast hands them back. DNS-only (grey cloud):
# mail auth records must never be proxied.
resource "cloudflare_record" "smtpfast" {
  for_each = {
    for idx, rec in smtpfast_domain.sending.dns_records : idx => rec
  }

  zone_id = data.cloudflare_zone.main.id
  type    = each.value.type
  name    = each.value.name
  content = each.value.content
  ttl     = 3600
  proxied = false
}

# Send-only key for the app (magic links now, M5 alerts later). The
# secret exists only in local state + the VPS .env.
resource "smtpfast_api_key" "app_send" {
  name   = "shelfready-app-send"
  scopes = ["emails:send"]
}

output "domain_status" {
  description = "pending until DNS propagates; re-check with terraform refresh"
  value       = smtpfast_domain.sending.status
}

output "app_send_api_key" {
  description = "goes into the VPS deploy/.env as SMTPFAST_API_KEY"
  value       = smtpfast_api_key.app_send.key
  sensitive   = true
}

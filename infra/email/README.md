# Email infrastructure (SMTPfast + Cloudflare)

Registers `useshelfready.com` as a SMTPfast sending domain, publishes its
DKIM/SPF/DMARC/MAIL-FROM records to Cloudflare, and mints the app's
send-only API key — one apply, tracked in git (issues #30/#48).

## Apply

```sh
export SMTPFAST_API_KEY=…       # account key, SMTPfast dashboard
export CLOUDFLARE_API_TOKEN=…   # Zone.DNS:Edit on useshelfready.com
terraform init
terraform apply
terraform output -raw app_send_api_key   # → VPS deploy/.env SMTPFAST_API_KEY
```

Domain verification flips from `pending` to `verified` once DNS
propagates (`terraform refresh` + check `domain_status`, or POST
`/v1/domains/:id/verify`).

## Notes

- State is local and gitignored (it contains the minted key). This is a
  one-machine setup by design; move to encrypted remote state if more
  operators ever need it.
- DMARC starts at `p=none` (SMTPfast's recommendation); tighten to
  `quarantine`/`reject` after delivery reports look clean.
- Rotate the app key by tainting `smtpfast_api_key.app_send` and
  re-applying, then updating the VPS `.env`.

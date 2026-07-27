# App Store Connect API key

Put your downloaded key file here, named exactly as Apple provides it, e.g.:

    AuthKey_ABC123XYZ.p8

The `.p8` file is a PRIVATE secret and is git-ignored (`*.p8` in `.gitignore`).
Never commit it, share it, or paste it anywhere. If it leaks, revoke it in
App Store Connect → Users and Access → Integrations and generate a new one.

The Fastfile reads the key via:
- `ASC_KEY_ID`    – the Key ID
- `ASC_ISSUER_ID` – the Issuer ID
- `ASC_KEY_PATH`  – optional; defaults to the single `AuthKey_*.p8` in this folder

Set those in `ios/fastlane/.env` (also git-ignored) or your shell.

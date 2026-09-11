# Localized image assets

These PNGs are provisional copies of the Spanish artwork so the app keeps working while the final localized artwork is produced.

Replace each file with the designer's version, keeping the exact filename and PNG format:

- `setup-title.<lang>.png`
- `tiempo.<lang>.png`
- `pass-mobile.<lang>.png`
- `pass-phone.<lang>.png`
- `round1-rules.<lang>.png`
- `round2-rules.<lang>.png`
- `round3-rules.<lang>.png`
- `card-describelo.<lang>.png`
- `card-una-palabra.<lang>.png`
- `card-hazlo.<lang>.png`

Supported language suffixes are `es`, `en`, `fr`, and `pt`. Keep the original dimensions and transparent background where present. The app selects these assets in `lib/localizedAssets.ts` from `state.language`.

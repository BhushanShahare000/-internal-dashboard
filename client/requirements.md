## Packages
(none needed)

## Notes
- Using the standard cookie-based authentication via /api/login and /api/user.
- Tailwind config needs to have `font-sans` and `font-display` updated to match the custom fonts in index.css.
- Time entries have a decimal timeSpent (0.5 or 1). It is rendered and parsed carefully to avoid string/number mismatches.

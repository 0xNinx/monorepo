## Summary

This PR updates the contributor setup documentation so it matches the repository’s actual CI workflow from a clean clone.

## Linked issue

Closes #1356

## Changes

- Clarified that the frontend uses pnpm 9.15.5 and that the authoritative lockfile is frontend/pnpm-lock.yaml.
- Documented the backend setup using npm ci and the required backend environment variables for local development.
- Added the exact CI-equivalent commands for frontend, backend, and contracts so contributors can verify locally before pushing.
- Updated the root and per-package README files to reflect the correct package manager and toolchain versions.

## Checklist

- [x] I tested locally
- [x] I did not commit secrets
- [x] I updated docs if needed

## Summary

Remove the backend health widget from the public site header so public visitors no longer see an operator diagnostic in the marketing UI, and relocate the component to the admin health page as an operator-facing surface.

## Changes

- Removed the backend health compact widget from the public header across the marketing/site shell.
- Kept the component available on the admin health page so operators can still access it in an appropriate surface.
- Gated the health polling so it only runs when the health widget is actually visible/eligible, preventing anonymous public page loads from issuing health checks.
- Added a regression test covering the public header to ensure the widget does not render there again.

## Checklist

- [x] The public header no longer renders a backend health indicator.
- [x] Anonymous/public page loads no longer trigger the health request from the header.
- [x] The health component remains available on the admin health surface.
- [x] Frontend lint and build pass locally.

Closes #1316

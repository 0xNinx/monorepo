# Frontend Form Validation & Error Handling Convention

This convention is the baseline for all frontend forms.

## Audited forms in this change

- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/verify-otp/page.tsx`
- Shared default behavior in `hooks/useAppForm.ts`

## Required implementation pattern

1. **Schema source**: use `lib/formSchemas.ts` (no per-page standalone schema files).
2. **Validation timing**: use React Hook Form with `mode: "onBlur"` and `reValidateMode: "onBlur"`.
3. **Server error mapping**: parse backend `details/fieldErrors` and map each server field error to `setError(field, ...)`.
4. **Accessible errors**:
   - Field errors must be linked with `aria-describedby`.
   - Invalid controls must set `aria-invalid`.
   - Error text must use `role="alert"`.
5. **Submission safety**:
   - Disable all submit controls while `isSubmitting` is true.
   - Prevent duplicate submits by relying on RHF submit state and in-handler guard.
6. **Focus and recovery**:
   - Keep `shouldFocusError: true` so failed submit moves focus to the first invalid field.
   - Preserve user-entered values after failed submit.
   - Clear field-level/server errors when users edit affected fields.

## Utility for server error handling

Use `lib/formErrors.ts`:

- `parseFormError(error, fallbackMessage)` returns a generic user message + field error map.
- `extractFieldErrors(details)` supports both flat and `fieldErrors` response shapes.

## Note on idempotency

Forms that create durable records or move money must include an idempotency key in request headers/body. Auth OTP request/verify flows are non-monetary and are unchanged in this issue.

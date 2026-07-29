import { parseBackendError } from "@/lib/errors";

export type FieldErrors = Record<string, string>;

function toMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

export function extractFieldErrors(details: unknown): FieldErrors {
  if (!details || typeof details !== "object") {
    return {};
  }

  const rawDetails = details as Record<string, unknown>;
  const maybeFieldErrors = rawDetails.fieldErrors;
  const source =
    maybeFieldErrors && typeof maybeFieldErrors === "object" && !Array.isArray(maybeFieldErrors)
      ? (maybeFieldErrors as Record<string, unknown>)
      : rawDetails;

  return Object.fromEntries(
    Object.entries(source)
      .map(([field, value]) => [field, toMessage(value)])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

export function parseFormError(error: unknown, fallbackMessage: string): {
  message: string;
  fieldErrors: FieldErrors;
} {
  const parsed = parseBackendError(error, fallbackMessage);
  const details =
    parsed.details ??
    (error && typeof error === "object" && "details" in error
      ? (error as { details?: unknown }).details
      : undefined);
  const fieldErrors = extractFieldErrors(details);

  return {
    message: parsed.userMessage || fallbackMessage,
    fieldErrors,
  };
}

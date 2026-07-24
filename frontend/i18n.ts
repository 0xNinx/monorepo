import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// Supported locales
export const locales = ["en", "es", "fr", "ar", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// RTL languages
export const rtlLocales: Locale[] = ["ar"];

export default getRequestConfig(async ({ locale }) => {
  // If no locale is provided or it's invalid, fallback to defaultLocale instead of throwing notFound
  const activeLocale = locale && locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    locale: activeLocale,
    messages: (await import(`./messages/${activeLocale}.json`)).default,
  };
});

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "./i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for locale in cookie
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const validCookieLocale =
    cookieLocale && locales.includes(cookieLocale as typeof locales[number]);

  // Get preferred locale from Accept-Language header as fallback
  const acceptLanguage = request.headers.get("Accept-Language") || "";
  const browserLocale = acceptLanguage.split(",")[0]?.split("-")[0]?.toLowerCase() || "";
  const validBrowserLocale = browserLocale && locales.includes(browserLocale as typeof locales[number]);

  // Determine active locale: cookie > browser > default
  const locale = validCookieLocale
    ? cookieLocale
    : validBrowserLocale
      ? browserLocale
      : defaultLocale;

  // Set the NEXT_LOCALE cookie if it's not already set or has changed
  const response = NextResponse.next();
  if (!cookieLocale || cookieLocale !== locale) {
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

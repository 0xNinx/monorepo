import React from "react"
import type { Metadata } from 'next'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NetworkStatusBanner } from '@/components/network-status-banner'
import SkipLink from '@/components/SkipLink'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'
import { ThemeProvider } from '@/components/theme-provider'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { FeatureFlagProvider } from '@/lib/featureFlags'
import { WalletProvider } from '@/contexts/WalletContext'
import { CookieConsentProvider } from '@/contexts/CookieConsentContext'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { NextIntlClientProvider } from "next-intl"
import enMessages from "../messages/en.json"

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Shelterflex - Rent Now, Pay Later',
  description: 'The smarter way to pay your rent. Split your rent payments into affordable monthly installments.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ff6b35" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <FeatureFlagProvider>
            <CurrencyProvider>
              <WalletProvider>
              <CookieConsentProvider>
              <ErrorBoundary>
                <ServiceWorkerRegister />
                <SpeedInsights />
                <PerformanceMonitor />
                <NetworkStatusBanner />
                <SkipLink />
                <Header />
                <div id="main-content" />
                {children}
                <Footer />
                <Toaster />
                <CookieConsentBanner />
              </ErrorBoundary>
              </CookieConsentProvider>
              </WalletProvider>
            </CurrencyProvider>
            </FeatureFlagProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import { NetworkBanner } from "./components/ui/NetworkBanner";
import { CommandPalette } from "./components/ui/CommandPalette";
import MetaTags from "./components/ui/MetaTags";
import { useHashRoute } from "./hooks/useHashRoute";
import { useMetaLogger } from "./hooks/useMetaLogger";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import Home from "./pages/Home";
import Intake from "./pages/Intake";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AuditPresentation from "./pages/AuditPresentation";
import Funding from "./pages/Funding";
import type { AppRoute } from "./types/home";

const AuditConsole = lazy(() => import("./pages/AuditConsole"));
const RealAuditDashboard = lazy(() => import("./pages/RealAuditDashboard"));
const SampleReport = lazy(() => import("./pages/SampleReport"));

const SkeletonPage = () => (
  <div className="flex min-h-screen w-full flex-col items-center justify-center space-y-6 pt-20 pb-40 px-4">
    <div className="h-10 w-full max-w-sm animate-pulse rounded-md bg-black/5 dark:bg-white/5" />
    <div className="h-64 w-full max-w-5xl animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
    <div className="flex w-full max-w-5xl gap-6">
       <div className="h-40 w-1/2 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
       <div className="h-40 w-1/2 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
    </div>
  </div>
);

export default function App() {
  const { t } = useTranslation();
  const { navigate, route, section } = useHashRoute();
  const previousRouteRef = useRef<AppRoute | null>(null);

  useLocalStorage('theme', 'light');
  useMetaLogger(route);

  useEffect(() => {
    const previousRoute = previousRouteRef.current;
    if (previousRoute !== null && previousRoute !== route) {
      if (!(route === "home" && section)) {
        window.scrollTo({ top: 0, left: 0 });
      }
    }
    previousRouteRef.current = route;
  }, [route, section]);

  const renderCurrentPage = () => {
    switch (route) {
      case "console":
        return (
          <Suspense fallback={<SkeletonPage />}>
            <AuditConsole onNavigate={navigate} />
          </Suspense>
        );
      case "live":
        return (
          <Suspense fallback={<SkeletonPage />}>
            <RealAuditDashboard onNavigate={navigate} />
          </Suspense>
        );
      case "pricing":
        return <Pricing onNavigate={navigate} />;
      case "intake":
        return <Intake onNavigate={navigate} />;
      case "login":
        return <Login onNavigate={navigate} />;
      case "admin":
        return <Admin onNavigate={navigate} />;
      case "presentation":
        return <AuditPresentation onNavigate={navigate} />;
      case "funding":
        return <Funding onNavigate={navigate} />;
      case "report":
        return (
          <Suspense fallback={<SkeletonPage />}>
            <SampleReport activeSection={section} onNavigate={navigate} />
          </Suspense>
        );
      case "home":
      default:
        return <Home activeSection={section} onNavigate={navigate} />;
    }
  };

  const baseUrl = (import.meta.env as any).VITE_CLIENT_URL || window.location.origin;
  const canonicalUrl = `${baseUrl}/#${route}`;

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
        <NetworkBanner />
        <CommandPalette onNavigate={navigate} />
        <ToastProvider />
        <MetaTags
          title={t(`meta.${route}`)}
          description={t(`metaDesc.${route}`, { defaultValue: t('metaDesc.home') })}
          canonicalUrl={canonicalUrl}
          ogTitle={t(`meta.${route}`)}
          siteName={t("brand.name")}
          ogImage={`${baseUrl}/og-image.jpg`}
          structuredData={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": t("brand.name"),
            "url": baseUrl,
            "description": t(`metaDesc.${route}`, { defaultValue: t('metaDesc.home') })
          }}
        />
        <Navbar currentRoute={route} currentSection={section} onNavigate={navigate} />
        {renderCurrentPage()}
        <Footer currentRoute={route} onNavigate={navigate} />
      </div>
    </ErrorBoundary>
  );
}

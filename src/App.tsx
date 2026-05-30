/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import MeshBackground from "./components/ui/MeshBackground";
import MetaTags from "./components/ui/MetaTags";
import { useHashRoute } from "./hooks/useHashRoute";
import { useMetaLogger } from "./hooks/useMetaLogger";
import AuditConsole from "./pages/AuditConsole";
import RealAuditDashboard from "./pages/RealAuditDashboard";
import Home from "./pages/Home";
import Intake from "./pages/Intake";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AuditPresentation from "./pages/AuditPresentation";
import type { AppRoute } from "./types/home";

export default function App() {
  const { t } = useTranslation();
  const { navigate, route, section } = useHashRoute();
  const previousRouteRef = useRef<AppRoute | null>(null);

  useMetaLogger(route);

  // Note: document.title is now managed by MetaTags component

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
        return <AuditConsole onNavigate={navigate} />;
      case "live":
        return <RealAuditDashboard onNavigate={navigate} />;
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
      case "home":
      default:
        return <Home activeSection={section} onNavigate={navigate} />;
    }
  };

  const baseUrl = (import.meta.env as any).VITE_CLIENT_URL || window.location.origin;
  const canonicalUrl = `${baseUrl}/#${route}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-slate text-brand-text">
      <MetaTags 
        title={t(`meta.${route}`)} 
        description={t(`metaDesc.${route}`, { defaultValue: t('metaDesc.home') })} 
        canonicalUrl={canonicalUrl}
        ogTitle={t(`meta.${route}`)}
        siteName="Agentic SEO Audit"
        ogImage={`${baseUrl}/og-image.jpg`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Agentic SEO Audit",
          "url": baseUrl,
          "description": t(`metaDesc.${route}`, { defaultValue: t('metaDesc.home') })
        }}
      />
      <MeshBackground variant={route === "console" || route === "live" ? "console" : "default"} />
      <Navbar currentRoute={route} currentSection={section} onNavigate={navigate} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {renderCurrentPage()}
        </motion.div>
      </AnimatePresence>
      <Footer currentRoute={route} onNavigate={navigate} />
    </div>
  );
}

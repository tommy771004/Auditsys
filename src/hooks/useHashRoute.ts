import { useEffect, useState } from "react";
import type { AppRoute, NavigateTo } from "../types/home";

interface RouteState {
  route: AppRoute;
  section: string | null;
}

interface UseHashRouteResult extends RouteState {
  navigate: NavigateTo;
}

const knownRoutes: AppRoute[] = ["home", "pricing", "report", "intake", "console", "live", "login", "admin", "campaign", "presentation"];
const legacyHomeSections = new Set(["overview", "features", "workflow", "scan-form"]);

function isAppRoute(value: string): value is AppRoute {
  return knownRoutes.includes(value as AppRoute);
}

function parseHash(hashValue: string): RouteState {
  const normalizedHash = hashValue.replace(/^#/, "").trim();

  if (!normalizedHash) {
    return {
      route: "home",
      section: null,
    };
  }

  const [rawRoute, rawSection] = normalizedHash.split(":");

  if (isAppRoute(rawRoute)) {
    return {
      route: rawRoute,
      section: rawSection ? decodeURIComponent(rawSection) : null,
    };
  }

  if (legacyHomeSections.has(rawRoute)) {
    return {
      route: "home",
      section: rawRoute,
    };
  }

  return {
    route: "home",
    section: null,
  };
}

export function useHashRoute(): UseHashRouteResult {
  const [routeState, setRouteState] = useState<RouteState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRouteState(parseHash(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);

    if (!window.location.hash) {
      window.history.replaceState(null, "", "#home");
      setRouteState({
        route: "home",
        section: null,
      });
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const navigate: NavigateTo = (route, section) => {
    const nextHash = `#${route}${section ? `:${encodeURIComponent(section)}` : ""}`;

    if (window.location.hash === nextHash) {
      setRouteState({
        route,
        section: section ?? null,
      });
      return;
    }

    window.location.hash = nextHash;
  };

  return {
    route: routeState.route,
    section: routeState.section,
    navigate,
  };
}

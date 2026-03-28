import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { buildSectionPath, DEFAULT_SECTION, parseSectionFromPathname } from "../app/sections";
import type { Section } from "../app/types";

export const useSectionRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = useMemo<Section>(
    () => parseSectionFromPathname(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      navigate(buildSectionPath(DEFAULT_SECTION), { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const canonicalPath = buildSectionPath(activeSection);
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
    }
  }, [activeSection, location.pathname, navigate]);

  const navigateToSection = (section: Section) => {
    const nextPath = buildSectionPath(section);
    if (location.pathname === nextPath) {
      return;
    }
    navigate(nextPath);
  };

  return {
    activeSection,
    navigateToSection,
  };
};

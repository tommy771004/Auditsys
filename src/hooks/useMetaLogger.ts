import { useEffect } from "react";

export function useMetaLogger(route: string) {
  useEffect(() => {
    // Wait a brief moment to let MetaTags component do its job
    const timer = setTimeout(() => {
      const getMetaContent = (selector: string) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute("content") : "Not found";
      };

      console.group(`🏷️ Meta Tags Updated [Route: ${route}]`);
      console.log(`Title:`, document.title);
      console.log(`Description:`, getMetaContent('meta[name="description"]'));
      console.log(`Canonical:`, document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "Not found");
      console.log(`OG Title:`, getMetaContent('meta[property="og:title"]'));
      console.log(`OG Description:`, getMetaContent('meta[property="og:description"]'));
      console.log(`OG URL:`, getMetaContent('meta[property="og:url"]'));
      console.log(`OG Image:`, getMetaContent('meta[property="og:image"]'));
      console.log(`OG Site Name:`, getMetaContent('meta[property="og:site_name"]'));
      
      const ldJsonScript = document.querySelector('script[type="application/ld+json"]');
      if (ldJsonScript?.textContent) {
        try {
          console.log(`Structured Data (JSON-LD):`, JSON.parse(ldJsonScript.textContent));
        } catch (e) {
          console.log(`Structured Data (JSON-LD): Invalid JSON`, ldJsonScript.textContent);
        }
      } else {
        console.log(`Structured Data (JSON-LD): Not found`);
      }
      console.groupEnd();
    }, 100);

    return () => clearTimeout(timer);
  }, [route]);
}

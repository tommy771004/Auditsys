import { useEffect } from "react";

export interface MetaTagsProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogTitle?: string;
  siteName?: string;
  structuredData?: Record<string, any> | string;
}

export default function MetaTags({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogTitle,
  siteName,
  structuredData,
}: MetaTagsProps) {
  useEffect(() => {
    // Helper to set or create meta tags
    const setMetaTag = (selector: string, attribute: string, value: string | undefined, createAttrs: Record<string, string>) => {
      let element = document.querySelector(selector);
      if (value) {
        if (!element) {
          element = document.createElement("meta");
          Object.entries(createAttrs).forEach(([k, v]) => element!.setAttribute(k, v));
          document.head.appendChild(element);
        }
        element.setAttribute(attribute, value);
      } else if (element) {
        document.head.removeChild(element);
      }
    };

    // Update document title
    document.title = title;

    // Update or create meta description
    setMetaTag('meta[name="description"]', "content", description, { name: "description" });

    // Open Graph Tags
    setMetaTag('meta[property="og:title"]', "content", ogTitle || title, { property: "og:title" });
    setMetaTag('meta[property="og:description"]', "content", description, { property: "og:description" });
    
    // Determine canonical / current URL
    const currentUrl = canonicalUrl || window.location.href;
    setMetaTag('meta[property="og:url"]', "content", currentUrl, { property: "og:url" });
    setMetaTag('meta[property="og:image"]', "content", ogImage, { property: "og:image" });
    setMetaTag('meta[property="og:site_name"]', "content", siteName, { property: "og:site_name" });

    // Update or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalUrl) {
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute("href", canonicalUrl);
    } else {
      if (canonicalLink) {
        document.head.removeChild(canonicalLink);
      }
    }

    // JSON-LD Structured Data
    let ldJsonScript = document.querySelector('script[type="application/ld+json"]');
    if (structuredData) {
      if (!ldJsonScript) {
        ldJsonScript = document.createElement("script");
        ldJsonScript.setAttribute("type", "application/ld+json");
        document.head.appendChild(ldJsonScript);
      }
      const jsonContent = typeof structuredData === "string" ? structuredData : JSON.stringify(structuredData);
      ldJsonScript.textContent = jsonContent;
    } else {
      if (ldJsonScript) {
        document.head.removeChild(ldJsonScript);
      }
    }
  }, [title, description, canonicalUrl, ogImage, ogTitle, siteName, structuredData]);

  return null;
}


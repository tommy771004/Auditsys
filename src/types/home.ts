export type AppRoute = "home" | "pricing" | "report" | "intake" | "console" | "live" | "login" | "admin" | "campaign" | "presentation";
export type NavigateTo = (route: AppRoute, section?: string) => void;

export interface NavLinkItem {
  id: string;
  label?: string;
  labelKey?: string;
  route: AppRoute;
  section?: string;
  external?: boolean;
}

export type SupportedLocale = 'en' | 'zh-TW';
export interface LanguageOption {
  code: SupportedLocale;
  label?: string;
  labelKey: string;
  shortLabelKey: string;
}

export interface LocalizedContentItem { id?: string; }
export interface TrustPillItem { id?: string; labelKey?: string; }
export interface WorkflowContentItem { id?: string; eyebrowKey?: string; titleKey?: string; descriptionKey?: string; }

export interface TrustPill { id?: string; labelKey?: string; }
export interface FeatureCard { id?: string; titleKey?: string; descriptionKey?: string; }
export interface WorkflowStep { id?: string; eyebrowKey?: string; titleKey?: string; descriptionKey?: string; }

export type AppRoute = "home" | "pricing" | "report" | "intake" | "console" | "login" | "admin" | "campaign";
export type NavigateTo = (route: AppRoute, section?: string) => void;

export interface NavLinkItem {
  id: string;
  label: string;
  route: AppRoute;
  section?: string;
  external?: boolean;
}

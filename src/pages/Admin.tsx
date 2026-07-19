import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, FileText, LogOut, ShieldAlert, Shield, Trash2, LayoutDashboard, Activity, Settings, Plus, X, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import GlassContainer from "../components/ui/GlassContainer";
import type { NavigateTo } from "../types/home";
import { Reveal } from "../components/ui/Reveal";
import { buildAdminStatsViewModel, buildAdminReportViewModel } from "../services/buildAdminStatsViewModel";
import type { AuditRow } from "../db/schema";
import { Sector, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from "recharts";

interface Props {
  onNavigate: NavigateTo;
}

const AnimatedSector = (props: any) => {
  const { cx, cy, index } = props;
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 14,
        delay: (index || 0) * 0.12
      }}
      style={{ originX: cx, originY: cy }}
    >
      <Sector {...props} />
    </motion.g>
  );
};

const SeverityBadge = ({ severity }: { severity?: string }) => {
  if (!severity) return null;
  const s = severity.toLowerCase();
  if (s === "high") return <span className="rounded-md bg-semantic-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-danger border border-semantic-danger/30">High Impact</span>;
  if (s === "medium") return <span className="rounded-md bg-semantic-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-warning border border-semantic-warning/30">Medium</span>;
  return <span className="rounded-md bg-semantic-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-success border border-semantic-success/30">Low</span>;
};

export default function Admin({ onNavigate }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audits" | "settings" | "leads" | "security">("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [planSettings, setPlanSettings] = useState<any[]>([]);
  const [securityResult, setSecurityResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [newModels, setNewModels] = useState<Record<string, string>>({});
  const [selectedReportContext, setSelectedReportContext] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AuditRow | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);

  // View-model states
  const [adminStatsVM, setAdminStatsVM] = useState<any>(null);
  const [adminReportVM, setAdminReportVM] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      let endpoint = activeTab === "overview"
        ? "stats"
        : activeTab === "settings"
          ? "plan-settings"
          : activeTab;
      const res = await fetch(`/api/admin/${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.status === 401 || res.status === 403) {
        onNavigate("login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(((typeof data.error === "object" ? data.error?.message : data.error) || data.message) || "Request failed");

      if (activeTab === "overview") {
        setStats(data);
        setAdminStatsVM(buildAdminStatsViewModel(data));
      } else if (activeTab === "users") setUsers(data);
      else if (activeTab === "settings") setPlanSettings(data);
      else if (activeTab === "leads") setLeads(data);
      else if (activeTab === "security") setSecurityResult(data);
      else {
        setAudits(data);
        setSelectedAudits([]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleSelectAudit = (id: string) => {
    setSelectedAudits((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllAudits = () => {
    if (selectedAudits.length === audits.length) {
      setSelectedAudits([]);
    } else {
      setSelectedAudits(audits.map((item) => item.id));
    }
  };

  const handleBatchDeleteAudits = () => {
    if (selectedAudits.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      message: t("admin.confirm.deleteBatch", { count: selectedAudits.length }),
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("auth_token");
          const deletePromises = selectedAudits.map((id) =>
            fetch(`/api/admin/audits/${id}`, {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }).then(async (res) => {
              if (!res.ok) {
                const errData = await res.json();
                const errMsg = typeof errData.error === 'object' ? errData.error?.message : errData.error;
                throw new Error(errMsg || `Failed to delete audit with ID: ${id}`);
              }
            })
          );
        await Promise.all(deletePromises);
        setSelectedAudits([]);
        fetchData();
      } catch (err: any) {
        setError(err.message);
      }
      setConfirmDialog(null);
    },
    });
  };

  const handleLogout = async () => {
    localStorage.removeItem("auth_token");
    await fetch("/api/auth/logout", { method: "POST" });
    onNavigate("login");
  };

  const handleUpdatePlanSetting = async (planId: string, updates: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/admin/plan-settings/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteLead = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: t("admin.confirm.deleteLead"),
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("auth_token");
          const res = await fetch(`/api/admin/leads/${id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (!res.ok) throw new Error("Failed to delete lead");
          fetchData();
        } catch (err: any) {
          setError(err.message);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleUpdateUser = async (id: string, updates: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update user");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const handleDeleteUser = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: t("admin.confirm.deleteAudit"),
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("auth_token");
          const res = await fetch(`/api/admin/users/${id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (!res.ok) {
            const errorData = await res.json();
            const errMsg = typeof errorData.error === 'object' ? errorData.error?.message : errorData.error;
            throw new Error(errMsg || "Failed to delete user");
          }
          fetchData();
        } catch (err: any) {
          setError(err.message);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteAudit = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: t("admin.confirm.deleteAudit"),
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("auth_token");
          const res = await fetch(`/api/admin/audits/${id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (!res.ok) {
            const errorData = await res.json();
            const errMsg = typeof errorData.error === 'object' ? errorData.error?.message : errorData.error;
            throw new Error(errMsg || "Failed to delete");
          }
          fetchData();
        } catch (err: any) {
          setError(err.message);
        }
        setConfirmDialog(null);
      }
    });
  };

  const exportPlanSettings = () => {
    try {
      const exportData = planSettings.map((plan) => ({
        planId: plan.planId,
        price: plan.price,
        aiProvider: plan.aiProvider,
        allowedModels: plan.allowedModels ? plan.allowedModels.split(",").filter(Boolean) : []
      }));
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `plan_settings_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="fixed left-0 top-0 z-40 h-full w-64 flex flex-col bg-black/95 backdrop-blur-[20px] border-r border-[var(--border)]">
          <div className="flex h-16 items-center justify-center border-b border-[var(--border)]">
            <span className="text-xl font-bold tracking-tight text-brand-purple">AuditLens</span>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 ${activeTab === "overview" ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30" : "text-brand-muted hover:text-[var(--text)] hover:bg-white/5 hover:border-[var(--border)]"}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>{t("admin.tabs.overview")}</span>
            </button>
            <button
              onClick={() => setActiveTab("audits")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 ${activeTab === "audits" ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30" : "text-brand-muted hover:text-[var(--text)] hover:bg-white/5 hover:border-[var(--border)]"}`}
            >
              <FileText className="h-5 w-5" />
              <span>{t("admin.tabs.audits")}</span>
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 ${activeTab === "users" ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30" : "text-brand-muted hover:text-[var(--text)] hover:bg-white/5 hover:border-[var(--border)]"}`}
            >
              <Users className="h-5 w-5" />
              <span>{t("admin.tabs.users")}</span>
            </button>
            <button
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 ${activeTab === "leads" ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30" : "text-brand-muted hover:text-[var(--text)] hover:bg-white/5 hover:border-[var(--border)]"}`}
            >
              <ShieldAlert className="h-5 w-5" />
              <span>{t("admin.tabs.leads")}</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 ${activeTab === "settings" ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30" : "text-brand-muted hover:text-[var(--text)] hover:bg-white/5 hover:border-[var(--border)]"}`}
            >
              <Settings className="h-5 w-5" />
              <span>{t("admin.tabs.settings")}</span>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 ${activeTab === "security" ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30" : "text-brand-muted hover:text-[var(--text)] hover:bg-white/5 hover:border-[var(--border)]"}`}
            >
              <Shield className="h-5 w-5" />
              <span>{t("admin.tabs.security")}</span>
            </button>
          </nav>
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium text-brand-danger hover:bg-brand-danger/10 border border-brand-danger/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>{t("admin.logout")}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 ml-64 p-6 sm:p-8 lg:p-12">
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t(`admin.${activeTab}.title` as any)}</h1>
            <p className="mt-2 text-brand-muted">{t(`admin.${activeTab}.subtitle` as any)}</p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-sm text-brand-danger text-sm" role="alert">
              {error}
            </div>
          )}

          {activeTab === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <GlassContainer className="p-6">
                  <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-brand-cyan" /> {t("admin.overview.totalAudits")}
                  </div>
                  <div className="text-3xl font-bold text-brand-cyan">{stats?.totalAudits || 0}</div>
                </GlassContainer>
                <GlassContainer className="p-6">
                  <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-emerald-400" /> {t("admin.overview.completed")}
                  </div>
                  <div className="text-3xl font-bold text-emerald-400">{stats?.completedAudits || 0}</div>
                </GlassContainer>
                <GlassContainer className="p-6">
                  <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-amber-400" /> {t("admin.overview.pending")}
                  </div>
                  <div className="text-3xl font-bold text-amber-400">{stats?.pendingAudits || 0}</div>
                </GlassContainer>
                <GlassContainer className="p-6">
                  <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-brand-purple" /> {t("admin.overview.totalUsers")}
                  </div>
                  <div className="text-3xl font-bold text-brand-purple">{stats?.totalUsers || 0}</div>
                </GlassContainer>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <GlassContainer className="p-6 max-w-2xl">
                  <h3 className="text-lg font-medium mb-6 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-brand-purple" />
                    {t("admin.overview.statusDistribution")}
                  </h3>
                  {adminStatsVM && adminStatsVM.statusBreakdown.length > 0 ? (
                    <div className="h-64 sm:h-80 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={adminStatsVM.statusBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            isAnimationActive={false}
                            shape={AnimatedSector}
                          >
                            {adminStatsVM.statusBreakdown.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "rgba(10, 6, 8, 0.95)",
                              borderColor: "rgba(255, 255, 255, 0.1)",
                              borderRadius: "12px",
                              color: "#fff"
                            }}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-brand-muted border border-black/5 bg-black/5 rounded-sm">
                      <Activity className="h-8 w-8 mb-2 opacity-55" />
                      <span>{t("admin.overview.noChartData")}</span>
                    </div>
                  )}
                </GlassContainer>

                <GlassContainer className="p-6">
                  <h3 className="text-lg font-medium mb-6 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-brand-cyan" />
                    {t("admin.overview.recentActivity")}
                  </h3>
                  {adminStatsVM && adminStatsVM.recentAudits.length > 0 ? (
                    <div className="space-y-4">
                      {adminStatsVM.recentAudits.map((audit: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-black/5 border border-[var(--border)] rounded-sm">
                          <div>
                            <p className="font-medium text-[var(--text)]">{audit.id}</p>
                            <p className="text-sm text-brand-muted">{new Date(audit.createdAt).toLocaleString()}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-sm text-xs font-medium ${
                            audit.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {audit.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-brand-muted">{t("admin.overview.noRecentActivity")}</div>
                  )}
                </GlassContainer>
              </div>
            </div>
          ) : activeTab === "audits" ? (
            <div className="space-y-4">
              {audits.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-black/5 backdrop-blur-[20px] ring-1 ring-white/10 rounded-sm gap-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="select-all-audits"
                      checked={selectedAudits.length === audits.length && audits.length > 0}
                      onChange={handleToggleSelectAllAudits}
                      className="h-5 w-5 rounded-md border border-[var(--border)] bg-black/50 text-brand-purple focus:ring-brand-purple focus:ring-offset-0 accent-brand-purple cursor-pointer transition-all duration-200"
                    />
                    <label htmlFor="select-all-audits" className="text-sm font-medium text-brand-text cursor-pointer select-none">
                      {selectedAudits.length > 0
                        ? `${selectedAudits.length} selected`
                        : "Select All"
                      }
                    </label>
                  </div>

                  {selectedAudits.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={handleBatchDeleteAudits}
                      className="flex items-center px-4 py-2 bg-brand-danger/10 hover:bg-brand-danger/25 text-brand-danger hover:text-[var(--text)] border border-brand-danger/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] rounded-sm transition-all duration-300 text-sm font-medium active:scale-[0.98]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedAudits.length})
                    </motion.button>
                  )}
                </div>
              )}

              {audits.map((item) => (
                <GlassContainer key={item.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="pt-1.5">
                      <input
                        type="checkbox"
                        checked={selectedAudits.includes(item.id)}
                        onChange={() => handleToggleSelectAudit(item.id)}
                        className="h-5 w-5 rounded-md border border-[var(--border)] bg-black/50 text-brand-purple focus:ring-brand-purple focus:ring-offset-0 accent-brand-purple cursor-pointer transition-all duration-200"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg mb-1">{item.url || "Unknown URL"}</h3>
                        <span className={`px-2 py-1 rounded-sm text-xs font-medium ${
                          item.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-brand-muted">
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        <span>ID: {item.id}</span>
                      </div>
                      <div className="flex space-x-3 mt-2">
                        <button
                          onClick={() => {
                            const reportVM = item.result ? buildAdminReportViewModel(item, { t }) : null;
                            if (reportVM) {
                              setSelectedReport(item);
                              setAdminReportVM(reportVM);
                            } else if (item.status === "failed") {
                              setSelectedReportContext(t("admin.reports.auditFailed") + ((typeof item.result?.error === 'object' ? item.result.error.message : item.result?.error) || t("history.unknownError")));
                            } else {
                              setSelectedReportContext(t("admin.reports.noReport"));
                            }
                          }}
                          className="text-brand-cyan hover:text-[var(--text)] text-sm bg-brand-cyan/10 hover:bg-brand-cyan/20 px-3 py-1.5 rounded-sm transition-colors flex items-center"
                        >
                          <FileText className="h-4 w-4 mr-2" /> {t("admin.reports.viewReport")}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAudit(item.id)}
                      className="text-brand-muted hover:text-[var(--text)] p-2.5 bg-brand-danger/5 hover:bg-brand-danger/15 border border-transparent hover:border-brand-danger/25 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] rounded-sm transition-all duration-300"
                      title="Delete record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </GlassContainer>
              ))}
              {audits.length === 0 && (
                <div className="text-center py-12 text-brand-muted">
                  {t("admin.reports.empty")}
                </div>
              )}
            </div>
          ) : activeTab === "users" ? (
            <div className="space-y-4">
              {users.map((item: any) => (
                <GlassContainer key={item.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-medium text-lg mb-1">{item.username}</h3>
                    <p className="text-sm text-brand-muted">
                      {t("admin.users.joined")} {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleUpdateUser(item.id, { isAdmin: !item.isAdmin })}
                      className="px-3 py-1.5 text-sm bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-sm transition-colors"
                    >
                      {item.isAdmin ? t("admin.users.revokeAdmin") : t("admin.users.grantAdmin")}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(item.id)}
                      className="text-brand-muted hover:text-[var(--text)] p-2.5 bg-brand-danger/5 hover:bg-brand-danger/15 border border-transparent hover:border-brand-danger/25 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] rounded-sm transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </GlassContainer>
              ))}
              {users.length === 0 && (
                <div className="text-center py-12 text-brand-muted">
                  {t("admin.users.empty")}
                </div>
              )}
            </div>
          ) : activeTab === "leads" ? (
            <div className="space-y-4">
              {leads.map((item: any) => (
                <GlassContainer key={item.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-medium text-lg">{item.email}</h3>
                      <p className="text-sm text-brand-muted">
                        {t("admin.leads.submitted")} {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLead(item.id)}
                    className="text-brand-muted hover:text-[var(--text)] p-2.5 bg-brand-danger/5 hover:bg-brand-danger/15 border border-transparent hover:border-brand-danger/25 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] rounded-sm transition-all duration-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </GlassContainer>
              ))}
              {leads.length === 0 && (
                <div className="text-center py-12 text-brand-muted">
                  {t("admin.leads.empty")}
                </div>
              )}
            </div>
          ) : activeTab === "settings" ? (
            <div className="space-y-6">
              <GlassContainer className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium">{t("admin.settings.planSettings")}</h3>
                  <button
                    onClick={exportPlanSettings}
                    className="flex items-center px-4 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-sm transition-colors"
                  >
                    <Download className="mr-2 h-4 w-4" /> {t("admin.settings.export")}
                  </button>
                </div>
                {planSettings.map((plan: any) => (
                  <div key={plan.planId} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-lg">{plan.planId}</h4>
                      <span className="px-2 py-1 rounded-sm text-xs font-medium bg-brand-purple/20 text-brand-purple">{plan.aiProvider}</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 mb-4">
                      <div>
                        <label className="block text-sm text-brand-muted mb-1">{t("admin.settings.price")}</label>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(e) => handleUpdatePlanSetting(plan.planId, { price: parseFloat(e.target.value) })}
                          className="w-full bg-black/50 border border-[var(--border)] rounded-sm px-4 py-2 text-[var(--text)] outline-none focus:border-brand-purple"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-brand-muted mb-1">{t("admin.settings.allowedModels")}</label>
                        <input
                          type="text"
                          value={plan.allowedModels || ""}
                          onChange={(e) => handleUpdatePlanSetting(plan.planId, { allowedModels: e.target.value })}
                          className="w-full bg-black/50 border border-[var(--border)] rounded-sm px-4 py-2 text-[var(--text)] outline-none focus:border-brand-purple"
                          placeholder={t("admin.settings.modelsPlaceholder")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-brand-muted">{t("admin.settings.currentModels")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(plan.allowedModels ? plan.allowedModels.split(",").filter(Boolean) : []).map((model: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-black/20 border border-[var(--border)] rounded-sm text-sm flex items-center gap-1">
                            {model}
                            <button
                              onClick={() => {
                                const models = plan.allowedModels ? plan.allowedModels.split(",").filter(Boolean) : [];
                                const updatedModels = models.filter((_: any, i: number) => i !== idx).join(",");
                                handleUpdatePlanSetting(plan.planId, { allowedModels: updatedModels });
                              }}
                              className="text-brand-muted hover:text-brand-danger"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder={t("admin.settings.eGModel")}
                          value={newModels[plan.planId] || ""}
                          onChange={(e) => setNewModels({ ...newModels, [plan.planId]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = newModels[plan.planId]?.trim();
                              if (val) {
                                const models = plan.allowedModels ? plan.allowedModels.split(",").filter(Boolean) : [];
                                models.push(val);
                                handleUpdatePlanSetting(plan.planId, { allowedModels: models.join(",") });
                                setNewModels({ ...newModels, [plan.planId]: "" });
                              }
                            }
                          }}
                          className="flex-1 bg-black/50 border border-[var(--border)] rounded-sm px-4 py-2 text-[var(--text)] outline-none focus:border-brand-purple text-sm"
                        />
                        <button
                          onClick={() => {
                            const val = newModels[plan.planId]?.trim();
                            if (val) {
                              const models = plan.allowedModels ? plan.allowedModels.split(",").filter(Boolean) : [];
                              models.push(val);
                              handleUpdatePlanSetting(plan.planId, { allowedModels: models.join(",") });
                              setNewModels({ ...newModels, [plan.planId]: "" });
                            }
                          }}
                          className="px-3 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-sm flex items-center transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          let finalModels = plan.allowedModels;
                          const pendingModel = newModels[plan.planId]?.trim();
                          if (pendingModel) {
                            const models = finalModels ? finalModels.split(",").filter(Boolean) : [];
                            models.push(pendingModel);
                            finalModels = models.join(",");
                          }
                          handleUpdatePlanSetting(plan.planId, { allowedModels: finalModels });
                          setNewModels({ ...newModels, [plan.planId]: "" });
                        }}
                        className="px-4 py-2 bg-brand-purple text-black hover:bg-brand-purple/80 rounded-sm font-medium transition-colors"
                      >
                        {t("admin.settings.save")}
                      </button>
                    </div>
                  </div>
                ))}
              </GlassContainer>
            </div>
          ) : activeTab === "security" ? (
            <div className="space-y-6">
              <GlassContainer className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium">{t("admin.security.title")}</h3>
                  <button
                    onClick={() => fetchData()}
                    className="px-4 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-sm transition-colors"
                  >
                    <Activity className="h-4 w-4 mr-2 animate-spin" /> {t("admin.security.runDiagnostics")}
                  </button>
                </div>
                {securityResult ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <GlassContainer className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className={`h-6 w-6 ${securityResult.ingress?.blocked ? "text-brand-danger" : "text-emerald-400"}`} />
                        <h4 className="text-lg font-medium">{t("admin.security.ingress")}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-sm text-sm font-medium ${
                        securityResult.ingress?.blocked ? "bg-brand-danger/20 text-brand-danger" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {t(`admin.security.status${securityResult.ingress.status.charAt(0).toUpperCase() + securityResult.ingress.status.slice(1)}`)}
                      </span>
                      <p className="text-sm text-brand-muted leading-relaxed mt-2">
                        {securityResult.ingress.reason}
                      </p>
                      <div className="text-xs font-mono text-brand-muted mt-auto pt-4 border-t border-black/5">
                        {t("admin.security.details")}: RFC 1918 & Local addresses restricted
                      </div>
                    </GlassContainer>
                    <GlassContainer className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <ShieldAlert className={`h-6 w-6 ${securityResult.egress?.blocked ? "text-brand-danger" : "text-emerald-400"}`} />
                        <h4 className="text-lg font-medium">{t("admin.security.egress")}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-sm text-sm font-medium ${
                        securityResult.egress?.blocked ? "bg-brand-danger/20 text-brand-danger" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {t(`admin.security.status${securityResult.egress.status.charAt(0).toUpperCase() + securityResult.egress.status.slice(1)}`)}
                      </span>
                      <p className="text-sm text-brand-muted leading-relaxed mt-2">
                        {securityResult.egress.reason}
                      </p>
                      <div className="text-xs font-mono text-brand-muted mt-auto pt-4 border-t border-black/5">
                        {t("admin.security.details")}: RFC 1918 & Local addresses restricted
                      </div>
                    </GlassContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-brand-muted">
                    {t("admin.security.runningDiagnostics")}
                  </div>
                )}
              </GlassContainer>
            </div>
          ) : null}

          <AnimatePresence>
            {selectedReport && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm border border-[var(--border)] bg-white/95 p-6 sm:p-8 shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight flex items-center">
                      <FileText className="w-6 h-6 mr-3 text-brand-purple" />
                      Audit Report
                    </h2>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-2 -mr-2 text-black/50 hover:text-[var(--text)] hover:bg-black/10 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="text-base text-black/80">
                    {adminReportVM && (
                      <>
                        {adminReportVM.summary && (
                          <div className="mb-6 p-4 bg-brand-cyan/5 rounded-sm border border-brand-cyan/20">
                            <h3 className="text-sm font-semibold text-brand-cyan mb-2">Executive Summary</h3>
                            <p className="text-sm text-black/80">{adminReportVM.summary}</p>
                          </div>
                        )}
                        <div className="space-y-6">
                          {adminReportVM.findings && adminReportVM.findings.length > 0 && (
                            <section>
                              <h3 className="text-lg font-semibold mb-4">Findings</h3>
                              <div className="space-y-3">
                                {adminReportVM.findings.map((f: any, i: number) => (
                                  <div key={i} className="p-4 bg-black/5 border border-[var(--border)] rounded-sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-semibold text-[var(--text)]">{f.titleKey || f.issue}</p>
                                      <SeverityBadge severity={f.severity} />
                                    </div>
                                    <p className="text-sm text-brand-muted">{f.detailKey || f.impact}</p>
                                    {f.explanation && <p className="mt-2 text-sm text-brand-cyan/80">{f.explanation}</p>}
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                          {adminReportVM.charts && adminReportVM.charts.scores && (
                            <section>
                              <h3 className="text-lg font-semibold mb-4">Scores</h3>
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {adminReportVM.charts.scores.map((s: any) => (
                                  <div key={s.id} className="p-4 bg-black/5 border border-[var(--border)] rounded-sm">
                                    <div className="text-sm text-brand-muted">{s.id}</div>
                                    <div className="text-2xl font-bold text-[var(--text)]">{s.value}</div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {confirmDialog && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-sm rounded-sm border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl text-center"
                >
                  <h3 className="text-lg font-bold text-[var(--text)] mb-2">{t("admin.confirm.title")}</h3>
                  <p className="text-black/70 mb-6">{confirmDialog.message}</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setConfirmDialog(null)}
                      className="px-6 py-2 rounded-sm bg-black/5 hover:bg-black/10 text-[var(--text)] transition-colors"
                    >
                      {t("admin.confirm.cancel")}
                    </button>
                    <button
                      onClick={confirmDialog.onConfirm}
                      className="px-6 py-2 rounded-sm bg-brand-danger/20 text-brand-danger hover:bg-brand-danger hover:text-[var(--text)] transition-colors"
                    >
                      {t("admin.confirm.delete")}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
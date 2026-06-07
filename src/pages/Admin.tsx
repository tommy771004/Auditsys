import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, FileText, LogOut, ShieldAlert, Shield, Trash2, LayoutDashboard, Activity, Settings, Plus, X, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import GlassContainer from "../components/ui/GlassContainer";
import type { NavigateTo } from "../types/home";
import { ReportRenderer } from "../components/ui/ReportRenderer";
import { Reveal } from "../components/ui/Reveal";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, Sector } from "recharts";

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
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [selectedAudits, setSelectedAudits] = useState<string[]>([]);

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
      if (!res.ok) throw new Error(data.error);
      
      if (activeTab === "overview") setStats(data);
      else if (activeTab === "users") setUsers(data);
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
                throw new Error(errData.error || `Failed to delete audit with ID: ${id}`);
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
            throw new Error(errorData.error || "Failed to delete");
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
    <div className="relative w-full min-h-screen">
      <div className="hero-grid-bg pointer-events-none" />
      <div className="relative z-10 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Reveal className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-3xl font-bold text-brand-text flex items-center">
            <ShieldAlert className="mr-3 text-brand-purple" /> {t("admin.title")}
          </h1>
          <p className="text-brand-muted mt-2">{t("admin.subtitle")}</p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-brand-surface/50 hover:bg-brand-surface/80 rounded-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" /> {t("admin.signOut")}
        </button>
      </Reveal>

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-6 py-3 rounded-sm flex items-center font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" /> {t("admin.tabs.overview")}
        </button>
        <button
          onClick={() => setActiveTab("audits")}
          className={`px-6 py-3 rounded-sm flex items-center font-medium transition-colors ${
            activeTab === "audits"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <FileText className="mr-2 h-4 w-4" /> {t("admin.tabs.reports")}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 rounded-sm flex items-center font-medium transition-colors ${
            activeTab === "users"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Users className="mr-2 h-4 w-4" /> {t("admin.tabs.users")}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-3 rounded-sm flex items-center font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Settings className="mr-2 h-4 w-4" /> {t("admin.tabs.settings")}
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-6 py-3 rounded-sm flex items-center font-medium transition-colors ${
            activeTab === "leads"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Users className="mr-2 h-4 w-4" /> {t("admin.tabs.leads")}
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-6 py-3 rounded-sm flex items-center font-medium transition-colors ${
            activeTab === "security"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Shield className="mr-2 h-4 w-4" /> {t("admin.tabs.security")}
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-sm bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
          {error}
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeTab === "overview" ? (
            <div className="space-y-6">
              <h2 className="text-xl font-medium mb-4">{t("admin.overview.title")}</h2>
              {stats ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <GlassContainer className="p-6">
                      <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2" /> {t("admin.overview.totalUsers")}
                      </div>
                      <div className="text-3xl font-bold text-[var(--text)]">{stats.totalUsers}</div>
                    </GlassContainer>
                    <GlassContainer className="p-6">
                      <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-2" /> {t("admin.overview.totalAudits")}
                      </div>
                      <div className="text-3xl font-bold text-[var(--text)]">{stats.totalAudits}</div>
                    </GlassContainer>
                    <GlassContainer className="p-6">
                      <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-emerald-400" /> {t("admin.overview.completed")}
                      </div>
                      <div className="text-3xl font-bold text-emerald-400">{stats.completedAudits}</div>
                    </GlassContainer>
                    <GlassContainer className="p-6">
                      <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-amber-400" /> {t("admin.overview.pending")}
                      </div>
                      <div className="text-3xl font-bold text-amber-400">{stats.pendingAudits}</div>
                    </GlassContainer>
                  </div>

                  <GlassContainer className="p-6 max-w-2xl">
                    <h3 className="text-lg font-medium mb-6 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-brand-purple" />
                      {t("admin.overview.statusDistribution")}
                    </h3>
                    {(stats.completedAudits > 0 || stats.pendingAudits > 0) ? (
                      <div className="h-64 sm:h-80 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: t("admin.overview.completed"), value: stats.completedAudits, color: "#10b981" },
                                { name: t("admin.overview.pending"), value: stats.pendingAudits, color: "#f59e0b" }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              isAnimationActive={false}
                              shape={AnimatedSector}
                            >
                              {[
                                { name: t("admin.overview.completed"), value: stats.completedAudits, color: "#10b981" },
                                { name: t("admin.overview.pending"), value: stats.pendingAudits, color: "#f59e0b" }
                              ].filter(item => item.value > 0).map((entry, index) => (
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
                </div>
              ) : (
                <div className="text-brand-muted text-center py-8">{t("admin.overview.loading")}</div>
              )}
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
                    <div className="flex-1 flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-medium text-lg mb-1">{item.url}</h3>
                        <div className="flex items-center space-x-3 text-sm text-brand-muted mb-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                          <span>ID: {item.id}</span>
                        </div>
                        <div className="flex space-x-3 mt-2">
                          <button
                            onClick={() => {
                              let reportText = item.result?.summary || item.result?.reason;
                              if (reportText) {
                                setSelectedReportContext(reportText);
                              } else if (item.status === 'failed') {
                                setSelectedReportContext(t("admin.reports.auditFailed") + (item.result?.error || t("history.unknownError")));
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
                   <div className="flex flex-wrap items-center gap-3">
                     <select
                       value={item.subscriptionPlan}
                       onChange={(e) => handleUpdateUser(item.id, { subscriptionPlan: e.target.value })}
                       className="bg-brand-surface/50 border border-[var(--border)] rounded-sm px-3 py-1.5 text-sm text-brand-text outline-none focus:border-brand-purple"
                     >
                       <option value="free">{t("admin.users.freePlan")}</option>
                       <option value="pro">{t("admin.users.proPlan")}</option>
                       <option value="enterprise">{t("admin.users.enterprise")}</option>
                     </select>
                     <select
                       value={item.isAdmin ? "admin" : "user"}
                       onChange={(e) => handleUpdateUser(item.id, { isAdmin: e.target.value === "admin" })}
                       className={`px-3 py-1.5 rounded-sm text-sm font-medium border outline-none ${
                         item.isAdmin ? 'bg-brand-purple/20 text-brand-purple border-brand-purple/30' : 'bg-black/5 text-brand-muted border-[var(--border)]'
                       }`}
                     >
                       <option value="user">{t("admin.users.userRole")}</option>
                       <option value="admin">{t("admin.users.adminRole")}</option>
                     </select>
                   </div>
                 </GlassContainer>
               ))}
               {users.length === 0 && (
                 <div className="text-center py-12 text-brand-muted">
                   {t("admin.users.empty")}
                 </div>
               )}
             </div>
           ) : activeTab === "settings" ? (
             <div className="space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-black/5 pb-4">
                 <h2 className="text-xl font-medium">{t("admin.settings.title")}</h2>
                 <button
                   onClick={exportPlanSettings}
                   className="flex items-center px-4 py-2 bg-brand-cyan/10 hover:bg-brand-cyan/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-brand-cyan/30 text-brand-cyan hover:text-[var(--text)] rounded-sm transition-all duration-300 text-sm font-medium active:scale-[0.98]"
                 >
                   <Download className="mr-2 h-4 w-4" /> {t("admin.settings.exportSettings")}
                 </button>
               </div>
               {planSettings.map((plan) => (
                 <GlassContainer key={plan.planId} className="p-6">
                   <h3 className="text-lg font-bold capitalize mb-4 text-brand-cyan">{plan.planId}{t("admin.settings.planTitle")}</h3>
                     <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-brand-muted mb-2">AI Provider</label>
                          <select
                            value={plan.aiProvider || "openrouter"}
                            onChange={(e) => {
                              const provider = e.target.value;
                              const newSettings = planSettings.map(p => {
                                if (p.planId === plan.planId) {
                                  const updates: any = { ...p, aiProvider: provider };
                                  if (provider === 'nvidia') {
                                    updates.allowedModels = 'nvidia/nemotron-3-ultra-550b-a55b'; // Or user can edit to the exact Nemotron 3 variant
                                  }
                                  return updates;
                                }
                                return p;
                              });
                              setPlanSettings(newSettings);
                            }}
                            className="w-full bg-black/50 border border-[var(--border)] rounded-sm px-4 py-2 text-[var(--text)] outline-none focus:border-brand-purple mb-4"
                          >
                            <option value="openrouter">OpenRouter (Default)</option>
                            <option value="agentrouter">Agent Router API</option>
                            <option value="nvidia">Nvidia API</option>
                          </select>
                          
                          <label className="block text-sm font-medium text-brand-muted mb-2">
                            {plan.aiProvider === 'agentrouter' ? "Agent Router Token" : plan.aiProvider === 'nvidia' ? "Nvidia API Key" : t("admin.settings.openRouterKey")}
                          </label>
                          <input
                            type="password"
                            placeholder={t("admin.settings.enterApiKey")}
                            value={plan.aiProvider === 'agentrouter' ? (plan.agentRouterApiKey || "") : plan.aiProvider === 'nvidia' ? (plan.nvidiaApiKey || "") : (plan.openRouterApiKey || "")}
                            onChange={(e) => {
                              const newSettings = planSettings.map(p => p.planId === plan.planId ? 
                                (plan.aiProvider === 'agentrouter' ? { ...p, agentRouterApiKey: e.target.value } : plan.aiProvider === 'nvidia' ? { ...p, nvidiaApiKey: e.target.value } : { ...p, openRouterApiKey: e.target.value }) 
                                : p);
                              setPlanSettings(newSettings);
                            }}
                            className="w-full bg-black/50 border border-[var(--border)] rounded-sm px-4 py-2 text-[var(--text)] outline-none focus:border-brand-purple"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-muted mb-2">{t("admin.settings.planPrice")}</label>
                          <input
                            type="text"
                            placeholder={t("admin.settings.eGPrice")}
                            value={plan.price || ""}
                            onChange={(e) => {
                              const newSettings = planSettings.map(p => p.planId === plan.planId ? { ...p, price: e.target.value } : p);
                              setPlanSettings(newSettings);
                            }}
                            className="w-full bg-black/50 border border-[var(--border)] rounded-sm px-4 py-2 text-[var(--text)] outline-none focus:border-brand-purple"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-muted mb-2">{t("admin.settings.allowedModels")}</label>
                        <div className="space-y-2 mb-3">
                          {(plan.allowedModels ? plan.allowedModels.split(',').filter(Boolean) : []).map((model: string, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-black/50 border border-[var(--border)] rounded-sm px-3 py-2 focus-within:border-brand-purple transition-colors">
                              <input
                                type="text"
                                value={model}
                                onChange={(e) => {
                                  const models = plan.allowedModels ? plan.allowedModels.split(',').filter(Boolean) : [];
                                  models[idx] = e.target.value;
                                  setPlanSettings(planSettings.map(p => p.planId === plan.planId ? { ...p, allowedModels: models.join(',') } : p));
                                }}
                                className="flex-1 bg-transparent text-sm text-brand-text outline-none mr-3"
                              />
                              <button
                                onClick={() => {
                                  const models = plan.allowedModels ? plan.allowedModels.split(',').filter(Boolean) : [];
                                  const updatedModels = models.filter((_: any, i: number) => i !== idx).join(',');
                                  setPlanSettings(planSettings.map(p => p.planId === plan.planId ? { ...p, allowedModels: updatedModels } : p));
                                }}
                                className="text-brand-muted hover:text-brand-danger"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder={t("admin.settings.eGModel")}
                            value={newModels[plan.planId] || ""}
                            onChange={(e) => setNewModels({ ...newModels, [plan.planId]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = newModels[plan.planId]?.trim();
                                if (val) {
                                  const models = plan.allowedModels ? plan.allowedModels.split(',').filter(Boolean) : [];
                                  models.push(val);
                                  setPlanSettings(planSettings.map(p => p.planId === plan.planId ? { ...p, allowedModels: models.join(',') } : p));
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
                                const models = plan.allowedModels ? plan.allowedModels.split(',').filter(Boolean) : [];
                                models.push(val);
                                setPlanSettings(planSettings.map(p => p.planId === plan.planId ? { ...p, allowedModels: models.join(',') } : p));
                                setNewModels({ ...newModels, [plan.planId]: "" });
                              }
                            }}
                            className="px-3 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-sm flex items-center transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          let finalModels = plan.allowedModels;
                          const pendingModel = newModels[plan.planId]?.trim();
                          
                          if (pendingModel) {
                            const models = finalModels ? finalModels.split(',').filter(Boolean) : [];
                            models.push(pendingModel);
                            finalModels = models.join(',');
                            
                            // Optimistically clear the input and update the UI state
                            setNewModels({ ...newModels, [plan.planId]: "" });
                            setPlanSettings(planSettings.map(p => 
                              p.planId === plan.planId ? { ...p, allowedModels: finalModels } : p
                            ));
                          }
                          
                          handleUpdatePlanSetting(plan.planId, { 
                            aiProvider: plan.aiProvider,
                            agentRouterApiKey: plan.agentRouterApiKey,
                            openRouterApiKey: plan.openRouterApiKey,
                            nvidiaApiKey: plan.nvidiaApiKey,
                            allowedModels: finalModels,
                            price: plan.price
                          });
                        }}
                        className="px-4 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-sm font-medium transition-colors"
                      >
                        {t("admin.settings.save")}
                      </button>
                    </div>
                 </GlassContainer>
               ))}
               {planSettings.length === 0 && (
                 <div className="text-center py-12 text-brand-muted">
                   {t("admin.settings.empty")}
                 </div>
               )}
             </div>
           ) : activeTab === "leads" ? (
             <div className="space-y-6">
               <h2 className="text-xl font-medium mb-4">{t("admin.leads.title")}</h2>
               <div className="grid gap-4">
                 {leads.map((lead) => (
                   <GlassContainer key={lead.id} className="p-4 md:p-6 flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                       <div>
                         <h3 className="font-semibold text-lg">{lead.companyName}</h3>
                         <div className="text-brand-muted text-sm mt-1">{lead.contactEmail}</div>
                       </div>
                       <button
                         onClick={() => handleDeleteLead(lead.id)}
                         className="p-2.5 bg-brand-danger/5 hover:bg-brand-danger/15 border border-transparent hover:border-brand-danger/25 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)] text-brand-muted hover:text-[var(--text)] rounded-sm transition-all duration-300"
                         title="Delete Lead"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                       <div>
                         <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">{t("admin.leads.targetUrl")}</span>
                         <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:underline text-sm truncate block">
                           {lead.url}
                         </a>
                       </div>
                       
                       {lead.teamSize && (
                         <div>
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">{t("admin.leads.teamSize")}</span>
                           <span className="text-sm">{lead.teamSize}</span>
                         </div>
                       )}
                       
                       {lead.stack && (
                         <div className="col-span-full">
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">{t("admin.leads.techStack")}</span>
                           <div className="flex flex-wrap gap-1">
                             {(() => {
                               try {
                                 return JSON.parse(lead.stack).map((s: string) => (
                                   <span key={s} className="px-2 py-0.5 bg-surface/50 rounded-full text-xs border border-black/5">
                                     {s}
                                   </span>
                                 ));
                               } catch (e) {
                                 return <span className="text-sm">{lead.stack}</span>;
                               }
                             })()}
                           </div>
                         </div>
                       )}
                       
                       {lead.goals && (
                         <div className="col-span-full">
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">{t("admin.leads.goals")}</span>
                           <div className="flex flex-wrap gap-1">
                             {(() => {
                               try {
                                 return JSON.parse(lead.goals).map((g: string) => (
                                   <span key={g} className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan rounded-full text-xs border border-brand-cyan/20">
                                     {g}
                                   </span>
                                 ));
                               } catch (e) {
                                 return <span className="text-sm">{lead.goals}</span>;
                               }
                             })()}
                           </div>
                         </div>
                       )}
                       
                       {lead.notes && (
                         <div className="col-span-full mt-2 p-3 bg-surface/30 rounded-sm border border-black/5">
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-2">{t("admin.leads.additionalNotes")}</span>
                           <p className="text-sm text-black/80 whitespace-pre-wrap">{lead.notes}</p>
                         </div>
                       )}
                     </div>
                     
                     <div className="text-xs text-brand-muted mt-2">
                       {t("admin.leads.collectedOn")} {new Date(lead.createdAt).toLocaleString()}
                     </div>
                   </GlassContainer>
                 ))}
                 
                 {leads.length === 0 && (
                   <div className="text-center py-12 text-brand-muted">
                     {t("admin.leads.empty")}
                   </div>
                 )}
               </div>
             </div>
           ) : activeTab === "security" ? (
              <div className="space-y-6">
                <h2 className="text-xl font-medium mb-4">{t("admin.security.title")}</h2>
                
                {securityResult ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* JWT Configuration Card */}
                    <GlassContainer className="p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg text-[var(--text)]">{t("admin.security.jwt")}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            securityResult.jwt.status === "healthy" 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : securityResult.jwt.status === "warning"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-brand-danger/20 text-brand-danger border border-brand-danger/30"
                          }`}>
                            {t(`admin.security.status${securityResult.jwt.status.charAt(0).toUpperCase() + securityResult.jwt.status.slice(1)}`)}
                          </span>
                        </div>
                        <p className="text-sm text-brand-muted leading-relaxed mb-4">
                          {securityResult.jwt.reason}
                        </p>
                      </div>
                      <div className="text-xs font-mono text-brand-muted mt-auto pt-4 border-t border-black/5">
                        {t("admin.security.details")}: HS256 algorithm active
                      </div>
                    </GlassContainer>

                    {/* Admin Bootstrap Card */}
                    <GlassContainer className="p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg text-[var(--text)]">{t("admin.security.bootstrap")}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            securityResult.bootstrap.status === "healthy" 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : securityResult.bootstrap.status === "warning"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-brand-danger/20 text-brand-danger border border-brand-danger/30"
                          }`}>
                            {t(`admin.security.status${securityResult.bootstrap.status.charAt(0).toUpperCase() + securityResult.bootstrap.status.slice(1)}`)}
                          </span>
                        </div>
                        <p className="text-sm text-brand-muted leading-relaxed mb-4">
                          {securityResult.bootstrap.reason}
                        </p>
                      </div>
                      <div className="text-xs font-mono text-brand-muted mt-auto pt-4 border-t border-black/5">
                        {t("admin.security.details")}: Standard admin bootstrap check
                      </div>
                    </GlassContainer>

                    {/* Egress Guard Card */}
                    <GlassContainer className="p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg text-[var(--text)]">{t("admin.security.egress")}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            securityResult.egress.status === "healthy" 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : securityResult.egress.status === "warning"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-brand-danger/20 text-brand-danger border border-brand-danger/30"
                          }`}>
                            {t(`admin.security.status${securityResult.egress.status.charAt(0).toUpperCase() + securityResult.egress.status.slice(1)}`)}
                          </span>
                        </div>
                        <p className="text-sm text-brand-muted leading-relaxed mb-4">
                          {securityResult.egress.reason}
                        </p>
                      </div>
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
              </div>
            ) : null}
        </motion.div>
      )}

      <AnimatePresence>
        {selectedReportContext && (
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
                  onClick={() => setSelectedReportContext(null)}
                  className="p-2 -mr-2 text-black/50 hover:text-[var(--text)] hover:bg-black/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="text-base text-black/80">
                <ReportRenderer reportText={selectedReportContext} />
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
    </div>
    </div>
  );
}

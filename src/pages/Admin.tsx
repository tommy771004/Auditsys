import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, FileText, LogOut, ShieldAlert, Trash2, LayoutDashboard, Activity, Settings, Plus, X } from "lucide-react";
import GlassContainer from "../components/ui/GlassContainer";
import type { NavigateTo } from "../types/home";

interface Props {
  onNavigate: NavigateTo;
}

export default function Admin({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audits" | "settings" | "leads">("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [planSettings, setPlanSettings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newModels, setNewModels] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/${activeTab === "overview" ? "stats" : activeTab === "settings" ? "plan-settings" : activeTab}`, {
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
      else setAudits(data);
    } catch (err: any) {
      setError(err.message);
    }
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

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/admin/leads/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (id: string, updates: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAudit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audit?")) return;
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/admin/audits/${id}`, { 
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold text-brand-text flex items-center">
            <ShieldAlert className="mr-3 text-brand-purple" /> Admin Dashboard
          </h1>
          <p className="text-brand-muted mt-2">Manage users and system data</p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-brand-surface/50 hover:bg-brand-surface/80 rounded-lg text-brand-muted hover:text-brand-text transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </button>
      </div>

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-6 py-3 rounded-lg flex items-center font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("audits")}
          className={`px-6 py-3 rounded-lg flex items-center font-medium transition-colors ${
            activeTab === "audits"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <FileText className="mr-2 h-4 w-4" /> Reports
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 rounded-lg flex items-center font-medium transition-colors ${
            activeTab === "users"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Users className="mr-2 h-4 w-4" /> Users
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-3 rounded-lg flex items-center font-medium transition-colors ${
            activeTab === "settings"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Settings className="mr-2 h-4 w-4" /> Settings
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-6 py-3 rounded-lg flex items-center font-medium transition-colors ${
            activeTab === "leads"
              ? "bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
              : "bg-surface/50 text-brand-muted hover:bg-surface/80"
          }`}
        >
          <Users className="mr-2 h-4 w-4" /> Leads
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-lg bg-brand-danger/10 border border-brand-danger/20 text-brand-danger">
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
              <h2 className="text-xl font-medium mb-4">System Overview</h2>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <GlassContainer className="p-6">
                    <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-2" /> Total Users
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                  </GlassContainer>
                  <GlassContainer className="p-6">
                    <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" /> Total Audits
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalAudits}</div>
                  </GlassContainer>
                  <GlassContainer className="p-6">
                    <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-emerald-400" /> Completed
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">{stats.completedAudits}</div>
                  </GlassContainer>
                  <GlassContainer className="p-6">
                    <div className="text-brand-muted text-sm font-medium mb-2 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-amber-400" /> Pending
                    </div>
                    <div className="text-3xl font-bold text-amber-400">{stats.pendingAudits}</div>
                  </GlassContainer>
                </div>
              ) : (
                <div className="text-brand-muted text-center py-8">Loading stats...</div>
              )}
            </div>
          ) : activeTab === "audits" ? (
            <div className="space-y-4">
              {audits.map((item) => (
                <GlassContainer key={item.id} className="p-6">
                  <div className="flex justify-between items-start">
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
                              try {
                                const parsed = JSON.parse(reportText);
                                const findingsCount = parsed.deterministicFindings?.length || 0;
                                const risksCount = parsed.architectureRisks?.length || 0;
                                reportText = `Executive Summary:\n${parsed.executiveSummary}\n\nMetrics:\n- Technical Findings: ${findingsCount}\n- Architecture Risks: ${risksCount}\n\n...(more structured data available, see Console)`;
                              } catch {
                                // Keep as raw text
                              }
                              alert("Report Preview:\n\n" + reportText.substring(0, 800) + (reportText.length > 800 ? "\n\n...(truncated)" : ""));
                            } else if (item.status === 'failed') {
                              alert("Audit failed: " + (item.result?.error || "Unknown error"));
                            } else {
                              alert("No report content available for this audit record.");
                            }
                          }}
                          className="text-brand-cyan hover:text-white text-sm bg-brand-cyan/10 hover:bg-brand-cyan/20 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                        >
                          <FileText className="h-4 w-4 mr-2" /> View Report
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAudit(item.id)}
                      className="text-brand-muted hover:text-brand-danger p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </GlassContainer>
              ))}
              {audits.length === 0 && (
                <div className="text-center py-12 text-brand-muted">
                  No audit records found.
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
                       Joined {new Date(item.createdAt).toLocaleDateString()}
                     </p>
                   </div>
                   <div className="flex flex-wrap items-center gap-3">
                     <select
                       value={item.subscriptionPlan}
                       onChange={(e) => handleUpdateUser(item.id, { subscriptionPlan: e.target.value })}
                       className="bg-brand-surface/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:border-brand-purple"
                     >
                       <option value="free">Free Plan</option>
                       <option value="pro">Pro Plan</option>
                       <option value="enterprise">Enterprise</option>
                     </select>
                     <select
                       value={item.isAdmin ? "admin" : "user"}
                       onChange={(e) => handleUpdateUser(item.id, { isAdmin: e.target.value === "admin" })}
                       className={`px-3 py-1.5 rounded-lg text-sm font-medium border outline-none ${
                         item.isAdmin ? 'bg-brand-purple/20 text-brand-purple border-brand-purple/30' : 'bg-white/5 text-brand-muted border-white/10'
                       }`}
                     >
                       <option value="user">USER</option>
                       <option value="admin">ADMIN</option>
                     </select>
                   </div>
                 </GlassContainer>
               ))}
               {users.length === 0 && (
                 <div className="text-center py-12 text-brand-muted">
                   No users found.
                 </div>
               )}
             </div>
           ) : activeTab === "settings" ? (
             <div className="space-y-6">
               <h2 className="text-xl font-medium mb-4">Plan Settings</h2>
               {planSettings.map((plan) => (
                 <GlassContainer key={plan.planId} className="p-6">
                   <h3 className="text-lg font-bold capitalize mb-4 text-brand-cyan">{plan.planId} Plan</h3>
                     <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-brand-muted mb-2">OpenRouter API Key</label>
                          <input
                            type="password"
                            placeholder="Enter API Key"
                            value={plan.openRouterApiKey}
                            onChange={(e) => {
                              const newSettings = planSettings.map(p => p.planId === plan.planId ? { ...p, openRouterApiKey: e.target.value } : p);
                              setPlanSettings(newSettings);
                            }}
                            className="w-full bg-brand-surface/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-purple"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brand-muted mb-2">Plan Price</label>
                          <input
                            type="text"
                            placeholder="e.g. $29"
                            value={plan.price || ""}
                            onChange={(e) => {
                              const newSettings = planSettings.map(p => p.planId === plan.planId ? { ...p, price: e.target.value } : p);
                              setPlanSettings(newSettings);
                            }}
                            className="w-full bg-brand-surface/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-purple"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brand-muted mb-2">Allowed Models</label>
                        <div className="space-y-2 mb-3">
                          {(plan.allowedModels ? plan.allowedModels.split(',').filter(Boolean) : []).map((model: string, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-brand-purple transition-colors">
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
                            placeholder="e.g. anthropic/claude-3.5-sonnet"
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
                            className="flex-1 bg-brand-surface/50 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-purple text-sm"
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
                            className="px-3 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-lg flex items-center transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                   <div className="mt-4 flex justify-end">
                     <button
                       onClick={() => handleUpdatePlanSetting(plan.planId, { 
                         openRouterApiKey: plan.openRouterApiKey,
                         allowedModels: plan.allowedModels,
                         price: plan.price
                       })}
                       className="px-4 py-2 bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 rounded-lg font-medium transition-colors"
                     >
                       Save Settings
                     </button>
                   </div>
                 </GlassContainer>
               ))}
               {planSettings.length === 0 && (
                 <div className="text-center py-12 text-brand-muted">
                   No plan settings found.
                 </div>
               )}
             </div>
           ) : activeTab === "leads" ? (
             <div className="space-y-6">
               <h2 className="text-xl font-medium mb-4">Leads Management</h2>
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
                         className="p-2 hover:bg-brand-danger/10 text-brand-danger/50 hover:text-brand-danger rounded-lg transition-colors"
                         title="Delete Lead"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                       <div>
                         <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">Target URL</span>
                         <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:underline text-sm truncate block">
                           {lead.url}
                         </a>
                       </div>
                       
                       {lead.teamSize && (
                         <div>
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">Team Size</span>
                           <span className="text-sm">{lead.teamSize}</span>
                         </div>
                       )}
                       
                       {lead.stack && (
                         <div className="col-span-full">
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">Tech Stack</span>
                           <div className="flex flex-wrap gap-1">
                             {(() => {
                               try {
                                 return JSON.parse(lead.stack).map((s: string) => (
                                   <span key={s} className="px-2 py-0.5 bg-surface/50 rounded-full text-xs border border-white/5">
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
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-1">Goals</span>
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
                         <div className="col-span-full mt-2 p-3 bg-surface/30 rounded-lg border border-white/5">
                           <span className="text-xs text-brand-muted uppercase tracking-wider block mb-2">Additional Notes</span>
                           <p className="text-sm text-white/80 whitespace-pre-wrap">{lead.notes}</p>
                         </div>
                       )}
                     </div>
                     
                     <div className="text-xs text-brand-muted mt-2">
                       Collected on {new Date(lead.createdAt).toLocaleString()}
                     </div>
                   </GlassContainer>
                 ))}
                 
                 {leads.length === 0 && (
                   <div className="text-center py-12 text-brand-muted">
                     No leads have been collected yet.
                   </div>
                 )}
               </div>
             </div>
           ) : null}
        </motion.div>
      )}
    </div>
  );
}

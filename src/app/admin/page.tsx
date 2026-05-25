"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock, Plus, Trash2, Ban, CheckCircle, Copy, RefreshCw,
  ChevronDown, ChevronRight, X, Edit3, Car, User, ParkingCircle, Zap, Clock
} from "lucide-react";
import ParticleField from "@/components/ParticleField";

function fmtTime(utc: string | undefined) {
  if (!utc) return "";
  const d = new Date(utc.includes("T") ? utc : utc.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return utc;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Account {
  id: number;
  email: string;
  password: string;
  status: string;
  note: string;
  created_at: string;
}

interface Cdk {
  id: number;
  code: string;
  account_id: number;
  user_name: string;
  status: string;
  created_at: string;
  fetch_count: number;
}

const carColors = [
  "border-[rgba(0,240,255,0.25)] bg-[rgba(0,240,255,0.05)]",
  "border-[rgba(255,45,120,0.25)] bg-[rgba(255,45,120,0.05)]",
  "border-[rgba(184,255,0,0.25)] bg-[rgba(184,255,0,0.05)]",
  "border-[rgba(160,120,255,0.25)] bg-[rgba(160,120,255,0.05)]",
  "border-[rgba(255,180,0,0.25)] bg-[rgba(255,180,0,0.05)]",
  "border-[rgba(0,200,255,0.25)] bg-[rgba(0,200,255,0.05)]",
];

const carAccents = [
  "text-[var(--neon-cyan)]",
  "text-[var(--neon-magenta)]",
  "text-[var(--neon-lime)]",
  "text-purple-400",
  "text-amber-400",
  "text-sky-400",
];

const carBgs = [
  "bg-[rgba(0,240,255,0.07)] border-[rgba(0,240,255,0.2)]",
  "bg-[rgba(255,45,120,0.07)] border-[rgba(255,45,120,0.2)]",
  "bg-[rgba(184,255,0,0.07)] border-[rgba(184,255,0,0.2)]",
  "bg-[rgba(160,120,255,0.07)] border-[rgba(160,120,255,0.2)]",
  "bg-[rgba(255,180,0,0.07)] border-[rgba(255,180,0,0.2)]",
  "bg-[rgba(0,200,255,0.07)] border-[rgba(0,200,255,0.2)]",
];

function CarIcon({ index }: { index: number }) {
  return <Car className={`w-6 h-6 ${carAccents[index % carAccents.length]}`} />;
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cdks, setCdks] = useState<Cdk[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");

  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editAccountForm, setEditAccountForm] = useState({ email: "", note: "", status: "" });

  const [editingCdkId, setEditingCdkId] = useState<number | null>(null);
  const [editCdkName, setEditCdkName] = useState("");
  const [logsCdkId, setLogsCdkId] = useState<number | null>(null);
  const [logs, setLogs] = useState<{ id: number; user_name: string; created_at: string }[]>([]);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/admin/account");
    if (res.ok) { const data = await res.json(); setAccounts(data.data); }
  }, []);

  useEffect(() => { if (loggedIn) fetchAccounts(); }, [loggedIn, fetchAccounts]);

  const fetchCdks = useCallback(async (accountId: number) => {
    const res = await fetch(`/api/admin/cdk?accountId=${accountId}`);
    if (res.ok) { const data = await res.json(); setCdks(data.data); }
  }, []);

  const handleExpand = async (accountId: number) => {
    if (expandedId === accountId) { setExpandedId(null); setCdks([]); return; }
    setExpandedId(accountId);
    setEditingCdkId(null);
    setLogsCdkId(null);
    await fetchCdks(accountId);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setLoggedIn(true);
    else { const data = await res.json(); setLoginError(data.error || "登录失败"); }
  };

  const handleAddAccount = async () => {
    if (!newEmail.trim()) return;
    const res = await fetch("/api/admin/account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), note: newNote.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "添加失败");
      return;
    }
    setNewEmail(""); setNewNote(""); setShowAddForm(false);
    await fetchAccounts();
  };

  const handleDeleteAccount = async (id: number) => {
    await fetch("/api/admin/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (expandedId === id) { setExpandedId(null); setCdks([]); }
    fetchAccounts();
  };

  const handleToggleAccount = async (account: Account) => {
    const s = account.status === "active" ? "disabled" : "active";
    await fetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, email: account.email, password: account.password, note: account.note, status: s }),
    });
    fetchAccounts();
  };

  const startEditAccount = (a: Account) => {
    setEditingAccountId(a.id);
    setEditAccountForm({ email: a.email, note: a.note, status: a.status });
  };
  const saveEditAccount = async () => {
    if (!editingAccountId) return;
    const orig = accounts.find((a) => a.id === editingAccountId);
    await fetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingAccountId, email: editAccountForm.email, password: orig?.password || "", note: editAccountForm.note, status: editAccountForm.status }),
    });
    setEditingAccountId(null); fetchAccounts();
  };

  const handleGenCdk = async (accountId: number) => {
    await fetch("/api/admin/cdk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }) });
    fetchCdks(accountId);
  };
  const handleDeleteCdk = async (id: number, accountId: number) => {
    await fetch("/api/admin/cdk", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchCdks(accountId);
  };
  const handleToggleCdk = async (id: number, status: string, accountId: number) => {
    const s = status === "active" ? "disabled" : "active";
    await fetch("/api/admin/cdk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: s }) });
    fetchCdks(accountId);
  };
  const handleSaveCdkName = async (id: number, accountId: number) => {
    await fetch("/api/admin/cdk", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, userName: editCdkName }) });
    setEditingCdkId(null); fetchCdks(accountId);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // --- Login ---
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ParticleField />
        <form onSubmit={handleLogin} className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-[rgba(255,45,120,0.25)] bg-[rgba(255,45,120,0.05)] mb-4">
              <Lock className="w-8 h-8 text-[var(--neon-magenta)]" />
            </div>
            <h1 className="text-2xl font-bold text-white glow-magenta">车库管理</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">请输入管理员密码</p>
          </div>
          <div className="glass rounded-2xl p-6">
            {loginError && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm border border-[rgba(255,45,120,0.3)] bg-[rgba(255,45,120,0.05)] text-[var(--neon-magenta)]">{loginError}</div>
            )}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="管理员密码"
              className="w-full px-4 py-3 rounded-xl mb-4 input-dark" />
            <button type="submit" className="w-full py-3 rounded-xl font-medium text-[var(--neon-magenta)] bg-[rgba(255,45,120,0.1)] border border-[rgba(255,45,120,0.3)] hover:bg-[rgba(255,45,120,0.2)] transition-all">
              登录
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="min-h-screen p-4 md:p-8">
      <ParticleField />
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-[rgba(255,45,120,0.25)] bg-[rgba(255,45,120,0.05)] flex items-center justify-center">
              <Car className="w-5 h-5 text-[var(--neon-magenta)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white glow-magenta">车库管理</h1>
              <p className="text-[var(--text-muted)] text-sm">管理你的车队和车位</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAccounts} className="p-2 text-[var(--text-muted)] hover:text-[var(--neon-cyan)] rounded-lg transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setLoggedIn(false)} className="px-4 py-2 text-[var(--text-muted)] hover:text-white glass rounded-xl text-sm transition-all">退出</button>
          </div>
        </div>

        {/* Add Car */}
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)}
            className="w-full mb-6 py-3 border border-dashed border-[rgba(0,240,255,0.15)] hover:border-[rgba(0,240,255,0.4)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-all flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> 新增车辆
          </button>
        ) : (
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium flex items-center gap-2"><Plus className="w-5 h-5 text-[var(--neon-cyan)]" /> 新增车辆</h2>
              <button onClick={() => { setShowAddForm(false); setNewEmail(""); setNewNote(""); }} className="p-1 text-[var(--text-muted)] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="邮箱 (如 gpt1@qlcc.online)"
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-sm input-dark" />
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="备注 (如 ChatGPT Plus)"
                className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-sm input-dark" />
            </div>
            <button onClick={handleAddAccount} disabled={!newEmail.trim()} className="px-6 py-2.5 rounded-xl font-medium text-sm btn-cyan">确认添加</button>
          </div>
        )}

        {/* Car List */}
        {accounts.length === 0 ? (
          <div className="py-16 text-center">
            <Car className="w-12 h-12 text-[var(--text-muted)] opacity-20 mx-auto mb-3" />
            <p className="text-[var(--text-muted)]">车库空空如也，添加第一辆车吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account, idx) => {
              const isExpanded = expandedId === account.id;
              const isEditing = editingAccountId === account.id;
              const isDisabled = account.status === "disabled";
              return (
                <div key={account.id} className={`rounded-2xl overflow-hidden transition-all border ${carColors[idx % carColors.length]} ${isDisabled ? "opacity-40" : ""}`}>
                  <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[.02] transition-all"
                    onClick={() => { if (!isEditing) handleExpand(account.id); }}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                    <div className="w-9 h-9 rounded-lg bg-white/[.03] flex items-center justify-center shrink-0">
                      <CarIcon index={idx} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <input value={editAccountForm.email} onChange={(e) => setEditAccountForm({ ...editAccountForm, email: e.target.value })}
                            className="px-3 py-1.5 rounded-lg text-white text-sm w-52 input-dark" />
                          <input value={editAccountForm.note} onChange={(e) => setEditAccountForm({ ...editAccountForm, note: e.target.value })}
                            placeholder="备注" className="px-3 py-1.5 rounded-lg text-white text-sm w-32 input-dark" />
                          <button onClick={() => saveEditAccount()} className="px-3 py-1.5 rounded-lg text-sm btn-cyan">保存</button>
                          <button onClick={() => setEditingAccountId(null)} className="px-3 py-1.5 rounded-lg text-sm glass text-[var(--text-muted)] hover:text-white">取消</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm font-mono">{account.email}</span>
                          {account.note && <span className="text-[var(--text-muted)] text-xs bg-white/[.04] px-2 py-0.5 rounded">{account.note}</span>}
                          {isDisabled && <span className="px-2 py-0.5 text-xs rounded-full border border-[rgba(255,45,120,0.3)] bg-[rgba(255,45,120,0.05)] text-[var(--neon-magenta)]">已停用</span>}
                          <span className="text-[var(--text-muted)] text-xs opacity-50">{fmtTime(account.created_at)}</span>
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => startEditAccount(account)} className="p-2 text-[var(--text-muted)] hover:text-[var(--neon-cyan)] rounded-lg transition-all"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleAccount(account)} className={`p-2 rounded-lg transition-all ${isDisabled ? "text-[var(--text-muted)] hover:text-[var(--neon-lime)]" : "text-[var(--text-muted)] hover:text-[var(--neon-magenta)]"}`}>
                          {isDisabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDeleteAccount(account.id)} className="p-2 text-[var(--text-muted)] hover:text-[var(--neon-magenta)] rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--glass-border)] px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
                          <ParkingCircle className="w-3.5 h-3.5" /> 车位 ({cdks.length})
                        </h3>
                        <button onClick={() => handleGenCdk(account.id)}
                          className="px-3 py-1.5 rounded-lg text-xs btn-cyan flex items-center gap-1">
                          <Plus className="w-3 h-3" /> 新增车位
                        </button>
                      </div>
                      {cdks.length === 0 ? (
                        <p className="text-[var(--text-muted)] opacity-40 text-xs py-3 text-center">暂无车位</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cdks.map((cdk) => (
                            <div key={cdk.id} className={`relative rounded-xl p-3 border ${carBgs[idx % carBgs.length]} transition-all group`}>
                              <button onClick={() => handleCopy(cdk.code)}
                                className="font-mono text-sm font-bold text-[var(--neon-cyan)] hover:text-white transition-all flex items-center gap-1 mb-1">
                                {cdk.code}
                                {copiedCode === cdk.code ? <CheckCircle className="w-3.5 h-3.5 text-[var(--neon-lime)]" /> : <Copy className="w-3.5 h-3.5 opacity-40" />}
                              </button>
                              <p className="text-[var(--text-muted)] text-xs opacity-50 mb-1">{fmtTime(cdk.created_at)}</p>
                              {editingCdkId === cdk.id ? (
                                <div className="flex gap-1 mb-1">
                                  <input value={editCdkName} onChange={(e) => setEditCdkName(e.target.value)} placeholder="微信名"
                                    className="flex-1 px-2 py-1 rounded text-white text-xs input-dark" autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveCdkName(cdk.id, account.id)} />
                                  <button onClick={() => handleSaveCdkName(cdk.id, account.id)} className="px-2 py-1 rounded text-xs btn-cyan">OK</button>
                                  <button onClick={() => setEditingCdkId(null)} className="px-2 py-1 rounded text-xs glass text-[var(--text-muted)]"><X className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mb-1 cursor-pointer hover:opacity-80" onClick={() => { setEditingCdkId(cdk.id); setEditCdkName(cdk.user_name); }}>
                                  <User className="w-3 h-3 text-[var(--text-muted)]" />
                                  <span className={`text-xs ${cdk.user_name ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] italic"}`}>
                                    {cdk.user_name || "点击绑定用户"}
                                  </span>
                                  <Edit3 className="w-2.5 h-2.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                                    cdk.status === "active"
                                      ? "text-[var(--neon-lime)] bg-[rgba(184,255,0,0.08)]"
                                      : "text-[var(--neon-magenta)] bg-[rgba(255,45,120,0.08)]"
                                  }`}>
                                    {cdk.status === "active" ? "启用" : "禁用"}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      if (logsCdkId === cdk.id) { setLogsCdkId(null); setLogs([]); return; }
                                      const res = await fetch(`/api/admin/logs?cdkId=${cdk.id}`);
                                      if (res.ok) { const d = await res.json(); setLogs(d.data); setLogsCdkId(cdk.id); }
                                    }}
                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--neon-cyan)] flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Zap className="w-3 h-3" />{cdk.fetch_count}次
                                  </button>
                                </div>
                                <div className="flex gap-0.5">
                                  <button onClick={() => handleToggleCdk(cdk.id, cdk.status, account.id)}
                                    className={`p-1 rounded transition-all ${cdk.status === "active" ? "text-[var(--text-muted)] hover:text-[var(--neon-magenta)]" : "text-[var(--text-muted)] hover:text-[var(--neon-lime)]"}`}>
                                    {cdk.status === "active" ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                  </button>
                                  <button onClick={() => handleDeleteCdk(cdk.id, account.id)}
                                    className="p-1 text-[var(--text-muted)] hover:text-[var(--neon-magenta)] rounded transition-all">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {logsCdkId === cdk.id && logs.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[var(--glass-border)] space-y-1 max-h-32 overflow-y-auto">
                                  {logs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between text-xs">
                                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                                        <Clock className="w-3 h-3 opacity-40" />{fmtTime(log.created_at)}
                                      </span>
                                      <span className="text-[var(--text-muted)]">{log.user_name || "未知"}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

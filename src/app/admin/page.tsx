"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock, Plus, Trash2, Ban, CheckCircle, Copy, RefreshCw,
  ChevronDown, ChevronRight, X, Edit3, Car, User, ParkingCircle, Zap, Clock
} from "lucide-react";

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
  "from-blue-600/20 to-blue-800/10 border-blue-500/30",
  "from-purple-600/20 to-purple-800/10 border-purple-500/30",
  "from-emerald-600/20 to-emerald-800/10 border-emerald-500/30",
  "from-orange-600/20 to-orange-800/10 border-orange-500/30",
  "from-pink-600/20 to-pink-800/10 border-pink-500/30",
  "from-cyan-600/20 to-cyan-800/10 border-cyan-500/30",
  "from-yellow-600/20 to-yellow-800/10 border-yellow-500/30",
  "from-red-600/20 to-red-800/10 border-red-500/30",
];

const carAccents = [
  "text-blue-400",
  "text-purple-400",
  "text-emerald-400",
  "text-orange-400",
  "text-pink-400",
  "text-cyan-400",
  "text-yellow-400",
  "text-red-400",
];

const carBgs = [
  "bg-blue-500/10 border-blue-500/20",
  "bg-purple-500/10 border-purple-500/20",
  "bg-emerald-500/10 border-emerald-500/20",
  "bg-orange-500/10 border-orange-500/20",
  "bg-pink-500/10 border-pink-500/20",
  "bg-cyan-500/10 border-cyan-500/20",
  "bg-yellow-500/10 border-yellow-500/20",
  "bg-red-500/10 border-red-500/20",
];

function CarIcon({ index }: { index: number }) {
  const colorClass = carAccents[index % carAccents.length];
  return <Car className={`w-6 h-6 ${colorClass}`} />;
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
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.data);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) fetchAccounts();
  }, [loggedIn, fetchAccounts]);

  const fetchCdks = useCallback(async (accountId: number) => {
    const res = await fetch(`/api/admin/cdk?accountId=${accountId}`);
    if (res.ok) {
      const data = await res.json();
      setCdks(data.data);
    }
  }, []);

  const handleExpand = async (accountId: number) => {
    if (expandedId === accountId) {
      setExpandedId(null);
      setCdks([]);
      return;
    }
    setExpandedId(accountId);
    setEditingCdkId(null);
    await fetchCdks(accountId);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setLoggedIn(true);
    } else {
      const data = await res.json();
      setLoginError(data.error || "登录失败");
    }
  };

  const handleAddAccount = async () => {
    if (!newEmail.trim()) return;
    await fetch("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), note: newNote.trim() }),
    });
    setNewEmail("");
    setNewNote("");
    setShowAddForm(false);
    fetchAccounts();
  };

  const handleDeleteAccount = async (id: number) => {
    await fetch("/api/admin/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (expandedId === id) { setExpandedId(null); setCdks([]); }
    fetchAccounts();
  };

  const handleToggleAccount = async (account: Account) => {
    const s = account.status === "active" ? "disabled" : "active";
    await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
    await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingAccountId, email: editAccountForm.email, password: orig?.password || "", note: editAccountForm.note, status: editAccountForm.status }),
    });
    setEditingAccountId(null);
    fetchAccounts();
  };

  const handleGenCdk = async (accountId: number) => {
    await fetch("/api/admin/cdk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    fetchCdks(accountId);
  };

  const handleDeleteCdk = async (id: number, accountId: number) => {
    await fetch("/api/admin/cdk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCdks(accountId);
  };

  const handleToggleCdk = async (id: number, status: string, accountId: number) => {
    const s = status === "active" ? "disabled" : "active";
    await fetch("/api/admin/cdk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: s }),
    });
    fetchCdks(accountId);
  };

  const handleSaveCdkName = async (id: number, accountId: number) => {
    await fetch("/api/admin/cdk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userName: editCdkName }),
    });
    setEditingCdkId(null);
    fetchCdks(accountId);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // --- Login ---
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <Lock className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">车库管理</h1>
            <p className="text-slate-400 text-sm mt-1">请输入管理员密码</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
            {loginError && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">{loginError}</div>
            )}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="管理员密码"
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all mb-4" />
            <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl transition-all">登录</button>
          </div>
        </form>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Car className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">车库管理</h1>
              <p className="text-slate-400 text-sm">管理你的车队和车位</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAccounts} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setLoggedIn(false)} className="px-4 py-2 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-all text-sm">退出</button>
          </div>
        </div>

        {/* Add Car */}
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)}
            className="w-full mb-6 py-3 border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl text-slate-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> 新增车辆
          </button>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" /> 新增车辆</h2>
              <button onClick={() => { setShowAddForm(false); setNewEmail(""); setNewNote(""); }} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="邮箱 (如 gpt1@qlcc.online)"
                className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all text-sm" />
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="备注 (如 ChatGPT Plus)"
                className="flex-1 min-w-[160px] px-4 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all text-sm" />
            </div>
            <button onClick={handleAddAccount} disabled={!newEmail.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-all text-sm">确认添加</button>
          </div>
        )}

        {/* Car List */}
        {accounts.length === 0 ? (
          <div className="py-16 text-center">
            <Car className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">车库空空如也，添加第一辆车吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account, idx) => {
              const isExpanded = expandedId === account.id;
              const isEditing = editingAccountId === account.id;
              const isDisabled = account.status === "disabled";
              return (
                <div key={account.id} className={`bg-gradient-to-r ${carColors[idx % carColors.length]} border rounded-2xl overflow-hidden transition-all ${isDisabled ? "opacity-50" : ""}`}>
                  {/* Car Header */}
                  <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[.02] transition-all"
                    onClick={() => { if (!isEditing) handleExpand(account.id); }}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <CarIcon index={idx} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <input value={editAccountForm.email} onChange={(e) => setEditAccountForm({ ...editAccountForm, email: e.target.value })}
                            className="px-3 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm w-52" />
                          <input value={editAccountForm.note} onChange={(e) => setEditAccountForm({ ...editAccountForm, note: e.target.value })}
                            placeholder="备注" className="px-3 py-1.5 bg-slate-900/80 border border-slate-600/50 rounded-lg text-white text-sm w-32" />
                          <button onClick={() => saveEditAccount()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">保存</button>
                          <button onClick={() => setEditingAccountId(null)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">取消</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm font-mono">{account.email}</span>
                          {account.note && <span className="text-slate-400 text-xs bg-white/5 px-2 py-0.5 rounded">{account.note}</span>}
                          {isDisabled && <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20">已停用</span>}
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => startEditAccount(account)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleAccount(account)} className={`p-2 rounded-lg transition-all ${isDisabled ? "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"}`}>
                          {isDisabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDeleteAccount(account.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>

                  {/* Parking Spots */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm text-slate-400 flex items-center gap-1.5">
                          <ParkingCircle className="w-3.5 h-3.5" /> 车位 ({cdks.length})
                        </h3>
                        <button onClick={() => handleGenCdk(account.id)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs flex items-center gap-1 transition-all">
                          <Plus className="w-3 h-3" /> 新增车位
                        </button>
                      </div>
                      {cdks.length === 0 ? (
                        <p className="text-slate-600 text-xs py-3 text-center">暂无车位，点击上方按钮添加</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cdks.map((cdk) => (
                            <div key={cdk.id} className={`relative rounded-xl p-3 border ${carBgs[idx % carBgs.length]} transition-all group`}>
                              {/* CDK Code */}
                              <button onClick={() => handleCopy(cdk.code)}
                                className="font-mono text-sm font-bold text-blue-300 hover:text-blue-200 transition-all flex items-center gap-1 mb-2">
                                {cdk.code}
                                {copiedCode === cdk.code ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-40" />}
                              </button>
                              {/* User Name */}
                              {editingCdkId === cdk.id ? (
                                <div className="flex gap-1 mb-1">
                                  <input value={editCdkName} onChange={(e) => setEditCdkName(e.target.value)} placeholder="微信名"
                                    className="flex-1 px-2 py-1 bg-slate-900/80 border border-slate-600/50 rounded text-white text-xs" autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveCdkName(cdk.id, account.id)} />
                                  <button onClick={() => handleSaveCdkName(cdk.id, account.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">OK</button>
                                  <button onClick={() => setEditingCdkId(null)} className="px-2 py-1 bg-slate-700 text-white rounded text-xs">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mb-1 cursor-pointer hover:opacity-80" onClick={() => { setEditingCdkId(cdk.id); setEditCdkName(cdk.user_name); }}>
                                  <User className="w-3 h-3 text-slate-500" />
                                  <span className={`text-xs ${cdk.user_name ? "text-slate-300" : "text-slate-600 italic"}`}>
                                    {cdk.user_name || "点击绑定用户"}
                                  </span>
                                  <Edit3 className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 text-xs rounded ${cdk.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {cdk.status === "active" ? "启用" : "禁用"}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      if (logsCdkId === cdk.id) { setLogsCdkId(null); setLogs([]); return; }
                                      const res = await fetch(`/api/admin/logs?cdkId=${cdk.id}`);
                                      if (res.ok) { const d = await res.json(); setLogs(d.data); setLogsCdkId(cdk.id); }
                                    }}
                                    className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Zap className="w-3 h-3" />{cdk.fetch_count}次
                                  </button>
                                </div>
                                <div className="flex gap-0.5">
                                  <button onClick={() => handleToggleCdk(cdk.id, cdk.status, account.id)}
                                    className={`p-1 rounded transition-all ${cdk.status === "active" ? "text-slate-500 hover:text-red-400" : "text-slate-500 hover:text-emerald-400"}`}>
                                    {cdk.status === "active" ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                  </button>
                                  <button onClick={() => handleDeleteCdk(cdk.id, account.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 rounded transition-all">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {/* Fetch Logs */}
                              {logsCdkId === cdk.id && logs.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1 max-h-32 overflow-y-auto">
                                  {logs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between text-xs">
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-600" />{log.created_at}
                                      </span>
                                      <span className="text-slate-500">{log.user_name || "未知"}</span>
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

"use client";

import { useState, useCallback } from "react";
import { KeyRound, Mail, Clock, Copy, Check, RefreshCw, AlertCircle, Car, Users, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface EmailResult {
  emailId: number;
  subject: string;
  from: string;
  time: string;
  codes: { code: string; source: string }[];
  text: string;
  html: string;
}

interface FetchStat {
  user_name: string;
  count: number;
  last_fetch: string;
}

function EmailHtmlViewer({ html }: { html: string }) {
  const iframeId = `email-html-${Math.random().toString(36).slice(2)}`;

  return (
    <iframe
      id={iframeId}
      srcDoc={html}
      title="Email Content"
      sandbox="allow-same-origin"
      className="w-full border-0 rounded-lg bg-white"
      style={{ minHeight: "200px", maxHeight: "500px" }}
      onLoad={(e) => {
        const iframe = e.target as HTMLIFrameElement;
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc?.body) {
            const height = doc.body.scrollHeight + 20;
            iframe.style.height = `${Math.min(Math.max(height, 150), 500)}px`;
          }
        } catch { /* cross-origin */ }
      }}
    />
  );
}

export default function Home() {
  const [cdk, setCdk] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "records">("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [stats, setStats] = useState<FetchStat[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuery = useCallback(async () => {
    if (!cdk.trim()) return;
    setLoading(true);
    setError("");
    setExpandedIds(new Set());
    try {
      if (activeTab === "code") {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cdk.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setEmails([]); setEmail(""); return; }
        setEmail(data.data.email);
        setUserName(data.data.userName);
        setEmails(data.data.emails);
      } else {
        const res = await fetch("/api/verify/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cdk.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setStats([]); setEmail(""); return; }
        setEmail(data.data.email);
        setUserName(data.data.currentUser);
        setStats(data.data.stats);
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [cdk, activeTab]);

  const handleCopy = async (code: string, key: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Car className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Mail Car</h1>
          <p className="text-slate-400 text-sm">输入车位号 (CDK) 获取验证码</p>
        </div>

        {/* Input */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-4 backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={cdk}
                onChange={(e) => setCdk(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                placeholder="输入车位号 (CDK)"
                className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all text-center text-lg tracking-widest font-mono"
              />
            </div>
            <button onClick={handleQuery} disabled={loading || !cdk.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 whitespace-nowrap">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "查询"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-5 bg-slate-800/30 border border-slate-700/50 rounded-xl p-1">
          <button onClick={() => setActiveTab("code")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "code" ? "bg-slate-700/80 text-white" : "text-slate-500 hover:text-slate-300"}`}>
            <Zap className="w-4 h-4" /> 获取验证码
          </button>
          <button onClick={() => setActiveTab("records")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "records" ? "bg-slate-700/80 text-white" : "text-slate-500 hover:text-slate-300"}`}>
            <Users className="w-4 h-4" /> 查询记录
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Info bar */}
        {email && (
          <div className="mb-4 flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Mail className="w-3.5 h-3.5" /> <span className="font-mono text-blue-400">{email}</span>
            </span>
            {userName && (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Users className="w-3.5 h-3.5" /> <span className="text-slate-300">{userName}</span>
              </span>
            )}
          </div>
        )}

        {/* Tab: Verification Codes */}
        {activeTab === "code" && (
          <>
            {emails.length > 0 && (
              <div className="space-y-3">
                {emails.map((item) => {
                  const isExpanded = expandedIds.has(item.emailId);
                  return (
                    <div key={item.emailId} className="bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm overflow-hidden">
                      {/* Header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{item.subject}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-slate-500 text-xs">{item.from}</span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                            </div>
                          </div>
                        </div>

                        {/* Extracted Codes */}
                        {item.codes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.codes.map((c, i) => {
                              const key = `${item.emailId}-${i}`;
                              return (
                                <button key={key} onClick={() => handleCopy(c.code, key)}
                                  className="group flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all">
                                  <span className="text-emerald-400 font-mono font-bold text-lg tracking-wider">{c.code}</span>
                                  {copiedId === key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-500/50 group-hover:text-emerald-400" />}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Toggle HTML view */}
                        {item.html && (
                          <button onClick={() => toggleExpand(item.emailId)}
                            className="mt-3 w-full flex items-center justify-center gap-1 text-slate-500 hover:text-slate-300 text-xs py-1 transition-all">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? "收起邮件" : "查看邮件原文"}
                          </button>
                        )}
                      </div>

                      {/* HTML Content */}
                      {isExpanded && item.html && (
                        <div className="border-t border-slate-700/50 p-3">
                          <EmailHtmlViewer html={item.html} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {email && emails.length === 0 && !loading && (
              <div className="text-center py-10">
                <Mail className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">该邮箱暂无收件</p>
              </div>
            )}
          </>
        )}

        {/* Tab: Records */}
        {activeTab === "records" && (
          <>
            {stats.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-400 text-sm flex items-center gap-1.5"><Users className="w-4 h-4" /> 同车用户获取记录</span>
                  <span className="text-slate-600 text-xs">共 {stats.length} 位用户</span>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {stats.map((stat, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-700/10 transition-all">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        i === 1 ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" :
                        i === 2 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                        "bg-slate-700/30 text-slate-500"
                      }`}>
                        {stat.user_name ? stat.user_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${stat.user_name === userName ? "text-blue-400 font-medium" : "text-white"}`}>
                          {stat.user_name || "未知用户"}
                          {stat.user_name === userName && <span className="ml-1.5 text-xs text-blue-500/80">(你)</span>}
                        </p>
                        <p className="text-slate-500 text-xs">最近: {stat.last_fetch}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-white">{stat.count}</span>
                        <span className="text-slate-500 text-xs ml-1">次</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {email && stats.length === 0 && !loading && (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">暂无查询记录</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

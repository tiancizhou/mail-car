"use client";

import { useState, useCallback } from "react";
import { KeyRound, Mail, Clock, Copy, Check, RefreshCw, AlertCircle, Rocket, Users, Zap, ChevronDown, ChevronUp } from "lucide-react";
import ParticleField from "@/components/ParticleField";
import Earth3D from "@/components/Earth3D";

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
  return (
    <iframe
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
            iframe.style.height = `${Math.min(Math.max(doc.body.scrollHeight + 20, 150), 500)}px`;
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
  const [easterEgg, setEasterEgg] = useState<"idle" | "flying" | "returning">("idle");

  const triggerEasterEgg = () => {
    if (easterEgg !== "idle") return;
    setEasterEgg("flying");
    setTimeout(() => setEasterEgg("returning"), 1200);
    setTimeout(() => setEasterEgg("idle"), 2200);
  };
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <ParticleField />
      <Earth3D />
      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1 glow-cyan">Mail Car</h1>
          <p className="text-[var(--text-muted)] text-sm">输入车位号 (CDK) 获取验证码</p>
        </div>

        {/* Spaceship body */}
        <div className={`relative mb-5 ${
          easterEgg === "flying" ? "ship-morph" :
          easterEgg === "returning" ? "ship-return" : ""
        }`}>
          {/* Engine glow */}
          <div className={`absolute -bottom-3 left-1/2 w-24 h-6 rounded-full bg-[rgba(0,240,255,0.15)] blur-md ${
            easterEgg === "flying" ? "engine-burst" : "-translate-x-1/2"
          }`} />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-[rgba(0,240,255,0.25)] blur-sm" />
          {/* Left wing */}
          <div className="absolute -left-6 bottom-0 w-6 h-full">
            <div className="w-full h-full bg-gradient-to-r from-[rgba(0,240,255,0.06)] to-[rgba(0,240,255,0.12)] border border-[rgba(0,240,255,0.15)] border-r-0 rounded-l-lg"
              style={{ clipPath: "polygon(100% 15%, 0% 50%, 100% 85%)" }} />
          </div>

          {/* Right wing */}
          <div className="absolute -right-6 bottom-0 w-6 h-full">
            <div className="w-full h-full bg-gradient-to-l from-[rgba(0,240,255,0.06)] to-[rgba(0,240,255,0.12)] border border-[rgba(0,240,255,0.15)] border-l-0 rounded-r-lg"
              style={{ clipPath: "polygon(0% 15%, 100% 50%, 0% 85%)" }} />
          </div>

          {/* Nose cone */}
          <div className="flex justify-center -mt-4">
            <div className="w-0 h-0 border-l-[60px] border-r-[60px] border-b-[16px] border-l-transparent border-r-transparent border-b-[rgba(0,240,255,0.15)]" />
          </div>

          {/* Main fuselage */}
          <div className="glass rounded-2xl p-5 border-[rgba(0,240,255,0.2)] relative overflow-hidden">
            {/* Cockpit window glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent opacity-40" />
            {/* Bottom hull line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[rgba(0,240,255,0.3)] to-transparent" />

            {/* Cockpit icon */}
            <div className="flex justify-center mb-3">
              <div
                onClick={triggerEasterEgg}
                className="w-10 h-10 rounded-full border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.06)] flex items-center justify-center cursor-pointer hover:bg-[rgba(0,240,255,0.12)] hover:scale-110 transition-all active:scale-95"
              >
                <Rocket className="w-5 h-5 text-[var(--neon-cyan)]" />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={cdk}
                  onChange={(e) => setCdk(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                  placeholder="输入车位号 (CDK)"
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-center text-lg tracking-widest font-mono input-dark"
                />
              </div>
              <button onClick={handleQuery} disabled={loading || !cdk.trim()} className="px-6 py-3 rounded-xl font-medium btn-cyan flex items-center gap-2 whitespace-nowrap">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                发射
              </button>
            </div>
          </div>

          {/* Side thrusters */}
          <div className="absolute -bottom-1 left-4 w-2 h-3 rounded-b-full bg-[rgba(0,240,255,0.3)] blur-[2px]" />
          <div className="absolute -bottom-1 right-4 w-2 h-3 rounded-b-full bg-[rgba(0,240,255,0.3)] blur-[2px]" />
        </div>

        {/* Tabs */}
        <div className="flex mb-5 glass rounded-xl p-1">
          <button onClick={() => setActiveTab("code")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "code" ? "bg-[rgba(0,240,255,0.1)] text-[var(--neon-cyan)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}>
            <Zap className="w-4 h-4" /> 获取验证码
          </button>
          <button onClick={() => setActiveTab("records")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "records" ? "bg-[rgba(0,240,255,0.1)] text-[var(--neon-cyan)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}>
            <Users className="w-4 h-4" /> 查询记录
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 mb-5 flex items-center gap-3 border border-[rgba(255,45,120,0.3)] bg-[rgba(255,45,120,0.05)]">
            <AlertCircle className="w-5 h-5 text-[var(--neon-magenta)] shrink-0" />
            <p className="text-[var(--neon-magenta)] text-sm">{error}</p>
          </div>
        )}

        {/* Info bar */}
        {email && (
          <div className="mb-4 flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <Mail className="w-3.5 h-3.5" /> <span className="font-mono text-[var(--neon-cyan)]">{email}</span>
            </span>
            {userName && (
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Users className="w-3.5 h-3.5" /> <span className="text-[var(--text-primary)]">{userName}</span>
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
                    <div key={item.emailId} className="glass rounded-xl overflow-hidden">
                      <div className="p-4">
                        <div className="flex-1 min-w-0 mb-2">
                          <p className="text-[var(--text-primary)] font-medium text-sm truncate">{item.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[var(--text-muted)] text-xs">{item.from}</span>
                            <span className="text-[var(--text-muted)] opacity-40">·</span>
                            <span className="text-[var(--text-muted)] text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                          </div>
                        </div>
                        {item.codes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.codes.map((c, i) => {
                              const key = `${item.emailId}-${i}`;
                              return (
                                <button key={key} onClick={() => handleCopy(c.code, key)}
                                  className="group flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(184,255,0,0.25)] bg-[rgba(184,255,0,0.06)] hover:bg-[rgba(184,255,0,0.12)] transition-all">
                                  <span className="text-[var(--neon-lime)] font-mono font-bold text-lg tracking-wider glow-lime">{c.code}</span>
                                  {copiedId === key ? <Check className="w-4 h-4 text-[var(--neon-lime)]" /> : <Copy className="w-4 h-4 text-[var(--neon-lime)] opacity-40 group-hover:opacity-80" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {item.html && (
                          <button onClick={() => toggleExpand(item.emailId)}
                            className="mt-3 w-full flex items-center justify-center gap-1 text-[var(--text-muted)] hover:text-[var(--neon-cyan)] text-xs py-1 transition-all">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? "收起邮件" : "查看邮件原文"}
                          </button>
                        )}
                      </div>
                      {isExpanded && item.html && (
                        <div className="border-t border-[var(--glass-border)] p-3">
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
                <Mail className="w-12 h-12 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
                <p className="text-[var(--text-muted)]">该邮箱暂无收件</p>
              </div>
            )}
          </>
        )}

        {/* Tab: Records */}
        {activeTab === "records" && (
          <>
            {stats.length > 0 && (
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--glass-border)] flex items-center justify-between">
                  <span className="text-[var(--text-muted)] text-sm flex items-center gap-1.5"><Users className="w-4 h-4 text-[var(--neon-cyan)]" /> 同车用户获取记录</span>
                  <span className="text-[var(--text-muted)] text-xs opacity-60">共 {stats.length} 位用户</span>
                </div>
                <div className="divide-y divide-[var(--glass-border)]">
                  {stats.map((stat, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-[rgba(0,240,255,0.02)] transition-all">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-[rgba(184,255,0,0.1)] text-[var(--neon-lime)] border border-[rgba(184,255,0,0.3)]" :
                        i === 1 ? "bg-[rgba(0,240,255,0.1)] text-[var(--neon-cyan)] border border-[rgba(0,240,255,0.3)]" :
                        i === 2 ? "bg-[rgba(255,45,120,0.1)] text-[var(--neon-magenta)] border border-[rgba(255,45,120,0.3)]" :
                        "bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]"
                      }`}>
                        {stat.user_name ? stat.user_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${stat.user_name === userName ? "text-[var(--neon-cyan)] font-medium" : "text-[var(--text-primary)]"}`}>
                          {stat.user_name || "未知用户"}
                          {stat.user_name === userName && <span className="ml-1.5 text-xs text-[var(--neon-cyan)] opacity-60">(你)</span>}
                        </p>
                        <p className="text-[var(--text-muted)] text-xs">最近: {stat.last_fetch}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[var(--text-primary)]">{stat.count}</span>
                        <span className="text-[var(--text-muted)] text-xs ml-1">次</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {email && stats.length === 0 && !loading && (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
                <p className="text-[var(--text-muted)]">暂无查询记录</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

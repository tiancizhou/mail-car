"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Check, Clock3, Copy, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

interface EmailResult {
  emailId: number;
  time: string;
  codes: { code: string; source: string }[];
}

interface CodeResult {
  id: string;
  code: string;
  time: string;
}

export default function Home() {
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);
  const [error, setError] = useState("");
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [copiedCode, setCopiedCode] = useState("");

  const results = useMemo<CodeResult[]>(() => {
    const seen = new Set<string>();
    return emails.flatMap((item) => item.codes.map((entry, index) => ({
      id: `${item.emailId}-${index}`,
      code: entry.code,
      time: item.time,
    }))).filter((item) => {
      if (seen.has(item.code)) return false;
      seen.add(item.code);
      return true;
    });
  }, [emails]);

  const fetchCode = useCallback(async () => {
    const key = accessKey.trim().toUpperCase();
    if (!key || loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: key }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "获取失败，请稍后重试");
        setEmails([]);
        setQueried(false);
        return;
      }
      setEmails(body.data.emails || []);
      setQueried(true);
    } catch {
      setError("网络连接失败，请检查网络后重试");
      setEmails([]);
      setQueried(false);
    } finally {
      setLoading(false);
    }
  }, [accessKey, loading]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(""), 1800);
  }

  const latest = results[0];

  return (
    <main className="access-page">
      <div className="access-shell">
        <header className="access-header">
          <div className="access-logo"><ShieldCheck aria-hidden="true" /></div>
          <span>验证码查看</span>
        </header>

        <section className="access-intro">
          <span className="access-eyebrow">SECURE CODE ACCESS</span>
          <h1>输入密钥<br />查看验证码</h1>
          <p>无需登录。验证密钥后，即可查看最新结果。</p>
        </section>

        <section className="access-panel">
          <label htmlFor="access-key">访问密钥</label>
          <div className="access-form">
            <div className="access-input">
              <KeyRound aria-hidden="true" />
              <input
                id="access-key"
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value.toUpperCase())}
                onKeyDown={(event) => event.key === "Enter" && fetchCode()}
                placeholder="请输入访问密钥"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            </div>
            <button onClick={fetchCode} disabled={loading || !accessKey.trim()}>
              {loading ? <Loader2 className="spin" /> : queried ? <RefreshCw /> : <span>获取</span>}
              {loading ? "获取中" : queried ? "刷新" : null}
            </button>
          </div>
          <small><ShieldCheck />密钥仅用于本次验证</small>
        </section>

        {error && (
          <div className="access-error" role="alert">
            <AlertCircle /><span>{error}</span>
          </div>
        )}

        {queried && (
          <section className="result-section" aria-live="polite">
            {latest ? (
              <>
                <div className="result-heading"><span>最新验证码</span><small><Clock3 />{latest.time}</small></div>
                <button className="hero-code" onClick={() => copyCode(latest.code)} aria-label={`复制验证码 ${latest.code}`}>
                  <strong>{latest.code}</strong>
                  <span>{copiedCode === latest.code ? <><Check />已复制</> : <><Copy />点击复制</>}</span>
                </button>

                {results.length > 1 && (
                  <div className="other-results">
                    <div className="other-results__title"><span>其他结果</span><small>{results.length - 1} 条</small></div>
                    {results.slice(1).map((item) => (
                      <button key={item.id} onClick={() => copyCode(item.code)}>
                        <strong>{item.code}</strong>
                        <span><Clock3 />{item.time}</span>
                        {copiedCode === item.code ? <Check /> : <Copy />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="access-empty">
                <Clock3 />
                <strong>暂时没有验证码</strong>
                <span>请稍后点击刷新重试</span>
              </div>
            )}
          </section>
        )}

        <footer className="access-footer">安全验证 · 即查即用</footer>
      </div>
    </main>
  );
}

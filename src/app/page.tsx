"use client";

import { useCallback, useState } from "react";
import { AlertCircle, Clock3, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

interface EmailResult {
  emailId: number;
  time: string;
  subject: string;
  from: string;
  text: string;
  html: string;
}

function EmailBody({ email }: { email: EmailResult }) {
  if (!email.html?.trim()) {
    return <pre className="email-text">{email.text || "这封邮件没有正文"}</pre>;
  }
  // Isolate untrusted email markup and block scripts, forms, and remote tracking.
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;color:#18251f;background:white;overflow-wrap:anywhere;font-family:system-ui,sans-serif}img{max-width:100%;height:auto}pre{white-space:pre-wrap}</style></head><body>${email.html}</body></html>`;
  return <iframe className="email-frame" title={`邮件正文：${email.subject || "无主题"}`} sandbox="" referrerPolicy="no-referrer" srcDoc={document} />;
}

export default function Home() {
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);
  const [error, setError] = useState("");
  const [emails, setEmails] = useState<EmailResult[]>([]);
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
          <p>验证密钥后查看邮件原文，请在邮件中查找验证码。</p>
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
            {emails.length > 0 ? (
              <>
                <div className="result-heading"><span>邮件原文</span><small>{emails.length} 封邮件</small></div>
                {emails.map((email, index) => (
                  <details className="email-card" key={email.emailId} open={index === 0}>
                    <summary>
                      <span className="email-card__heading"><span className="email-card__label">{index === 0 ? "最新邮件" : "较早邮件"}</span><strong>{email.subject || "无主题"}</strong></span>
                      <span className="email-card__time"><Clock3 />{email.time}</span>
                    </summary>
                    <div className="email-card__sender">发件人：{email.from || "未知发件人"}</div>
                    <EmailBody email={email} />
                  </details>
                ))}
              </>
            ) : (
              <div className="access-empty">
                <Clock3 />
                <strong>暂时没有邮件</strong>
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

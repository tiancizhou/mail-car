"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Ban, CalendarClock, Car, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, CircleParking, Clipboard, Clock3,
  Copy, Edit3, KeyRound, Loader2, LogOut, Plus, RefreshCw, Search, ShieldAlert,
  Trash2, UserRound, X, Zap,
} from "lucide-react";
import ParticleField from "@/components/ParticleField";

type VehicleStatus = "all" | "active" | "disabled";
type RiskFilter = "all" | "7days" | "30days" | "expired" | "unset";
type SortBy = "expiry" | "created" | "fetches" | "recent";
type DateField = "created" | "expiry";

interface Account {
  id: number;
  email: string;
  password: string;
  status: "active" | "disabled";
  note: string;
  expires_at: string | null;
  created_at: string;
  total_cdks: number;
  active_cdks: number;
  disabled_cdks: number;
  total_fetches: number;
  last_used_at: string | null;
  cdk_codes: string;
}

interface Cdk {
  id: number;
  code: string;
  account_id: number;
  user_name: string;
  status: "active" | "disabled";
  created_at: string;
  last_used_at: string | null;
  fetch_count: number;
}

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  disabledAccounts: number;
  totalCdks: number;
  activeCdks: number;
  disabledCdks: number;
  todayFetches: number;
  weekFetches: number;
  monthFetches: number;
  unusedCdks: number;
  expiring7Days: number;
  expiring30Days: number;
  expiredAccounts: number;
}

interface ExpiringSoon {
  id: number;
  email: string;
  note: string;
  status: string;
  expires_at: string;
  days_remaining: number;
  total_cdks: number;
  active_cdks: number;
}

const PAGE_SIZE = 15;

function formatInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renewalDateAfterMonths(months: number) {
  const today = new Date();
  const targetMonth = today.getMonth() + months;
  const lastDay = new Date(today.getFullYear(), targetMonth + 1, 0).getDate();
  return formatInputDate(new Date(today.getFullYear(), targetMonth, Math.min(today.getDate(), lastDay)));
}

const renewalPresets = [
  { label: "1 个月", months: 1 },
  { label: "3 个月", months: 3 },
  { label: "1 年", months: 12 },
];

function parseUtc(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

function formatTime(value: string | null | undefined) {
  const date = parseUtc(value);
  if (!date || Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function expiryMeta(value: string | null) {
  const days = daysUntil(value);
  if (days === null) return { label: "未设置", tone: "muted", detail: "补充续费日" };
  if (days < 0) return { label: "已到期", tone: "danger", detail: `${Math.abs(days)} 天前` };
  if (days === 0) return { label: "今天到期", tone: "danger", detail: "今天" };
  if (days <= 7) return { label: "即将到期", tone: "danger", detail: `剩 ${days} 天` };
  if (days <= 30) return { label: "临近到期", tone: "warning", detail: `剩 ${days} 天` };
  return { label: "有效", tone: "success", detail: `剩 ${days} 天` };
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`status-pill ${active ? "status-pill--active" : "status-pill--disabled"}`}><span className="status-dot" />{active ? "启用" : "已停用"}</span>;
}

function ExpiryCell({ value }: { value: string | null }) {
  const meta = expiryMeta(value);
  return <div className="expiry-cell"><span className={`expiry-badge expiry-badge--${meta.tone}`}>{meta.label}</span><span className="expiry-date">{value ? value.slice(0, 10) : meta.detail}</span>{value && <span className={`expiry-days expiry-days--${meta.tone}`}>{meta.detail}</span>}</div>;
}

function RenewalDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="renewal-picker">
      <legend>续费日期</legend>
      <div className="renewal-presets">
        {renewalPresets.map((preset) => {
          const date = renewalDateAfterMonths(preset.months);
          return <button key={preset.months} type="button" className={value === date ? "is-selected" : ""} onClick={() => onChange(date)}><strong>{preset.label}</strong><small>{date.slice(5).replace("-", "/")}</small></button>;
        })}
        <button type="button" className={!value ? "is-selected" : ""} onClick={() => onChange("")}><strong>不设置</strong><small>稍后填写</small></button>
      </div>
      <label className="exact-date"><CalendarClock /><span>精确日期</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} /></label>
    </fieldset>
  );
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiring, setExpiring] = useState<ExpiringSoon[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [onlyDisabledSeats, setOnlyDisabledSeats] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("expiry");
  const [dateField, setDateField] = useState<DateField>("created");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ email: "", note: "", expiresAt: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ email: "", note: "", expiresAt: "", status: "active" });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cdks, setCdks] = useState<Cdk[]>([]);
  const [cdksLoading, setCdksLoading] = useState(false);
  const [editingCdkId, setEditingCdkId] = useState<number | null>(null);
  const [editCdkName, setEditCdkName] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    const response = await fetch("/api/admin/account");
    if (!response.ok) throw new Error("车辆数据加载失败");
    setAccounts((await response.json()).data);
  }, []);

  const fetchStats = useCallback(async () => {
    const [statsResponse, expiryResponse] = await Promise.all([fetch("/api/admin/stats?type=dashboard"), fetch("/api/admin/stats?type=expiring&days=30")]);
    if (!statsResponse.ok || !expiryResponse.ok) throw new Error("统计数据加载失败");
    const [statsBody, expiryBody] = await Promise.all([statsResponse.json(), expiryResponse.json()]);
    setStats(statsBody.data);
    setExpiring(expiryBody.data);
  }, []);

  const refreshAll = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try { await Promise.all([fetchAccounts(), fetchStats()]); }
    catch (error) { setNotice(error instanceof Error ? error.message : "数据加载失败"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [fetchAccounts, fetchStats]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = accounts.filter((account) => {
      if (query && !`${account.email} ${account.note} ${account.cdk_codes}`.toLowerCase().includes(query)) return false;
      if (vehicleStatus !== "all" && account.status !== vehicleStatus) return false;
      if (onlyDisabledSeats && account.disabled_cdks === 0) return false;
      const filterDate = dateField === "created" ? account.created_at.slice(0, 10) : account.expires_at?.slice(0, 10);
      if (dateFrom && (!filterDate || filterDate < dateFrom)) return false;
      if (dateTo && (!filterDate || filterDate > dateTo)) return false;
      const days = daysUntil(account.expires_at);
      if (riskFilter === "7days" && (days === null || days < 0 || days > 7)) return false;
      if (riskFilter === "30days" && (days === null || days < 0 || days > 30)) return false;
      if (riskFilter === "expired" && (days === null || days >= 0)) return false;
      if (riskFilter === "unset" && days !== null) return false;
      return true;
    });
    return result.sort((a, b) => {
      if (sortBy === "fetches") return b.total_fetches - a.total_fetches;
      if (sortBy === "created") return parseUtc(b.created_at)!.getTime() - parseUtc(a.created_at)!.getTime();
      if (sortBy === "recent") return (parseUtc(b.last_used_at)?.getTime() || 0) - (parseUtc(a.last_used_at)?.getTime() || 0);
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return a.expires_at.localeCompare(b.expires_at);
    });
  }, [accounts, search, vehicleStatus, riskFilter, onlyDisabledSeats, sortBy, dateField, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const pagedAccounts = filteredAccounts.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault(); setLoginError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) {
      setLoggedIn(true);
      await refreshAll();
    } else setLoginError((await response.json()).error || "登录失败");
  }

  async function mutateAccount(method: "POST" | "PATCH" | "DELETE", payload: object) {
    const response = await fetch("/api/admin/account", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error || "操作失败");
    await refreshAll(true);
  }

  async function addAccount() {
    if (!newForm.email.trim()) return;
    try {
      await mutateAccount("POST", { email: newForm.email.trim(), note: newForm.note.trim(), expiresAt: newForm.expiresAt || null });
      setNewForm({ email: "", note: "", expiresAt: "" }); setShowAdd(false); setNotice("车辆已添加");
    } catch (error) { setNotice(error instanceof Error ? error.message : "添加失败"); }
  }

  function openAddForm() {
    setNewForm((current) => ({ ...current, expiresAt: current.expiresAt || renewalDateAfterMonths(1) }));
    setShowAdd(true);
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setEditForm({ email: account.email, note: account.note, expiresAt: account.expires_at?.slice(0, 10) || "", status: account.status });
  }

  async function saveEdit(account: Account) {
    try {
      await mutateAccount("PATCH", { id: account.id, email: editForm.email.trim(), password: account.password, note: editForm.note.trim(), status: editForm.status, expiresAt: editForm.expiresAt || null });
      setEditingId(null); setNotice("车辆信息已更新");
    } catch (error) { setNotice(error instanceof Error ? error.message : "保存失败"); }
  }

  async function toggleAccount(account: Account) {
    await mutateAccount("PATCH", { id: account.id, email: account.email, password: account.password, note: account.note, status: account.status === "active" ? "disabled" : "active", expiresAt: account.expires_at });
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`确定删除 ${account.email}？关联车位和查询记录也会删除。`)) return;
    await mutateAccount("DELETE", { id: account.id });
    if (expandedId === account.id) setExpandedId(null);
  }

  async function fetchCdks(accountId: number) {
    setCdksLoading(true);
    try {
      const response = await fetch(`/api/admin/cdk?accountId=${accountId}`);
      if (!response.ok) throw new Error("车位加载失败");
      setCdks((await response.json()).data);
    } catch (error) { setNotice(error instanceof Error ? error.message : "车位加载失败"); }
    finally { setCdksLoading(false); }
  }

  async function expandAccount(accountId: number) {
    if (expandedId === accountId) { setExpandedId(null); setCdks([]); return; }
    setExpandedId(accountId); setEditingCdkId(null); await fetchCdks(accountId);
  }

  async function mutateCdk(method: "POST" | "PATCH" | "DELETE", payload: object, accountId: number) {
    const response = await fetch("/api/admin/cdk", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error || "车位操作失败");
    await Promise.all([fetchCdks(accountId), refreshAll(true)]);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code); setCopiedCode(code); window.setTimeout(() => setCopiedCode(null), 1800);
  }

  if (!loggedIn) {
    return <main className="admin-login"><ParticleField /><form onSubmit={handleLogin} className="login-panel"><div className="login-mark"><KeyRound aria-hidden="true" /></div><p className="eyebrow">MAIL CAR · OPERATIONS</p><h1>车队控制台</h1><p className="login-copy">车辆、车位与续费周期统一管理</p><label htmlFor="admin-password">管理员密码</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />{loginError && <p className="form-error" role="alert">{loginError}</p>}<button className="primary-button login-button" type="submit">进入控制台 <ChevronRight /></button></form></main>;
  }

  return (
    <main className="fleet-console"><ParticleField /><div className="console-shell">
      <header className="console-header"><div className="brand-block"><div className="brand-mark"><Car aria-hidden="true" /></div><div><p className="eyebrow">MAIL CAR · OPERATIONS</p><h1>车队控制台</h1></div></div><div className="header-actions"><button className="icon-button" onClick={() => refreshAll(true)} aria-label="刷新数据" title="刷新数据"><RefreshCw className={refreshing ? "spin" : ""} /></button><button className="primary-button" onClick={openAddForm}><Plus />新增车辆</button><button className="icon-button" onClick={() => setLoggedIn(false)} aria-label="退出登录" title="退出登录"><LogOut /></button></div></header>

      <section className="overview-grid" aria-label="车队概览">
        <button className="metric-card" onClick={() => { setVehicleStatus("all"); setRiskFilter("all"); }}><span className="metric-icon metric-icon--cyan"><Car /></span><span className="metric-label">全部车辆</span><strong>{stats?.totalAccounts ?? "-"}</strong><small>{stats?.activeAccounts ?? 0} 启用 · {stats?.disabledAccounts ?? 0} 停用</small></button>
        <button className="metric-card" onClick={() => setOnlyDisabledSeats(!onlyDisabledSeats)}><span className="metric-icon metric-icon--blue"><CircleParking /></span><span className="metric-label">车位状态</span><strong>{stats?.totalCdks ?? "-"}</strong><small>{stats?.activeCdks ?? 0} 启用 · <b>{stats?.disabledCdks ?? 0} 禁用</b></small></button>
        <button className="metric-card metric-card--attention" onClick={() => setRiskFilter("7days")}><span className="metric-icon metric-icon--amber"><CalendarClock /></span><span className="metric-label">7 天内到期</span><strong>{stats?.expiring7Days ?? "-"}</strong><small>30 天内 {stats?.expiring30Days ?? 0} · 已过期 {stats?.expiredAccounts ?? 0}</small></button>
        <div className="metric-card"><span className="metric-icon metric-icon--green"><Activity /></span><span className="metric-label">查询活跃度</span><strong>{stats?.todayFetches ?? "-"}</strong><small>本周 {stats?.weekFetches ?? 0} · 本月 {stats?.monthFetches ?? 0}</small></div>
        <div className="metric-card"><span className="metric-icon metric-icon--slate"><ShieldAlert /></span><span className="metric-label">从未使用车位</span><strong>{stats?.unusedCdks ?? "-"}</strong><small>建议定期检查闲置资源</small></div>
      </section>

      {expiring.length > 0 && <section className="expiry-strip"><div className="expiry-strip__title"><AlertTriangle /><span>续费提醒</span><b>{expiring.length}</b></div><div className="expiry-strip__items">{expiring.slice(0, 4).map((item) => <button key={item.id} onClick={() => { setSearch(item.email); setRiskFilter("all"); }}><span>{item.email}</span><b>{item.days_remaining < 0 ? `已过期 ${Math.abs(item.days_remaining)} 天` : `${item.days_remaining} 天后`}</b></button>)}</div>{expiring.length > 4 && <button className="text-button" onClick={() => setRiskFilter("30days")}>查看全部</button>}</section>}

      {showAdd && <section className="form-panel"><div className="section-heading"><div><p className="eyebrow">NEW VEHICLE</p><h2>新增车辆</h2></div><button className="icon-button" onClick={() => setShowAdd(false)} aria-label="关闭"><X /></button></div><div className="form-grid"><label><span>邮箱账号 *</span><input type="email" value={newForm.email} onChange={(event) => setNewForm({ ...newForm, email: event.target.value })} placeholder="name@example.com" /></label><label><span>车辆备注</span><input value={newForm.note} onChange={(event) => setNewForm({ ...newForm, note: event.target.value })} placeholder="套餐、归属或用途" /></label><RenewalDatePicker value={newForm.expiresAt} onChange={(expiresAt) => setNewForm({ ...newForm, expiresAt })} /><button className="primary-button form-submit" onClick={addAccount} disabled={!newForm.email.trim()}><Check />确认添加</button></div></section>}

      <section className="fleet-section"><div className="section-heading list-heading"><div><p className="eyebrow">FLEET DIRECTORY</p><h2>车辆清单 <span>{filteredAccounts.length}</span></h2></div></div>
        <div className="filter-bar"><div className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索邮箱、备注或车位码" />{search && <button onClick={() => setSearch("")} aria-label="清空搜索"><X /></button>}</div><div className="segmented" aria-label="车辆状态">{(["all", "active", "disabled"] as VehicleStatus[]).map((value) => <button key={value} className={vehicleStatus === value ? "is-active" : ""} onClick={() => setVehicleStatus(value)}>{value === "all" ? "全部车辆" : value === "active" ? "车辆启用" : "车辆停用"}</button>)}</div><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)} aria-label="到期筛选"><option value="all">全部到期状态</option><option value="7days">7 天内到期</option><option value="30days">30 天内到期</option><option value="expired">已过期</option><option value="unset">未设置日期</option></select><label className="check-filter"><input type="checkbox" checked={onlyDisabledSeats} onChange={(event) => setOnlyDisabledSeats(event.target.checked)} /><span><Ban />含禁用车位 {stats?.disabledCdks ? `(${stats.disabledCdks})` : ""}</span></label><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)} aria-label="排序方式"><option value="expiry">按续费日期排序</option><option value="created">按创建时间排序</option><option value="recent">按最近使用排序</option><option value="fetches">按查询量排序</option></select></div>
        <div className="date-filter"><span className="date-filter__label"><CalendarClock />时间筛选</span><select value={dateField} onChange={(event) => setDateField(event.target.value as DateField)} aria-label="时间字段"><option value="created">创建时间</option><option value="expiry">续费日期（原备注时间）</option></select><label><span>从</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span>至</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>{(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }}>清除日期</button>}</div>
        <div className="filter-summary"><span>显示 {filteredAccounts.length} / {accounts.length} 辆</span>{(vehicleStatus !== "all" || riskFilter !== "all" || onlyDisabledSeats || search || dateFrom || dateTo) && <button onClick={() => { setSearch(""); setVehicleStatus("all"); setRiskFilter("all"); setOnlyDisabledSeats(false); setDateFrom(""); setDateTo(""); }}>清除全部筛选</button>}</div>

        <div className="fleet-table"><div className="fleet-table__head"><span>车辆账号</span><span>车辆状态</span><span>车位</span><span>续费状态</span><span>使用情况</span><span>操作</span></div>
          {loading ? <div className="empty-state"><Loader2 className="spin" /><p>正在加载车队数据</p></div> : pagedAccounts.length === 0 ? <div className="empty-state"><Search /><p>没有符合条件的车辆</p><button onClick={() => { setSearch(""); setVehicleStatus("all"); setRiskFilter("all"); setOnlyDisabledSeats(false); }}>清除筛选条件</button></div> : pagedAccounts.map((account) => {
            const expanded = expandedId === account.id;
            return <article key={account.id} className={`vehicle-record ${account.status === "disabled" ? "vehicle-record--disabled" : ""}`}>
              <div className="vehicle-row"><button className="expand-button" onClick={() => expandAccount(account.id)} aria-label={expanded ? "收起车位" : "展开车位"}><ChevronDown className={expanded ? "is-open" : ""} /></button><div className="vehicle-identity" onClick={() => expandAccount(account.id)}><div className="vehicle-avatar"><Car /></div><div><strong>{account.email}</strong><span>{account.note || "暂无备注"}</span></div></div><div data-label="车辆状态"><StatusPill active={account.status === "active"} /></div><div className="seat-counts" data-label="车位"><strong>{account.total_cdks}</strong><span>{account.active_cdks} 启用</span>{account.disabled_cdks > 0 && <b>{account.disabled_cdks} 禁用</b>}</div><div data-label="续费状态"><ExpiryCell value={account.expires_at} /></div><div className="usage-cell" data-label="使用情况"><strong><Zap />{account.total_fetches} 次</strong><span>最近 {formatTime(account.last_used_at)}</span></div><div className="row-actions"><button onClick={() => startEdit(account)} aria-label="编辑车辆" title="编辑车辆"><Edit3 /></button><button onClick={() => toggleAccount(account)} aria-label={account.status === "active" ? "停用车辆" : "启用车辆"} title={account.status === "active" ? "停用车辆" : "启用车辆"}>{account.status === "active" ? <Ban /> : <CheckCircle2 />}</button><button className="danger-action" onClick={() => deleteAccount(account)} aria-label="删除车辆" title="删除车辆"><Trash2 /></button></div></div>
              {editingId === account.id && <div className="inline-editor"><label><span>邮箱账号</span><input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label><label><span>备注</span><input value={editForm.note} onChange={(event) => setEditForm({ ...editForm, note: event.target.value })} /></label><RenewalDatePicker value={editForm.expiresAt} onChange={(expiresAt) => setEditForm({ ...editForm, expiresAt })} /><label><span>车辆状态</span><select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="active">启用</option><option value="disabled">停用</option></select></label><div className="editor-actions"><button className="primary-button" onClick={() => saveEdit(account)}><Check />保存</button><button className="secondary-button" onClick={() => setEditingId(null)}>取消</button></div></div>}
              {expanded && <div className="seat-drawer"><div className="seat-drawer__head"><div><CircleParking /><strong>车位明细</strong><span>{account.total_cdks} 个</span></div><button className="secondary-button" onClick={() => mutateCdk("POST", { accountId: account.id }, account.id)}><Plus />新增车位</button></div>{cdksLoading ? <div className="seat-loading"><Loader2 className="spin" />加载车位中</div> : cdks.length === 0 ? <div className="seat-empty">暂时没有车位</div> : <div className="seat-grid">{cdks.map((cdk) => <div className={`seat-card ${cdk.status === "disabled" ? "seat-card--disabled" : ""}`} key={cdk.id}><div className="seat-card__top"><button className="code-button" onClick={() => copyCode(cdk.code)}><Clipboard />{cdk.code}{copiedCode === cdk.code ? <Check /> : <Copy />}</button><StatusPill active={cdk.status === "active"} /></div>{editingCdkId === cdk.id ? <div className="seat-name-edit"><input autoFocus value={editCdkName} onChange={(event) => setEditCdkName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && mutateCdk("PATCH", { id: cdk.id, userName: editCdkName }, account.id).then(() => setEditingCdkId(null))} /><button onClick={() => mutateCdk("PATCH", { id: cdk.id, userName: editCdkName }, account.id).then(() => setEditingCdkId(null))}><Check /></button></div> : <button className="seat-user" onClick={() => { setEditingCdkId(cdk.id); setEditCdkName(cdk.user_name); }}><UserRound />{cdk.user_name || "未绑定用户"}<Edit3 /></button>}<div className="seat-meta"><span><Zap />{cdk.fetch_count} 次查询</span><span><Clock3 />{cdk.last_used_at ? formatTime(cdk.last_used_at) : "从未使用"}</span></div><div className="seat-actions"><button onClick={() => mutateCdk("PATCH", { id: cdk.id, status: cdk.status === "active" ? "disabled" : "active" }, account.id)}>{cdk.status === "active" ? <><Ban />禁用</> : <><CheckCircle2 />启用</>}</button><button className="danger-action" onClick={() => window.confirm(`确定删除车位 ${cdk.code}？`) && mutateCdk("DELETE", { id: cdk.id }, account.id)}><Trash2 />删除</button></div></div>)}</div>}</div>}
            </article>;
          })}
        </div>
        {totalPages > 1 && <nav className="pagination" aria-label="分页"><button disabled={visiblePage === 1} onClick={() => setPage(visiblePage - 1)}><ChevronLeft /></button><span>第 {visiblePage} / {totalPages} 页</span><button disabled={visiblePage === totalPages} onClick={() => setPage(visiblePage + 1)}><ChevronRight /></button></nav>}
      </section>
    </div>{notice && <div className="toast" role="status">{notice}</div>}</main>
  );
}

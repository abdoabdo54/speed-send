'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import axios from 'axios';

/**
 * Advanced Send Page for bulk-email SaaS
 * Features: 3-column layout, advanced sender management, recipient sources, 
 * email composer, templates, personalization, and real-time campaign launching
 */

// ---------------------------
// Types
// ---------------------------

type AccountStatus = "active" | "paused" | "error" | "disabled";

interface Account {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: AccountStatus;
  quota: { used: number; total: number };
  region?: string;
}

interface Recipient {
  id: string;
  email: string;
  vars?: Record<string, string>;
}

interface RecipientSource {
  id: string;
  name: string;
  type: "csv" | "crm" | "api" | "manual";
  count?: number;
  samples?: Recipient[];
}

type SendMode = "aggressive" | "one_by_one" | "scheduled";

interface CampaignConfig {
  name: string;
  recipientSourceId?: string;
  sendMode: SendMode;
  scheduledAt?: string | null;
  workers: number;
  delayMs: number;
  dailyLimit: number;
  perAccountLimit?: number;
  subject: string;
  headerHtml: string;
  bodyHtml: string;
  templateslot?: string;
  variables: Record<string, string>;
  trackOpens: boolean;
  trackClicks: boolean;
  addUnsubscribe: boolean;
  warmup: boolean;
}

// ---------------------------
// API Integration (replacing mockApi)
// ---------------------------

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const api = {
  async listAccounts(): Promise<Account[]> {
    const response = await axios.get(`${API_URL}/api/v1/accounts/`);
    return response.data.map((acc: any) => ({
      id: acc.id.toString(),
      name: acc.name,
      email: acc.client_email,
      status: acc.status === 'active' ? 'active' : 'paused',
      quota: { used: acc.quota_used_today || 0, total: acc.quota_limit || 0 },
      region: 'US'
    }));
  },
  
  async listUsers(): Promise<Account[]> {
    const response = await axios.get(`${API_URL}/api/v1/users/`);
    return response.data.map((user: any) => ({
      id: user.id.toString(),
      name: user.full_name || user.email,
      email: user.email,
      status: user.is_active ? 'active' : 'paused',
      quota: { used: user.emails_sent_today || 0, total: user.quota_limit || 0 },
      region: 'US'
    }));
  },

  async listRecipientSources(): Promise<RecipientSource[]> {
    // For now, return empty array - can be extended with real recipient sources
    return [];
  },

  async uploadCsv(file: File): Promise<RecipientSource> {
    // Mock CSV upload - replace with real implementation
    return { 
      id: "rs_csv_uploaded", 
      name: `Uploaded: ${file.name}`, 
      type: "csv", 
      count: 123, 
      samples: [{ id: "s1", email: "demo1@example.com" }] 
    };
  },

  async sendTest(payload: { to: string; subject: string; body: string }) {
    const response = await axios.post(`${API_URL}/api/v1/test-email`, {
      recipient_email: payload.to,
      subject: payload.subject,
      body_html: payload.body,
      body_plain: payload.body.replace(/<[^>]*>/g, ''),
      from_name: 'Test',
      sender_account_id: 1
    });
    return { ok: true, id: response.data.message_id };
  },

  async launchCampaign(payload: any) {
    const response = await axios.post(`${API_URL}/api/v1/campaigns/`, payload);
    return { ok: true, campaignId: response.data.id };
  },
};

function sleep(ms = 300) {
  return new Promise((res) => setTimeout(res, ms));
}

// ---------------------------
// Utilities & small components
// ---------------------------

const IconSearch = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconUpload = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3v12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 21H3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconClock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.6} />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Toast({ message, type = "info" }: { message: string; type?: "info" | "success" | "error" }) {
  const bg = type === "error" ? "bg-red-50 text-red-700" : type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
  return (
    <div role="status" className={`px-4 py-2 rounded-md shadow ${bg}`}>
      {message}
    </div>
  );
}

// ---------------------------
// Main Component
// ---------------------------

export default function NewCampaignPage() {
  const router = useRouter();
  
  // data
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [recipientSources, setRecipientSources] = useState<RecipientSource[] | null>(null);

  // UI state
  const [searchAccounts, setSearchAccounts] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "active" | "problem">("all");
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({});
  const [selectAllVisible, setSelectAllVisible] = useState(false);

  const [config, setConfig] = useState<CampaignConfig>({
    name: "",
    sendMode: "one_by_one",
    scheduledAt: null,
    workers: 6,
    delayMs: 200,
    dailyLimit: 2000,
    perAccountLimit: 0,
    recipientSourceId: undefined,
    subject: "",
    headerHtml: "",
    bodyHtml: "",
    templateslot: undefined,
    variables: {},
    trackOpens: true,
    trackClicks: true,
    addUnsubscribe: true,
    warmup: false,
  });

  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [toast, setToast] = useState<{ id: number; msg: string; type?: "info" | "success" | "error" } | null>(null);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [varsModalOpen, setVarsModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, CampaignConfig>>(loadTemplates());

  // Recipient Upload
  const [uploadingCsv, setUploadingCsv] = useState(false);

  useEffect(() => {
    // load accounts & recipient sources
    (async () => {
      try {
        const [a, r] = await Promise.all([api.listAccounts(), api.listRecipientSources()]);
        setAccounts(a);
        setRecipientSources(r);
        // pre-select first two active accounts
        const sel: Record<string, boolean> = {};
        a.filter((x) => x.status === "active").slice(0, 2).forEach((acc) => (sel[acc.id] = true));
        setSelectedAccounts(sel);
      } catch (error) {
        console.error('Failed to load data:', error);
        setToast({ id: Date.now(), msg: 'Failed to load accounts', type: 'error' });
      }
    })();
  }, []);

  // Derived
  const activeCount = accounts ? accounts.filter((a) => a.status === "active").length : 0;
  const queuedCount = recipientSources?.find((s) => s.id === config.recipientSourceId)?.count ?? 0;
  const estDuration = estimateDuration({ queued: queuedCount, workers: config.workers, delayMs: config.delayMs });

  // Account list filtering
  const visibleAccounts = useMemo(() => {
    if (!accounts) return [] as Account[];
    return accounts.filter((acc) => {
      if (accountFilter === "active" && acc.status !== "active") return false;
      if (accountFilter === "problem" && acc.status === "active") return false;
      if (searchAccounts && !`${acc.name} ${acc.email}`.toLowerCase().includes(searchAccounts.toLowerCase())) return false;
      return true;
    });
  }, [accounts, searchAccounts, accountFilter]);

  useEffect(() => {
    setSelectAllVisible(visibleAccounts.length > 0 && visibleAccounts.some((a) => !selectedAccounts[a.id]));
  }, [visibleAccounts, selectedAccounts]);

  // Templates save/load
  useEffect(() => saveTemplates(templates), [templates]);

  // ----- handlers -----
  async function handleUploadCsv(file?: File) {
    if (!file) return;
    setUploadingCsv(true);
    try {
      const src = await api.uploadCsv(file);
      setRecipientSources((prev) => (prev ? [src, ...prev] : [src]));
      setToast({ id: Date.now(), msg: `CSV uploaded: ${file.name}`, type: "success" });
    } catch (e) {
      setToast({ id: Date.now(), msg: "CSV upload failed", type: "error" });
    } finally {
      setUploadingCsv(false);
    }
  }

  function toggleAccount(id: string) {
    setSelectedAccounts((s) => ({ ...s, [id]: !s[id] }));
  }

  function bulkSelectVisible() {
    const copy = { ...selectedAccounts };
    visibleAccounts.forEach((a) => (copy[a.id] = true));
    setSelectedAccounts(copy);
  }

  function clearSelection() {
    setSelectedAccounts({});
  }

  function setCampaignConfig(part: Partial<CampaignConfig>) {
    setConfig((c) => ({ ...c, ...part }));
  }

  async function handleLaunch() {
    // frontend validation
    const enabled = Object.keys(selectedAccounts).filter((k) => selectedAccounts[k]);
    if (enabled.length === 0) return notice("Pick at least one sender account.", "error");
    if (!config.recipientSourceId) return notice("Choose a recipient source.", "error");
    if (!config.subject) return notice("Enter an email subject.", "error");

    setLoadingLaunch(true);
    notice("Launching campaign...", "info");
    try {
      const payload = {
        name: config.name,
        subject: config.subject,
        body_html: config.bodyHtml,
        body_plain: config.bodyHtml.replace(/<[^>]*>/g, ''),
        from_name: 'Campaign',
        recipients: [{ email: 'test@example.com', variables: {} }], // Mock recipients for now
        sender_account_ids: enabled.map(id => parseInt(id)),
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: config.dailyLimit,
        concurrency: config.workers
      };
      
      const res = await api.launchCampaign(payload);
      notice("Campaign launched: " + res.campaignId, "success");
      router.push('/campaigns');
    } catch (e) {
      notice("Failed to launch campaign", "error");
    } finally {
      setLoadingLaunch(false);
    }
  }

  async function handleSaveTemplate(name: string) {
    const id = `tpl_${Date.now()}`;
    setTemplates((t) => ({ ...t, [id]: { ...(config as any), name } }));
    notice(`Template saved: ${name}`, "success");
  }

  function handleLoadTemplate(id: string) {
    const tpl = templates[id];
    if (!tpl) return;
    setConfig(tpl);
    notice(`Template loaded: ${tpl.name}`, "success");
  }

  async function handleSendTest(to: string, subject: string, body: string) {
    try {
      await api.sendTest({ to, subject, body });
      notice(`Test sent to ${to}`, "success");
    } catch (e) {
      notice("Test send failed", "error");
    }
  }

  function notice(msg: string, type: "info" | "success" | "error" = "info") {
    setToast({ id: Date.now(), msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // render
  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6 sm:p-10">
      <div className="max-w-[1200px] mx-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#101828]">Send Campaign</h1>
            <p className="text-sm text-gray-500 mt-1">Advanced campaign builder — multi-account, high-speed sending.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-2 items-center">
              <div className="text-sm text-gray-600">Active accounts</div>
              <div className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold">{activeCount}</div>
            </div>
            <button onClick={() => router.push('/accounts')} className="px-4 py-2 rounded-md bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white hover:opacity-95">Account Settings</button>
          </div>
        </div>

        {/* grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* left */}
          <aside className="lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="flex items-center gap-2 mb-3">
                  <input placeholder="Search accounts" value={searchAccounts} onChange={(e) => setSearchAccounts(e.target.value)} className="flex-1 rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-300" />
                  <button onClick={() => setSearchAccounts("")} className="p-2 rounded-md bg-gray-50" aria-label="clear"><IconSearch /></button>
                </div>
                <div className="flex gap-2 items-center text-xs text-gray-600 mb-3">
                  <button onClick={() => setAccountFilter("all")} className={`px-2 py-1 rounded ${accountFilter === "all" ? "bg-blue-50 text-blue-700" : "bg-gray-50"}`}>All</button>
                  <button onClick={() => setAccountFilter("active")} className={`px-2 py-1 rounded ${accountFilter === "active" ? "bg-blue-50 text-blue-700" : "bg-gray-50"}`}>Active</button>
                  <button onClick={() => setAccountFilter("problem")} className={`px-2 py-1 rounded ${accountFilter === "problem" ? "bg-blue-50 text-blue-700" : "bg-gray-50"}`}>Problems</button>
                </div>

                <div className="max-h-[360px] overflow-auto space-y-2" role="list">
                  {!accounts ? (
                    <div className="space-y-2">
                      <div className="h-12 bg-gray-100 rounded animate-pulse" />
                      <div className="h-12 bg-gray-100 rounded animate-pulse" />
                      <div className="h-12 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600">Accounts</div>
                        <div className="flex items-center gap-2">
                          {selectAllVisible && <button onClick={bulkSelectVisible} className="text-sm text-blue-600">Select visible</button>}
                          <button onClick={clearSelection} className="text-sm text-gray-500">Clear</button>
                        </div>
                      </div>

                      {visibleAccounts.map((acc) => (
                        <div key={acc.id} role="listitem" className={`flex items-center gap-3 p-2 rounded-lg border ${selectedAccounts[acc.id] ? "bg-white border-blue-200" : "bg-[#F4F7FA] border-gray-100"}`}>
                          <input aria-label={`select ${acc.email}`} checked={!!selectedAccounts[acc.id]} onChange={() => toggleAccount(acc.id)} type="checkbox" className="h-4 w-4 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="truncate">
                                <div className="text-sm font-semibold text-[#101828] truncate">{acc.name}</div>
                                <div className="text-xs text-gray-500 truncate">{acc.email}</div>
                              </div>
                              <div className="text-xs text-gray-500 ml-2">{acc.region}</div>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="text-xs text-gray-500">Quota {acc.quota.used}/{acc.quota.total}</div>
                              <div className={`px-2 py-0.5 rounded text-xs font-medium ${acc.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700 bg-gray-50'} border`}>{acc.status}</div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {visibleAccounts.length === 0 && <div className="text-sm text-gray-500">No accounts match.</div>}
                    </>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => router.push('/accounts')} className="flex-1 px-3 py-2 rounded-md border border-blue-600 text-blue-600">+ Connect</button>
                  <button onClick={() => notice("Sync accounts (not implemented)")} className="px-3 py-2 rounded-md bg-gray-50">Sync</button>
                </div>
              </div>

              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-700">Recipient Sources</div>
                  <div className="text-xs text-gray-500">{recipientSources ? recipientSources.length : "..."}</div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs text-gray-500">Upload CSV</label>
                  <CsvUploader onUpload={handleUploadCsv} uploading={uploadingCsv} />

                  <div className="mt-3 max-h-40 overflow-auto">
                    {recipientSources ? (
                      recipientSources.map((rs) => (
                        <button key={rs.id} onClick={() => setCampaignConfig({ recipientSourceId: rs.id })} className={`w-full text-left rounded-md p-2 ${config.recipientSourceId === rs.id ? 'bg-blue-50' : 'bg-gray-50'} border`}> 
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-[#101828]">{rs.name}</div>
                            <div className="text-xs text-gray-500">{rs.count ?? '-'} </div>
                          </div>
                          <div className="text-xs text-gray-400">{rs.type.toUpperCase()}</div>
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">Loading sources...</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </aside>

          {/* middle */}
          <main className="lg:col-span-6 space-y-4">
            <div className="rounded-xl bg-white border p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#101828]">Campaign Configuration</h2>
                    <div className="text-sm text-gray-500">name</div>
                  </div>
                  <input placeholder="Campaign name" value={config.name} onChange={(e) => setCampaignConfig({ name: e.target.value })} className="mt-3 w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-300" />
                </div>

                <div className="w-56">
                  <div className="text-sm text-gray-500">Template</div>
                  <select value={config.templateslot ?? ""} onChange={(e) => setCampaignConfig({ templateslot: e.target.value || undefined })} className="mt-2 w-full rounded-md border px-2 py-2">
                    <option value="">— select template —</option>
                    {Object.entries(templates).map(([id, tpl]) => (
                      <option key={id} value={id}>{(tpl as any).name || id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Send Mode</label>
                  <div className="mt-2 flex gap-2">
                    <ModePill label="Aggressive" active={config.sendMode === 'aggressive'} onClick={() => setCampaignConfig({ sendMode: 'aggressive' })} color="blue" desc="Max throughput" />
                    <ModePill label="One-by-One" active={config.sendMode === 'one_by_one'} onClick={() => setCampaignConfig({ sendMode: 'one_by_one' })} color="green" desc="Safer deliverability" />
                    <ModePill label="Scheduled" active={config.sendMode === 'scheduled'} onClick={() => setCampaignConfig({ sendMode: 'scheduled' })} color="amber" desc="Pick date/time" />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Workers</label>
                  <input type="number" value={config.workers} onChange={(e) => setCampaignConfig({ workers: Number(e.target.value || 0) })} className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Delay (ms)</label>
                  <input type="number" value={config.delayMs} onChange={(e) => setCampaignConfig({ delayMs: Number(e.target.value || 0) })} className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>
              </div>

              {config.sendMode === 'scheduled' && (
                <div className="mt-3 flex gap-2 items-center">
                  <IconClock />
                  <input aria-label="scheduled at" type="datetime-local" value={config.scheduledAt ?? ''} onChange={(e) => setCampaignConfig({ scheduledAt: e.target.value })} className="rounded-md border px-3 py-2" />
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Daily Limit</label>
                  <input value={config.dailyLimit} onChange={(e) => setCampaignConfig({ dailyLimit: Number(e.target.value || 0) })} type="number" className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Per-account limit</label>
                  <input value={config.perAccountLimit} onChange={(e) => setCampaignConfig({ perAccountLimit: Number(e.target.value || 0) })} type="number" className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Warmup</label>
                  <div className="mt-2">
                    <label className="inline-flex items-center">
                      <input type="checkbox" checked={config.warmup} onChange={(e) => setCampaignConfig({ warmup: e.target.checked })} className="mr-2" />
                      <span className="text-sm text-gray-600">Enable warmup schedule</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">Recipient Source: <span className="font-medium text-gray-800">{recipientSources?.find(s=>s.id===config.recipientSourceId)?.name ?? '—'}</span></div>
                <div className="text-sm text-gray-600">Recipients: <span className="font-semibold">{queuedCount}</span></div>
              </div>

            </div>

            {/* Email composer */}
            <div className="rounded-xl bg-white border p-6 shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Email Composer</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setVarsModalOpen(true)} className="text-sm text-blue-600">Manage Variables</button>
                  <button onClick={() => handleSaveTemplate(prompt('Template name') || 'untitled')} className="text-sm text-gray-500">Save template</button>
                </div>
              </div>

              <input placeholder="Subject" value={config.subject} onChange={(e) => setCampaignConfig({ subject: e.target.value })} className="w-full rounded-md border px-3 py-2 mb-3" />

              <div className="mb-3">
                <label className="text-sm text-gray-600">Header (HTML)</label>
                <textarea value={config.headerHtml} onChange={(e) => setCampaignConfig({ headerHtml: e.target.value })} placeholder="Optional HTML header" className="w-full min-h-[80px] rounded-md border p-3 mt-2" />
              </div>

              <div>
                <label className="text-sm text-gray-600">Body (HTML) — paste HTML or plain text</label>
                <div className="mt-2 border rounded-md min-h-[220px] p-3">
                  <textarea value={config.bodyHtml} onChange={(e) => setCampaignConfig({ bodyHtml: e.target.value })} placeholder="Write or paste HTML here. Use variables like {firstName}." className="w-full min-h-[180px] bg-transparent focus:outline-none" />
                </div>
                <div className="text-xs text-gray-500 mt-2">Tip: preview with Preview pane. Sanitize HTML on server before sending.</div>
              </div>
            </div>

          </main>

          {/* right */}
          <aside className="lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Stats</div>
                    <div className="text-lg font-bold text-[#101828]">{queuedCount} queued</div>
                  </div>
                  <div className="text-sm text-gray-500">Est: <span className="font-semibold text-purple-600">{estDuration}</span></div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-blue-50 text-blue-700 text-center text-sm">{activeCount}<div className="text-xs text-gray-500">active</div></div>
                  <div className="p-2 rounded bg-emerald-50 text-emerald-700 text-center text-sm">{queuedCount}<div className="text-xs text-gray-500">queued</div></div>
                  <div className="p-2 rounded bg-purple-50 text-purple-700 text-center text-sm">{estDuration.split(' ')[0]}<div className="text-xs text-gray-500">time</div></div>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-gray-600">Preview</div>
                  <div className="mt-2 border rounded p-3 bg-[#F4F7FA] min-h-[120px]">
                    <div className="text-sm font-semibold">{config.subject || 'Subject preview'}</div>
                    <div className="text-xs text-gray-600 mt-2 line-clamp-4">{stripHtml(config.bodyHtml) || 'Body preview — paste HTML to preview here.'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="text-sm text-gray-600 mb-3">Actions</div>
                <div className="space-y-3">
                  <button onClick={() => setTestModalOpen(true)} className="w-full rounded-md border border-blue-600 text-blue-600 py-2">Send Test Email</button>
                  <button onClick={() => handleLaunch()} disabled={loadingLaunch} className={`w-full rounded-full py-3 font-bold text-white ${loadingLaunch ? 'bg-gradient-to-r from-blue-400 to-indigo-400 opacity-80' : 'bg-gradient-to-r from-[#2563EB] to-[#1E3A8A]'}`}>
                    {loadingLaunch ? 'Launching...' : 'Launch Campaign'}
                  </button>
                  <button onClick={() => notice('Open send preview (not implemented)')} className="w-full rounded-md bg-gray-50 py-2">Preview full</button>
                </div>
              </div>

              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="text-sm text-gray-600 mb-2">Advanced</div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center"><input type="checkbox" checked={config.trackOpens} onChange={(e) => setCampaignConfig({ trackOpens: e.target.checked })} className="mr-2"/>Track Opens</label>
                  <label className="inline-flex items-center"><input type="checkbox" checked={config.trackClicks} onChange={(e) => setCampaignConfig({ trackClicks: e.target.checked })} className="mr-2"/>Track Clicks</label>
                  <label className="inline-flex items-center"><input type="checkbox" checked={config.addUnsubscribe} onChange={(e) => setCampaignConfig({ addUnsubscribe: e.target.checked })} className="mr-2"/>Add Unsubscribe</label>
                </div>
              </div>

            </div>
          </aside>

        </div>

        {/* variables modal */}
        {varsModalOpen && <VariablesModal variables={config.variables} onClose={() => setVarsModalOpen(false)} onSave={(v) => setCampaignConfig({ variables: v })} />}

        {/* test modal */}
        {testModalOpen && <TestModal onClose={() => setTestModalOpen(false)} onSend={(t, s, b) => handleSendTest(t, s, b)} />}

        {/* toast */}
        <div className="fixed top-6 right-6 z-50">
          {toast && <Toast message={toast.msg} type={toast.type} />}
        </div>

      </div>
    </div>
  );
}

// ---------------------------
// Sub components used above
// ---------------------------

function CsvUploader({ onUpload, uploading }: { onUpload: (f: File) => void; uploading: boolean }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <input ref={fileRef} type="file" accept="text/csv" className="hidden" onChange={(e) => e.target.files && onUpload(e.target.files[0])} />
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white">
          <IconUpload />
          <span className="text-sm">Upload CSV</span>
        </button>
        {uploading && <div className="text-sm text-gray-500">Processing...</div>}
      </div>
    </div>
  );
}

function ModePill({ label, active, onClick, color, desc }: { label: string; active: boolean; onClick: () => void; color: 'blue' | 'green' | 'amber'; desc?: string }) {
  const colorClass = color === 'blue' ? 'border-blue-400 text-blue-700' : color === 'green' ? 'border-emerald-400 text-emerald-700' : 'border-amber-300 text-amber-600';
  return (
    <button onClick={onClick} className={`rounded-full border px-4 py-2 ${active ? 'shadow-inner' : 'hover:bg-gray-50'} ${colorClass}`} aria-pressed={active}>
      <div className="text-sm font-semibold">{label}</div>
      {desc && <div className="text-xs text-gray-500">{desc}</div>}
    </button>
  );
}

function VariablesModal({ variables, onClose, onSave }: { variables: Record<string, string>; onClose: () => void; onSave: (v: Record<string, string>) => void }) {
  const [local, setLocal] = useState<[string, string][]>(() => Object.entries(variables));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Personalization Variables</h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">Close</button>
            <button onClick={() => { onSave(Object.fromEntries(local)); onClose(); }} className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">Use variables like <code className="bg-gray-100 px-1 rounded">{`{firstName}`}</code> in subject/body.</div>
          <div className="space-y-2">
            {local.map(([k, v], idx) => (
              <div key={idx} className="flex gap-2">
                <input value={k} onChange={(e) => setLocal((s) => s.map((x, i) => i === idx ? [e.target.value, x[1]] : x))} className="w-1/3 rounded border px-2 py-1" />
                <input value={v} onChange={(e) => setLocal((s) => s.map((x, i) => i === idx ? [x[0], e.target.value] : x))} className="flex-1 rounded border px-2 py-1" />
                <button onClick={() => setLocal((s) => s.filter((_, i) => i !== idx))} className="px-3 rounded bg-red-50 text-red-600">Delete</button>
              </div>
            ))}
          </div>
          <div>
            <button onClick={() => setLocal((s) => [...s, ["newVar", "value"]])} className="px-3 py-2 rounded bg-green-50 text-green-700">+ Add</button>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium">Preview</div>
            <div className="mt-2 border rounded p-3 bg-gray-50">
              <div className="text-sm font-semibold">Subject example</div>
              <div className="mt-2 text-sm">Hello {local[0]?.[1] ?? '{firstName}'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestModal({ onClose, onSend }: { onClose: () => void; onSend: (to: string, subject: string, body: string) => Promise<void> }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const refBottom = useRef<HTMLDivElement | null>(null);

  useEffect(() => { refBottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  async function handle() {
    setLog([]);
    setSending(true);
    setLog((s) => [...s, `[INFO] Sending test to ${to}`]);
    // fake SSE stream
    const cancel = fakeSSE((line) => setLog((s) => [...s, line]), () => setSending(false));
    try {
      await onSend(to, subject, body);
    } finally {
      // allow SSE to finish
      setTimeout(() => cancel(), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Send Test Email</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">Close</button>
        </div>
        <div className="space-y-3">
          <input placeholder="recipient@example.com" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded border px-3 py-2" />
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border px-3 py-2" />
          <textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} className="w-full min-h-[120px] rounded border px-3 py-2" />

          <button onClick={handle} disabled={sending} className={`w-full py-2 rounded font-semibold text-white ${sending ? 'bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'}`}>{sending ? 'Sending...' : 'Send Test'}</button>

          <div>
            <div className="text-sm text-gray-600 mb-2">Logs</div>
            <div className="bg-[#F4F7FA] p-3 rounded h-40 overflow-auto font-mono text-sm border">
              {log.map((l, i) => (<div key={i} className={l.startsWith('[ERROR]') ? 'text-red-600' : l.startsWith('[SUCCESS]') ? 'text-emerald-600' : 'text-gray-700'}>{l}</div>))}
              <div ref={refBottom} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// small helpers used by UI
// ---------------------------

function estimateDuration({ queued, workers, delayMs }: { queued: number; workers: number; delayMs: number }) {
  if (!queued || queued <= 0) return '~0m';
  const perWorker = Math.max(1, Math.ceil(queued / workers));
  const approxMs = perWorker * delayMs;
  const minutes = Math.ceil((approxMs / 1000) / 60);
  return `~${minutes}m`;
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').slice(0, 300);
}

function loadTemplates(): Record<string, CampaignConfig> {
  try {
    const raw = localStorage.getItem('send_templates_v1');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTemplates(data: Record<string, CampaignConfig>) {
  try { localStorage.setItem('send_templates_v1', JSON.stringify(data)); } catch {}
}

// tiny fake SSE for demo logs
function fakeSSE(onLine: (line: string) => void, onDone: () => void) {
  const lines = [
    '[INFO] Preparing payload...',
    '[INFO] Connecting to provider...',
    '[INFO] Auth OK',
    '[INFO] Sending message to alice@example.com',
    '[SUCCESS] 250 OK',
    '[INFO] Sending message to bob@example.com',
    '[ERROR] 550 Mailbox not found',
    '[INFO] Completed: 1 sent, 1 failed',
  ];
  let i = 0;
  const t = setInterval(() => {
    if (i >= lines.length) { clearInterval(t); onDone(); return; }
    onLine(lines[i]); i += 1;
  }, 450);
  return () => clearInterval(t);
}
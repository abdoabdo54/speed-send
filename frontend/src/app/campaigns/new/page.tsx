'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getRecipientLists, saveRecipientList, deleteRecipientList, type RecipientList } from '../../../lib/recipients';

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
// API Integration
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
    // Adapt backend data to the frontend's Account type
    return response.data.map((acc: any) => ({
      id: acc.id.toString(),
      name: acc.name,
      email: acc.client_email,
      status: acc.status === 'active' ? 'active' : 'disabled',
      quota: { used: acc.quota_used_today || 0, total: acc.quota_limit || 500 }, // Default quota
      region: 'N/A'
    }));
  },

  async sendTest(payload: { to: string; subject: string; body: string; fromName: string; accountId: string; }) {
    const response = await axios.post(`${API_URL}/api/v1/test-email`, {
      recipient_email: payload.to,
      subject: payload.subject,
      body_html: payload.body,
      body_plain: payload.body.replace(/<[^>]*>/g, ''),
      from_name: payload.fromName,
      sender_account_id: parseInt(payload.accountId)
    });
    return { ok: true, id: response.data.message_id };
  },

  async launchCampaign(payload: any) {
    const response = await axios.post(`${API_URL}/api/v1/campaigns/`, payload);
    return { ok: true, campaignId: response.data.id };
  },
};

// ---------------------------
// Utilities & small components
// ---------------------------

const IconSearch = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth={1.6}><path d="M21 21l-4.35-4.35" /><circle cx="11" cy="11" r="6" /></svg>
);

const IconClock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth={1.6}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

function Toast({ message, type = "info" }: { message: string; type?: "info" | "success" | "error" }) {
  const bg = type === "error" ? "bg-red-50 text-red-700" : type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
  return (
    <div role="status" className={`px-4 py-2 rounded-md shadow-lg animate-fade-in-up ${bg}`}>
      {message}
    </div>
  );
}

// ---------------------------
// Main Component
// ---------------------------

export default function NewCampaignPage() {
  const router = useRouter();
  
  // Data state
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [recipientsText, setRecipientsText] = useState("");

  // UI state
  const [searchAccounts, setSearchAccounts] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "active" | "problem">("all");
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({});
  const [selectAllVisible, setSelectAllVisible] = useState(false);

  const [config, setConfig] = useState<CampaignConfig>({
    name: "New Campaign " + new Date().toLocaleDateString(),
    sendMode: "one_by_one",
    scheduledAt: null,
    workers: 6,
    delayMs: 200,
    dailyLimit: 2000,
    perAccountLimit: 0,
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
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const accs = await api.listAccounts();
        setAccounts(accs);
        const sel: Record<string, boolean> = {};
        accs.filter((x) => x.status === "active").slice(0, 1).forEach((acc) => (sel[acc.id] = true));
        setSelectedAccounts(sel);
      } catch (error) {
        console.error('Failed to load accounts:', error);
        notice('Failed to load accounts. Please check backend connection.', 'error');
      }
      // Load saved recipient lists from localStorage
      setRecipientLists(getRecipientLists());
    })();
  }, []);

  const recipients = useMemo(() => {
    return recipientsText.split('\n').map(e => e.trim()).filter(Boolean);
  }, [recipientsText]);

  const activeAccountsCount = accounts ? accounts.filter((a) => a.status === "active").length : 0;
  const selectedAccountsCount = Object.keys(selectedAccounts).filter(k => selectedAccounts[k]).length;
  const queuedCount = recipients.length;
  const estDuration = estimateDuration({ queued: queuedCount * selectedAccountsCount, workers: config.workers, delayMs: config.delayMs });

  const visibleAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      if (accountFilter === "active" && acc.status !== "active") return false;
      if (accountFilter === "problem" && (acc.status === "active" || acc.status === 'disabled')) return false;
      if (searchAccounts && !`${acc.name} ${acc.email}`.toLowerCase().includes(searchAccounts.toLowerCase())) return false;
      return true;
    });
  }, [accounts, searchAccounts, accountFilter]);

  useEffect(() => {
    setSelectAllVisible(visibleAccounts.length > 0 && visibleAccounts.some((a) => !selectedAccounts[a.id]));
  }, [visibleAccounts, selectedAccounts]);

  useEffect(() => saveTemplates(templates), [templates]);

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
    const enabledAccountIds = Object.keys(selectedAccounts).filter((k) => selectedAccounts[k]);
    if (enabledAccountIds.length === 0) return notice("Please select at least one sender account.", "error");
    if (recipients.length === 0) return notice("Please add at least one recipient.", "error");
    if (!config.subject) return notice("Please enter an email subject.", "error");
    if (!config.name) return notice("Please enter a campaign name.", "error");

    setLoadingLaunch(true);
    notice("Launching campaign...", "info");
    try {
      const payload = {
        name: config.name,
        subject: config.subject,
        body_html: config.bodyHtml,
        body_plain: stripHtml(config.bodyHtml),
        from_name: 'Campaign', // You may want to make this configurable
        recipients: recipients.map(email => ({ email, variables: {} })),
        sender_account_ids: enabledAccountIds.map(id => parseInt(id)),
        // Below are placeholders, your backend might not use them yet
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: config.dailyLimit,
        concurrency: config.workers
      };
      
      const res = await api.launchCampaign(payload);
      notice("Campaign successfully created & launched: " + res.campaignId, "success");
      setTimeout(() => router.push('/campaigns'), 1500);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || "An unknown error occurred.";
      notice(`Failed to launch campaign: ${errorMsg}`, "error");
    } finally {
      setLoadingLaunch(false);
    }
  }

  async function handleSaveTemplate(name: string) {
    if (!name) return;
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

  async function handleSendTest(to: string) {
    const enabledAccountIds = Object.keys(selectedAccounts).filter((k) => selectedAccounts[k]);
    if(enabledAccountIds.length === 0) {
      notice("Please select an account to send the test from.", "error");
      return Promise.reject();
    }
    
    try {
      await api.sendTest({ 
        to, 
        subject: `[TEST] ${config.subject}`, 
        body: config.bodyHtml,
        fromName: "Test Send",
        accountId: enabledAccountIds[0]
      });
      notice(`Test sent to ${to}`, "success");
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || "An unknown error occurred.";
      notice(`Test send failed: ${errorMsg}`, "error");
      throw e;
    }
  }

  function notice(msg: string, type: "info" | "success" | "error" = "info") {
    setToast({ id: Date.now(), msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Recipient list helpers
  function refreshRecipientLists() {
    setRecipientLists(getRecipientLists());
  }

  function handleSelectRecipientList(id: string) {
    setSelectedListId(id);
    const list = recipientLists.find(l => l.id === id);
    if (list) {
      setRecipientsText(list.recipients.join('\n'));
      notice(`Loaded list: ${list.name}`, 'info');
    }
  }

  function handleSaveRecipients() {
    const cleaned = recipients;
    if (cleaned.length === 0) {
      return notice('No recipients to save', 'error');
    }
    const name = prompt('Save recipient list as:')?.trim();
    if (!name) return;
    saveRecipientList(name, cleaned);
    refreshRecipientLists();
    notice('Recipient list saved', 'success');
  }

  function handleDeleteRecipients() {
    if (!selectedListId) return notice('Select a saved list first', 'error');
    const list = recipientLists.find(l => l.id === selectedListId);
    if (!list) return;
    if (!confirm(`Delete recipient list: ${list.name}?`)) return;
    deleteRecipientList(selectedListId);
    refreshRecipientLists();
    setSelectedListId("");
    notice('Recipient list deleted', 'success');
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6 sm:p-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#101828]">Send Campaign</h1>
            <p className="text-sm text-gray-500 mt-1">Advanced campaign builder — multi-account, high-speed sending.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-2 items-center">
              <div className="text-sm text-gray-600">Active accounts</div>
              <div className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold">{activeAccountsCount}</div>
            </div>
            <button onClick={() => router.push('/accounts')} className="px-4 py-2 rounded-md bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white hover:opacity-95">Account Settings</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600">{visibleAccounts.length} accounts visible</div>
                        <div className="flex items-center gap-2">
                          {selectAllVisible && <button onClick={bulkSelectVisible} className="text-sm text-blue-600">Select all</button>}
                          <button onClick={clearSelection} className="text-sm text-gray-500">Clear</button>
                        </div>
                      </div>

                      {visibleAccounts.map((acc) => (
                        <div key={acc.id} role="listitem" className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedAccounts[acc.id] ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-[#F4F7FA] border-gray-100"}`} onClick={() => toggleAccount(acc.id)}>
                          <input aria-label={`select ${acc.email}`} checked={!!selectedAccounts[acc.id]} onChange={() => toggleAccount(acc.id)} type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="truncate">
                                <div className="text-sm font-semibold text-[#101828] truncate">{acc.name}</div>
                                <div className="text-xs text-gray-500 truncate">{acc.email}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="text-xs text-gray-500">Quota: {acc.quota.used}/{acc.quota.total}</div>
                              <AccountStatusPill status={acc.status} />
                            </div>
                          </div>
                        </div>
                      ))}

                      {visibleAccounts.length === 0 && <div className="text-sm text-center py-4 text-gray-500">No accounts match.</div>}
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-[#101828]">Recipients</h3>
                    <span className="text-sm font-bold text-blue-700">{recipients.length}</span>
                </div>
                {/* Saved lists selector */}
                <div className="flex items-center gap-2 mb-2">
                  <select value={selectedListId} onChange={(e) => handleSelectRecipientList(e.target.value)} className="flex-1 rounded-md border px-2 py-2">
                    <option value="">— Select saved list —</option>
                    {recipientLists.map(list => (
                      <option key={list.id} value={list.id}>{list.name} ({list.recipients.length})</option>
                    ))}
                  </select>
                  <button onClick={handleSaveRecipients} className="px-3 py-2 rounded-md border text-blue-700 border-blue-600 hover:bg-blue-50">Save</button>
                  <button onClick={handleDeleteRecipients} className="px-3 py-2 rounded-md border text-red-700 border-red-600 hover:bg-red-50">Delete</button>
                </div>
                <textarea 
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    placeholder="Paste one email per line..."
                    className="w-full h-48 p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </aside>

          <main className="lg:col-span-6 space-y-4">
            <div className="rounded-xl bg-white border p-6 shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#101828]">Campaign Configuration</h2>
                  <input placeholder="My awesome campaign" value={config.name} onChange={(e) => setCampaignConfig({ name: e.target.value })} className="mt-3 w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="w-56 ml-4">
                  <label className="text-sm text-gray-500">Template</label>
                  <select value={config.templateslot ?? ""} onChange={(e) => handleLoadTemplate(e.target.value)} className="mt-2 w-full rounded-md border px-2 py-2">
                    <option value="">— load template —</option>
                    {Object.entries(templates).map(([id, tpl]) => (
                      <option key={id} value={id}>{(tpl as any).name || id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div>
                  <label className="text-sm text-gray-600">Workers</label>
                  <input type="number" value={config.workers} onChange={(e) => setCampaignConfig({ workers: Number(e.target.value || 0) })} className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Delay (ms)</label>
                  <input type="number" value={config.delayMs} onChange={(e) => setCampaignConfig({ delayMs: Number(e.target.value || 0) })} className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Daily Limit / Account</label>
                  <input value={config.perAccountLimit} onChange={(e) => setCampaignConfig({ perAccountLimit: Number(e.target.value || 0) })} type="number" className="mt-2 rounded-md border px-3 py-2 w-full" />
                </div>
              </div>

              {config.sendMode === 'scheduled' && (
                <div className="mt-3 flex gap-2 items-center">
                  <IconClock />
                  <input aria-label="scheduled at" type="datetime-local" value={config.scheduledAt ?? ''} onChange={(e) => setCampaignConfig({ scheduledAt: e.target.value })} className="rounded-md border px-3 py-2" />
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white border p-6 shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Email Composer</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setVarsModalOpen(true)} className="text-sm text-blue-600">Personalization</button>
                  <button onClick={() => {
                    const name = prompt('Template name')?.trim();
                    if (name) handleSaveTemplate(name);
                  }} className="text-sm text-gray-500">Save as Template</button>
                </div>
              </div>
              <input placeholder="Subject" value={config.subject} onChange={(e) => setCampaignConfig({ subject: e.target.value })} className="w-full rounded-md border px-3 py-2 mb-3" />
              <div>
                <label className="text-sm text-gray-600">Body (HTML)</label>
                <div className="mt-2 border rounded-md min-h-[220px] p-3">
                  <textarea value={config.bodyHtml} onChange={(e) => setCampaignConfig({ bodyHtml: e.target.value })} placeholder="Write or paste HTML here. Use variables like {firstName}." className="w-full min-h-[180px] bg-transparent focus:outline-none" />
                </div>
              </div>
            </div>
          </main>

          <aside className="lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-xl bg-white border p-4 shadow">
                 <div className="text-sm text-gray-600 mb-3">Actions</div>
                <div className="space-y-3">
                  <button onClick={() => setTestModalOpen(true)} className="w-full rounded-md border border-blue-600 text-blue-600 py-2 hover:bg-blue-50 transition-colors">Send Test Email</button>
                  <button onClick={handleLaunch} disabled={loadingLaunch || !config.name || !config.subject || recipients.length === 0 || selectedAccountsCount === 0} className={`w-full rounded-full py-3 font-bold text-white transition-all ${loadingLaunch ? 'bg-gradient-to-r from-blue-400 to-indigo-400 opacity-80 cursor-wait' : 'bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] hover:opacity-90'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {loadingLaunch ? 'Launching...' : 'Launch Campaign'}
                  </button>
                </div>
              </div>
              
              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Stats</div>
                    <div className="text-lg font-bold text-[#101828]">{queuedCount} queued</div>
                  </div>
                  <div className="text-sm text-gray-500">Est: <span className="font-semibold text-purple-600">{estDuration}</span></div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-600">Preview</div>
                  <div className="mt-2 border rounded p-3 bg-[#F4F7FA] min-h-[120px]">
                    <div className="text-sm font-semibold">{config.subject || 'Subject preview'}</div>
                    <div className="text-xs text-gray-600 mt-2 line-clamp-4">{stripHtml(config.bodyHtml) || 'Body preview...'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white border p-4 shadow">
                <div className="text-sm text-gray-600 mb-2">Advanced Options</div>
                <div className="flex flex-col gap-2 text-sm text-gray-700">
                  <label className="inline-flex items-center"><input type="checkbox" checked={config.trackOpens} onChange={(e) => setCampaignConfig({ trackOpens: e.target.checked })} className="mr-2 h-4 w-4 text-blue-600"/>Track Opens</label>
                  <label className="inline-flex items-center"><input type="checkbox" checked={config.trackClicks} onChange={(e) => setCampaignConfig({ trackClicks: e.target.checked })} className="mr-2 h-4 w-4 text-blue-600"/>Track Clicks</label>
                  <label className="inline-flex items-center"><input type="checkbox" checked={config.addUnsubscribe} onChange={(e) => setCampaignConfig({ addUnsubscribe: e.target.checked })} className="mr-2 h-4 w-4 text-blue-600"/>Add Unsubscribe</label>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {varsModalOpen && <VariablesModal variables={config.variables} onClose={() => setVarsModalOpen(false)} onSave={(v) => setCampaignConfig({ variables: v })} />}
        {testModalOpen && <TestModal onClose={() => setTestModalOpen(false)} onSend={(to) => handleSendTest(to)} subject={config.subject} body={config.bodyHtml} />}
        <div className="fixed top-6 right-6 z-50">
          {toast && <Toast message={toast.msg} type={toast.type} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// Sub components
// ---------------------------
function AccountStatusPill({ status }: { status: AccountStatus }) {
    const statusMap = {
        active: { text: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        paused: { text: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
        error: { text: "Error", className: "bg-red-50 text-red-700 border-red-200" },
        disabled: { text: "Disabled", className: "bg-gray-50 text-gray-600 border-gray-200" },
    };
    const { text, className } = statusMap[status] || statusMap.disabled;
    return (
      <div className={`px-2 py-0.5 rounded text-xs font-medium border ${className}`}>{text}</div>
    );
}

function VariablesModal({ variables, onClose, onSave }: { variables: Record<string, string>; onClose: () => void; onSave: (v: Record<string, string>) => void }) {
  const [local, setLocal] = useState<[string, string][]>(() => Object.entries(variables));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Personalization Variables</h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">Close</button>
            <button onClick={() => { onSave(Object.fromEntries(local)); onClose(); }} className="px-3 py-1 rounded bg-blue-600 text-white">Save</button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">Use variables like <code className="bg-gray-100 px-1 rounded">{`{firstName}`}</code> in subject/body.</div>
          <div className="space-y-2 max-h-60 overflow-auto pr-2">
            {local.map(([k, v], idx) => (
              <div key={idx} className="flex gap-2">
                <input value={k} onChange={(e) => setLocal((s) => s.map((x, i) => i === idx ? [e.target.value, x[1]] : x))} className="w-1/3 rounded border px-2 py-1" placeholder="Variable Name"/>
                <input value={v} onChange={(e) => setLocal((s) => s.map((x, i) => i === idx ? [x[0], e.target.value] : x))} className="flex-1 rounded border px-2 py-1" placeholder="Test Value"/>
                <button onClick={() => setLocal((s) => s.filter((_, i) => i !== idx))} className="px-3 rounded bg-red-50 text-red-600">Delete</button>
              </div>
            ))}
          </div>
          <div>
            <button onClick={() => setLocal((s) => [...s, ["", ""]])} className="px-3 py-2 rounded bg-green-50 text-green-700">+ Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestModal({ onClose, onSend, subject, body }: { onClose: () => void; onSend: (to: string) => Promise<void>; subject: string; body: string; }) {
  const [to, setTo] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const refBottom = useRef<HTMLDivElement | null>(null);

  useEffect(() => { refBottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  async function handle() {
    if (!to) return;
    setLog([]);
    setSending(true);
    setLog((s) => [...s, `[INFO] Sending test to ${to}`]);
    try {
      await onSend(to);
      setLog((s) => [...s, `[SUCCESS] Test email sent!`]);
    } catch(e) {
      setLog((s) => [...s, `[ERROR] Failed to send test.`]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl p-6 shadow-xl" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Send Test Email</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100">Close</button>
        </div>
        <div className="space-y-3">
          <input placeholder="recipient@example.com" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded border px-3 py-2" />
          <div className="border rounded p-2 bg-gray-50 text-sm">
            <p><strong>Subject:</strong> {subject || '(not set)'}</p>
            <p className="mt-1"><strong>Body:</strong> {stripHtml(body).substring(0, 100) || '(not set)'}...</p>
          </div>
          <button onClick={handle} disabled={sending || !to} className={`w-full py-2 rounded font-semibold text-white ${sending ? 'bg-blue-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}>{sending ? 'Sending...' : 'Send Test'}</button>

          {log.length > 0 && <div>
            <div className="text-sm text-gray-600 mb-2">Logs</div>
            <div className="bg-[#F4F7FA] p-3 rounded h-40 overflow-auto font-mono text-sm border">
              {log.map((l, i) => (<div key={i} className={l.startsWith('[ERROR]') ? 'text-red-600' : l.startsWith('[SUCCESS]') ? 'text-emerald-600' : 'text-gray-700'}>{l}</div>))}
              <div ref={refBottom} />
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// Helpers
// ---------------------------

function estimateDuration({ queued, workers, delayMs }: { queued: number; workers: number; delayMs: number }) {
  if (!queued || queued <= 0 || !workers || workers <=0) return '~0m';
  const perWorker = Math.max(1, Math.ceil(queued / workers));
  const approxMs = perWorker * delayMs;
  const minutes = Math.ceil((approxMs / 1000) / 60);
  if (minutes < 1) return "<1m";
  return `~${minutes}m`;
}

function stripHtml(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

function loadTemplates(): Record<string, CampaignConfig> {
  try {
    if(typeof window === 'undefined') return {};
    const raw = localStorage.getItem('send_templates_v1');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTemplates(data: Record<string, CampaignConfig>) {
  try { 
    if(typeof window === 'undefined') return;
    localStorage.setItem('send_templates_v1', JSON.stringify(data)); 
  } catch {}
}
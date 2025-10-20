'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { API_URL as DETECTED_API_URL } from '@/lib/api';
import { 
  Send, 
  Users, 
  Settings, 
  Mail, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  Upload,
  TestTube,
  Save,
  Loader2,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  AlertCircle
} from 'lucide-react';

const API_URL = DETECTED_API_URL;

interface Account {
  id: number;
  name: string;
  client_email: string;
  domain: string;
  status: string;
  total_users: number;
  quota_used_today: number;
  quota_limit: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  service_account_id: number;
}

interface CampaignConfig {
  name: string;
  subject: string;
  body_html: string;
  body_plain: string;
  from_name: string;
  daily_limit: number;
  workers: number;
  delay_ms: number;
  test_after_email: string;
  test_after_count: number;
}

interface RecipientList {
    id: number;
    name: string;
    contacts: Array<{email: string}>;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [recipientsText, setRecipientsText] = useState('');
  const [config, setConfig] = useState<CampaignConfig>({
    name: '',
    subject: '',
    body_html: '',
    body_plain: '',
    from_name: 'Campaign',
    daily_limit: 2000,
    workers: 6,
    delay_ms: 200,
    test_after_email: '',
    test_after_count: 0
  });
  const [testEmail, setTestEmail] = useState('');
  const [selectedTestUsers, setSelectedTestUsers] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [templates, setTemplates] = useState<Array<{id: string, name: string, subject: string, body: string, createdAt: string}>>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const filteredSelectedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const base = users.filter(u => selectedAccounts.includes(u.service_account_id));
    if (!q) return base;
    return base.filter(u => u.email.toLowerCase().includes(q));
  }, [users, selectedAccounts, userSearch]);

  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedAccounts.includes(u.service_account_id));
  }, [users, selectedAccounts]);

  const appendLog = (line: string) => {
    const ts = new Date().toISOString();
    setLogs(prev => [...prev.slice(-499), `[${ts}] ${line}`]);
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const loadRecipientLists = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/contacts/`);
      setRecipientLists(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load recipient lists:', error);
      showNotification('Failed to fetch contact lists.', 'error');
      setRecipientLists([]);
    }
  };

  useEffect(() => {
    if (showRecipientModal) {
      loadRecipientLists();
    }
  }, [showRecipientModal]);

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`);
      setAccounts(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
        showNotification('Failed to load accounts', 'error');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
        setUsers(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showNotification('Failed to load users', 'error');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
        await Promise.all([ loadAccounts(), loadUsers() ]);
        const url = new URL(window.location.href);
        const idParam = url.searchParams.get('id');
        if (!idParam) return;
        try {
            const cid = parseInt(idParam);
            if (isNaN(cid)) return;
            setEditingId(cid);
            const res = await axios.get(`${API_URL}/api/v1/campaigns/${cid}/`);
            const c = res.data || {};
            setConfig(prev => ({
                ...prev,
                name: c.name || '',
                subject: c.subject || '',
                body_html: c.body_html || '',
            }));
            if (Array.isArray(c.recipients)) {
                setRecipientsText(c.recipients.map((r: any) => r.email).join('\n'));
            }
            if (Array.isArray(c.sender_accounts)) {
                setSelectedAccounts(c.sender_accounts.map((a: any) => a.id).filter(Boolean));
            }
        } catch (e) {
            console.warn('Edit preload failed:', e);
            showNotification('Failed to load existing campaign data', 'error');
        }
    };
    initializeData();
  }, []);

    const recipients = recipientsText.split('\n').filter(email => email.trim() && email.includes('@'));

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const payload = {
        name: config.name,
        subject: config.subject,
        body_html: config.body_html,
        recipients: recipients.map(email => ({ email, variables: {} })),
        sender_account_ids: selectedAccounts,
      };
      let url = `${API_URL}/api/v1/campaigns/`;
      let method: 'post' | 'patch' = 'post';
      if (editingId) {
          url = `${API_URL}/api/v1/campaigns/${editingId}/`;
          method = 'patch';
      }
      const response = await axios[method](url, payload, { headers: { 'Content-Type': 'application/json' } });
      showNotification(`Campaign ${editingId ? 'updated' : 'created'} successfully!`, 'success');
      router.push('/campaigns');
    } catch (error: any) {
      showNotification(`Campaign creation/update failed: ${error?.response?.data?.detail || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientList = (list: RecipientList) => {
    const emails = list.contacts.map(c => c.email).join('\n');
    setRecipientsText(emails);
    setShowRecipientModal(false);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">{editingId ? 'Edit Campaign' : 'New Campaign'}</h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Campaign Name" value={config.name} onChange={e => setConfig(c => ({...c, name: e.target.value}))} />
                <Input placeholder="Subject" value={config.subject} onChange={e => setConfig(c => ({...c, subject: e.target.value}))} />
                <Textarea placeholder="Email Body (HTML)" value={config.body_html} onChange={e => setConfig(c => ({...c, body_html: e.target.value}))} rows={12} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between flex-row">
                  <CardTitle>Recipients ({recipients.length})</CardTitle>
                  <Button variant="outline" onClick={() => setShowRecipientModal(true)}>Load Lists</Button>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Enter one email address per line" value={recipientsText} onChange={e => setRecipientsText(e.target.value)} rows={8} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Accounts & Senders</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                    <Label>Select Accounts</Label>
                    <div className="max-h-48 overflow-auto border rounded-md p-2 space-y-2">
                        {accounts.map(acc => (
                            <div key={acc.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`acc-${acc.id}`} 
                                    checked={selectedAccounts.includes(acc.id)} 
                                    onCheckedChange={checked => {
                                        setSelectedAccounts(prev => checked ? [...prev, acc.id] : prev.filter(id => id !== acc.id))
                                    }}
                                />
                                <Label htmlFor={`acc-${acc.id}`} className="font-normal">{acc.name || acc.client_email}</Label>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedAccounts.length} of {accounts.length} accounts selected.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Users of Selected Accounts ({filteredSelectedUsers.length})</CardTitle></CardHeader>
                <CardContent>
                    <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                    <div className="max-h-48 overflow-auto border rounded-md mt-2">
                        {filteredSelectedUsers.map(u => <div key={u.id} className="text-sm p-2">{u.email}</div>)}
                    </div>
                </CardContent>
            </Card>

            <div className="sticky top-0">
                <Button onClick={handleCreateCampaign} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingId ? 'Update Campaign' : 'Create Campaign')}
                </Button>
            </div>
          </div>
        </div>

        {showRecipientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Load Recipients from Contact List</h3>
              {recipientLists.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                      {recipientLists.map(list => (
                          <div key={list.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                  <div className="font-medium">{list.name}</div>
                                  <div className="text-sm text-gray-500">{list.contacts.length} recipients</div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => loadRecipientList(list)}>Load</Button>
                          </div>
                      ))}
                  </div>
              ) : <p>No lists found.</p>}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setShowRecipientModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {notifications.map(notification => (
          <Alert key={notification.id} className={`fixed top-5 right-5 max-w-sm z-50 ${
            notification.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
            notification.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' :
            'border-blue-200 bg-blue-50 text-blue-800'
          }`}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
}

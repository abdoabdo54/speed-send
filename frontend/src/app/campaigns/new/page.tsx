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
import { Sidebar } from '@/components/Sidebar';
import { serviceAccountsApi, usersApi, dataListsApi, contactsApi, API_URL as DETECTED_API_URL } from '@/lib/api';
import {
  Send,
  Users,
  AlertCircle,
  RefreshCw,
  Mail,
  Settings,
  Save,
  Eye,
  TestTube,
  CheckCircle,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  Play
} from 'lucide-react';

// API Configuration
const API_URL = DETECTED_API_URL;

// Types
interface Account {
  id: number;
  name?: string;
  client_email?: string;
  status?: string;
  domain?: string;
  total_users?: number;
  quota_used_today?: number;
  quota_limit?: number;
}

interface User {
  id: number;
  email: string;
  is_active: boolean;
  service_account_id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

interface RecipientList {
  id: number;
  name: string;
  recipients: string[];
  created_at: string;
  geo_filter?: string;
  list_type?: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [recipientsText, setRecipientsText] = useState('');
  const [config, setConfig] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_plain: '',
    from_name: '',
    daily_limit: 100,
    workers: 1,
    delay_ms: 0,
    test_after_email: '',
    test_after_count: 0,
    header_type: 'existing',
    custom_header: `MIME-version: 1.0
Content-type: text/html
To: [to]
Message-ID: <[rnda_20]@mail.sys.com>
Feedback-ID: [rndn_10]:[rndn_7]:[rndn_3].[rndn_2].[rndn_2].[rndn_2]:[rnda_8]
from: [from] <[smtp]>
Subject: [subject]
Date: [date]
List-Unsubscribe: <mailto:unsubscribe@[domain]?subject=unsubscribe>
Received: by [rnda_15].[rnda_10].com with SMTP id [rnda_20] for [to]; [date]`
  });
  const [testEmail, setTestEmail] = useState('');
  const [selectedTestUsers, setSelectedTestUsers] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [selectedRecipientListId, setSelectedRecipientListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [userSearch, setUserSearch] = useState('');

  // Derived state
  const recipients = useMemo(() => {
    return recipientsText.split('\n').filter(email => email.trim() && email.includes('@'));
  }, [recipientsText]);

  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedAccounts.includes(u.service_account_id));
  }, [users, selectedAccounts]);

  const filteredSelectedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const base = selectedUsers;
    return q ? base.filter(u => (u.email || '').toLowerCase().includes(q)) : base;
  }, [selectedUsers, userSearch]);

  const totalSenders = selectedUsers.length;
  const queuedCount = recipients.length;
  const estDuration = Math.ceil(queuedCount / (config.workers * 10));

  // Utility functions
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const appendLog = (line: string) => {
    const ts = new Date().toISOString();
    setLogs(prev => [...prev.slice(-499), `[${ts}] ${line}`]);
  };

  // API Functions
  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && Array.isArray(response.data)) {
        setAccounts(response.data);
        console.log('Accounts loaded successfully:', response.data.length, 'accounts');
        showNotification(`Loaded ${response.data.length} Google Workspace accounts`, 'success');
      } else {
        console.warn('Invalid response format:', response.data);
        setAccounts([]);
      }
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      showNotification('Failed to load accounts', 'error');
      setAccounts([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && Array.isArray(response.data)) {
        const filteredUsers = response.data.filter((user: any) => {
          const email = user.email?.toLowerCase() || '';
          return !email.includes('admin') && 
                 !email.includes('administrator') && 
                 !email.includes('postmaster') &&
                 !email.includes('abuse') &&
                 !email.includes('support') &&
                 !email.includes('noreply') &&
                 !email.includes('no-reply') &&
                 !email.includes('donotreply') &&
                 !email.includes('do-not-reply');
        });

        setUsers(filteredUsers);
        console.log('Users loaded successfully:', filteredUsers.length, 'users');
        showNotification(`Loaded ${filteredUsers.length} Google Workspace users`, 'success');
      } else {
        console.warn('Invalid response format from users API');
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      showNotification('Failed to load users', 'error');
      setUsers([]);
    }
  };

  const loadRecipientLists = async () => {
    try {
      console.log('Loading recipient lists...');
      const response = await axios.get(`${API_URL}/api/v1/contacts/lists`, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Recipient lists response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const safeLists = response.data.map((item: any) => ({
          id: item.id || 0,
          name: item.name || 'Unnamed List',
          recipients: Array.isArray(item.recipients) ? item.recipients : [],
          created_at: item.created_at || new Date().toISOString(),
          geo_filter: item.geo_filter || '',
          list_type: item.list_type || 'custom'
        }));
        
        setRecipientLists(safeLists);
        console.log('Contact lists loaded successfully:', safeLists.length, 'lists');
        showNotification(`Loaded ${safeLists.length} recipient lists`, 'success');
      } else {
        console.warn('Invalid response format:', response.data);
        setRecipientLists([]);
        showNotification('No recipient lists found', 'info');
      }
    } catch (error: any) {
      console.error('Failed to load recipient lists:', error);
      const errorMessage = error.response?.status === 404 
        ? 'Recipient lists endpoint not found' 
        : 'Failed to load recipient lists';
      showNotification(errorMessage, 'error');
      setRecipientLists([]);
    }
  };

  const loadTemplates = async () => {
    try {
      if (typeof window !== 'undefined') {
        const savedTemplates = localStorage.getItem('email_templates');
        if (savedTemplates) {
          setTemplates(JSON.parse(savedTemplates));
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setBackendStatus('checking');
        await Promise.all([
          loadAccounts(),
          loadUsers(),
          loadTemplates(),
          loadRecipientLists()
        ]);
        setBackendStatus('connected');
      } catch (error) {
        console.error('Failed to initialize data:', error);
        setBackendStatus('disconnected');
        showNotification('Failed to load initial data', 'error');
      }
    };

    loadData();
  }, []);

  // Refresh lists when modal opens
  useEffect(() => {
    if (showRecipientModal) {
      loadRecipientLists();
      const defaultName = (config.name && config.name.trim()) ? config.name.trim() : `List ${new Date().toLocaleDateString()}`;
      setNewListName(defaultName);
    }
  }, [showRecipientModal, config.name]);

  // Event handlers
  const handleAccountToggle = (accountId: number) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(a => a.id));
    }
  };

  const handleCreateCampaign = async () => {
    if (loading) return;

    const errors = [];
    if (!config.name.trim()) errors.push('Campaign name is required');
    if (!config.subject.trim()) errors.push('Subject is required');
    if (!config.body_html.trim()) errors.push('Email content is required');
    if (selectedAccounts.length === 0) errors.push('Please select at least one account');
    if (recipients.length === 0) errors.push('Please add at least one recipient');

    if (errors.length > 0) {
      showNotification(errors.join(', '), 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: config.name,
        subject: config.subject,
        body_html: config.body_html,
        body_plain: config.body_html.replace(/<[^>]*>/g, ''),
        from_name: config.from_name,
        recipients: recipients.map(email => ({ email, variables: {} })),
        sender_account_ids: selectedAccounts,
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: config.daily_limit,
        concurrency: config.workers,
        test_after_email: config.test_after_email,
        test_after_count: config.test_after_count,
        header_type: config.header_type,
        custom_header: config.custom_header
      };

      const url = `${API_URL}/api/v1/campaigns/`;
      appendLog(`POST ${url} (recipients=${payload.recipients.length}, senders=${payload.sender_account_ids.length})`);
      
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      appendLog(`Campaign created successfully: ${response.data.id}`);
      showNotification(`Campaign created successfully! ID: ${response.data.id}`, 'success');
      router.push('/campaigns');
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create campaign';
      showNotification(errorMessage, 'error');
      appendLog(`Campaign creation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadList = (list: RecipientList) => {
    const emails = list.recipients.join('\n');
    setRecipientsText(emails);
    setShowRecipientModal(false);
    showNotification(`Loaded ${list.recipients.length} recipients from "${list.name}"`, 'success');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="min-h-screen bg-gray-50 p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
              <p className="text-gray-600 mt-2">Create and launch email campaigns using Google Workspace</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Active accounts <span className="font-semibold text-blue-600">{accounts.length}</span>
              </div>
              <Button
                onClick={() => {
                  loadAccounts();
                  loadUsers();
                  loadRecipientLists();
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Notifications */}
          {notifications.map(notification => (
            <Alert key={notification.id} className={`mb-4 ${
              notification.type === 'success' ? 'border-green-200 bg-green-50' :
              notification.type === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <AlertTitle className={
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }>
                {notification.type === 'success' ? 'Success' :
                 notification.type === 'error' ? 'Error' : 'Info'}
              </AlertTitle>
              <AlertDescription className={
                notification.type === 'success' ? 'text-green-700' :
                notification.type === 'error' ? 'text-red-700' :
                'text-blue-700'
              }>
                {notification.message}
              </AlertDescription>
            </Alert>
          ))}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Campaign Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Campaign Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Campaign Name</Label>
                      <Input
                        id="name"
                        value={config.name}
                        onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter campaign name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="from_name">From Name</Label>
                      <Input
                        id="from_name"
                        value={config.from_name}
                        onChange={(e) => setConfig(prev => ({ ...prev, from_name: e.target.value }))}
                        placeholder="Sender name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={config.subject}
                      onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <Label htmlFor="body_html">Email Content</Label>
                    <Textarea
                      id="body_html"
                      value={config.body_html}
                      onChange={(e) => setConfig(prev => ({ ...prev, body_html: e.target.value }))}
                      placeholder="Enter your email content here... You can use HTML tags for formatting."
                      rows={8}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="daily_limit">Daily Limit</Label>
                      <Input
                        id="daily_limit"
                        type="number"
                        value={config.daily_limit}
                        onChange={(e) => setConfig(prev => ({ ...prev, daily_limit: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="workers">Workers</Label>
                      <Input
                        id="workers"
                        type="number"
                        value={config.workers}
                        onChange={(e) => setConfig(prev => ({ ...prev, workers: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="delay_ms">Delay (ms)</Label>
                      <Input
                        id="delay_ms"
                        type="number"
                        value={config.delay_ms}
                        onChange={(e) => setConfig(prev => ({ ...prev, delay_ms: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Accounts Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Google Workspace Accounts ({accounts.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSelectAllAccounts}
                      >
                        {selectedAccounts.length === accounts.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {accounts.map(account => (
                      <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={selectedAccounts.includes(account.id)}
                          onCheckedChange={() => handleAccountToggle(account.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{account.client_email}</div>
                          <div className="text-sm text-gray-500">
                            {account.domain && `Domain: ${account.domain}`}
                            {account.total_users && ` • ${account.total_users} users`}
                          </div>
                        </div>
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status || 'Unknown'}
                        </Badge>
                      </div>
                    ))}
                    {accounts.length === 0 && (
                      <div className="text-center py-4">
                        <div className="text-gray-500">No accounts found</div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={loadAccounts}
                          className="mt-2"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Load Accounts
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Users of Selected Accounts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      Users of Selected Accounts ({filteredSelectedUsers.length})
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={loadUsers}
                      >
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        Total loaded: {users.length}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedUsers.length === 0 ? (
                    <div className="text-sm text-gray-500">Select one or more accounts to see their users.</div>
                  ) : (
                    <div className="max-h-48 overflow-auto divide-y rounded border">
                      <div className="p-2 sticky top-0 bg-white flex items-center gap-2">
                        <Input
                          placeholder="Search users by email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{filteredSelectedUsers.length} found</span>
                      </div>
                      {filteredSelectedUsers.slice(0, 300).map(u => (
                        <div key={`${u.service_account_id}-${u.email}`} className="px-3 py-2 text-sm flex items-center justify-between">
                          <span className="truncate">{u.email}</span>
                          <span className={`text-xs ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {u.is_active ? 'active' : 'inactive'}
                          </span>
                        </div>
                      ))}
                      {filteredSelectedUsers.length > 300 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">+{filteredSelectedUsers.length - 300} more...</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Recipients ({recipients.length})
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRecipientModal(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Load Lists
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="recipients">Email Addresses (one per line)</Label>
                    <Textarea
                      id="recipients"
                      value={recipientsText}
                      onChange={(e) => setRecipientsText(e.target.value)}
                      placeholder="Enter email addresses, one per line..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Create and manage lists in the Contacts page
                    </p>
                  </div>

                  {recipients.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <p>Valid recipients: {recipients.length}</p>
                      <p>Invalid entries: {recipientsText.split('\n').length - recipients.length}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: Stats & Actions */}
            <div className="space-y-6">
              {/* Campaign Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Service Accounts:</span>
                    <span className="font-medium">{selectedAccounts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Users:</span>
                    <span className="font-medium">{totalSenders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Recipients:</span>
                    <span className="font-medium">{queuedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Est. Duration:</span>
                    <span className="font-medium">{estDuration} min</span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setShowTestModal(true)}
                    variant="outline"
                    className="w-full"
                    disabled={loading || selectedAccounts.length === 0}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>

                  <Button
                    onClick={handleCreateCampaign}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || selectedAccounts.length === 0 || recipients.length === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Load Lists Modal */}
          {showRecipientModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <h3 className="text-lg font-semibold mb-4">Load Recipient Lists</h3>
                <div className="space-y-4">
                  {/* Load Existing Lists */}
                  <div>
                    <h4 className="font-medium mb-2">Load Existing Lists</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {recipientLists.map(list => (
                        <div key={list.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{list.name}</div>
                            <div className="text-sm text-gray-500">{list.recipients.length} recipients</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadList(list)}
                            >
                              Load
                            </Button>
                          </div>
                        </div>
                      ))}
                      {recipientLists.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No saved lists
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowRecipientModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
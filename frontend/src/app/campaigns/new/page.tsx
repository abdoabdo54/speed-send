'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/Sidebar';
import { API_URL as DETECTED_API_URL } from '@/lib/api';
import { Loader2, RefreshCw, X } from 'lucide-react';

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

interface RecipientList {
    id: number;
    name: string;
    contacts: Array<{email: string}>;
}

interface CampaignConfig {
  name: string;
  subject: string;
  from_name: string;
  body_html: string;
  test_after_count: number;
  test_after_email: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [recipientsText, setRecipientsText] = useState('');
  const [config, setConfig] = useState<CampaignConfig>({ 
    name: '', 
    subject: '', 
    from_name: '',
    body_html: '',
    test_after_count: 100,
    test_after_email: ''
  });
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const [showTestModal, setShowTestModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);

  const [testSender, setTestSender] = useState<string>('');
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const appendLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 499)]);
  }

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`);
      setAccounts(response.data || []);
    } catch (error) {
      showNotification('Failed to load accounts', 'error');
    }
  };

  const loadUsers = async () => {
    appendLog('🗺️ Loading Google Workspace users...');
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
      const users = response.data || [];
      const adminCount = users.filter((u: User) => u.email.includes('admin')).length;
      setAllUsers(users);
      appendLog(`✅ Users loaded: ${users.length} total, ${adminCount} admins excluded.`);
    } catch (error) {
      showNotification('Failed to load users', 'error');
      appendLog('❌ Failed to load users');
    }
  };

  const loadRecipientLists = async () => {
      try {
          const response = await axios.get(`${API_URL}/api/v1/contacts/`);
          setRecipientLists(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
          showNotification('Failed to load recipient lists.', 'error');
          setRecipientLists([]);
      }
  };

  useEffect(() => {
      if (showRecipientModal) loadRecipientLists();
  }, [showRecipientModal]);

  useEffect(() => {
    loadAccounts();
    loadUsers();
  }, []);

  const handleAccountSelection = (accountId: number, isSelected: boolean) => {
    setSelectedAccounts(prev => 
      isSelected ? [...prev, accountId] : prev.filter(id => id !== accountId)
    );
  };

  const handleSelectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(acc => acc.id));
    }
  };

  const filteredUsers = useMemo(() => {
    const nonAdminUsers = allUsers.filter(user => !user.email.includes('admin'));
    if (selectedAccounts.length === 0) return [];
    return nonAdminUsers.filter(user => 
      selectedAccounts.includes(user.service_account_id) &&
      user.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [allUsers, selectedAccounts, userSearch]);

  const recipients = useMemo(() => recipientsText.split('\n').filter(email => email.trim() && email.includes('@')), [recipientsText]);

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const payload = {
        ...config,
        recipients: recipients.map(email => ({ email, variables: {} })),
        sender_account_ids: selectedAccounts,
      };
      const response = await axios.post(`${API_URL}/api/v1/campaigns/`, payload);
      showNotification('Campaign created successfully!', 'success');
      router.push(`/campaigns/${response.data.id}/live`);
    } catch (error: any) {
      showNotification(`Campaign creation failed: ${error?.response?.data?.detail || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
      if(!testSender || !testRecipient) {
          showNotification('Please select a sender and enter a recipient.', 'error');
          return;
      }
      setIsSendingTest(true);
      try {
          await axios.post(`${API_URL}/api/v1/campaigns/test`, {
              from_email: testSender,
              to_email: testRecipient,
              from_name: config.from_name,
              subject: config.subject,
              body_html: config.body_html,
          });
          showNotification('Test email sent successfully!', 'success');
          setShowTestModal(false);
      } catch (error: any) {
          showNotification(`Failed to send test email: ${error?.response?.data?.detail || 'Unknown error'}`, 'error');
      } finally {
          setIsSendingTest(false);
      }
  };

  const loadRecipientList = (list: RecipientList) => {
    const emails = list.contacts.map(c => c.email).join('\n');
    setRecipientsText(prev => prev ? `${prev}\n${emails}` : emails);
    setShowRecipientModal(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="bg-black text-white font-mono p-4 rounded-md mb-6 text-xs h-32 overflow-y-scroll flex flex-col-reverse">
            <div>{log.map((line, i) => <p key={i}>{line}</p>)}</div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Google Workspace Accounts ({accounts.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={handleSelectAllAccounts}>Select All</Button>
              </CardHeader>
              <CardContent className="max-h-64 overflow-auto">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center space-x-2 my-2">
                    <Checkbox 
                        id={`acc-${account.id}`}
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={(checked) => handleAccountSelection(account.id, !!checked)}
                    />
                    <Label htmlFor={`acc-${account.id}`} className="flex items-center gap-2">
                      <span>{account.client_email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{account.status}</span>
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Users of Selected Accounts ({filteredUsers.length})</CardTitle>
                <Button variant="outline" size="icon" onClick={loadUsers}><RefreshCw className="h-4 w-4"/></Button>
              </CardHeader>
              <CardContent>
                <Input 
                  placeholder="Search users by email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <div className="max-h-64 overflow-auto mt-2 text-sm border rounded-md">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="p-1 truncate">{user.email}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-5 space-y-6">
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Input placeholder="Campaign Name" value={config.name} onChange={e => setConfig(c => ({...c, name: e.target.value}))} />
                    <Input placeholder="From Name" value={config.from_name} onChange={e => setConfig(c => ({...c, from_name: e.target.value}))} />
                    <Input placeholder="Subject" value={config.subject} onChange={e => setConfig(c => ({...c, subject: e.target.value}))} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recipients ({recipients.length})</CardTitle>
                    <Button variant="outline" onClick={() => setShowRecipientModal(true)}>Load Lists</Button>
                </CardHeader>
                <CardContent>
                    <Textarea placeholder="Enter one email per line" value={recipientsText} onChange={e => setRecipientsText(e.target.value)} rows={8} />
                </CardContent>
            </Card>
             <Card>
              <CardHeader><CardTitle>Email Composer</CardTitle></CardHeader>
              <CardContent>
                <Textarea placeholder="Email Body (HTML)" rows={12} value={config.body_html} onChange={e => setConfig(c => ({...c, body_html: e.target.value}))} />
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-3 space-y-6">
            <Card>
                <CardHeader><CardTitle>Gmail API Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => setShowTestModal(true)}>Send Test Email</Button>
                    <Button variant="outline" className="w-full" onClick={() => setShowPreviewModal(true)}>Preview Email</Button>
                    <Button className="w-full" onClick={handleCreateCampaign} disabled={loading || recipients.length === 0}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Campaign'}
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Test After</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <Label>Send test after N emails</Label>
                    <Input type="number" value={config.test_after_count} onChange={e => setConfig(c => ({...c, test_after_count: parseInt(e.target.value) || 0}))} />
                    <Label>Test Recipient Email</Label>
                    <Input placeholder="test.recipient@example.com" value={config.test_after_email} onChange={e => setConfig(c => ({...c, test_after_email: e.target.value}))} />
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Test Email Modal */}
        {showTestModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                    <CardTitle>Send Test Email</CardTitle>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Send From</Label>
                            <Select onValueChange={setTestSender} value={testSender}>
                                <SelectTrigger><SelectValue placeholder="Select a user to send from..." /></SelectTrigger>
                                <SelectContent>
                                    {filteredUsers.map(u => <SelectItem key={u.id} value={u.email}>{u.email}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Recipient Email</Label>
                            <Input placeholder="recipient@example.com" value={testRecipient} onChange={e => setTestRecipient(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="ghost" onClick={() => setShowTestModal(false)}>Cancel</Button>
                        <Button onClick={handleSendTestEmail} disabled={isSendingTest}>{isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Preview Email Modal */}
        {showPreviewModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-1 w-full max-w-4xl h-4/5">
                    <div className="flex justify-between items-center p-4 border-b">
                        <CardTitle>Email Preview</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowPreviewModal(false)}><X className="h-4 w-4" /></Button>
                    </div>
                    <iframe srcDoc={config.body_html} className="w-full h-full border-0" />
                </div>
            </div>
        )}

        {/* Recipient List Modal */}
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
                    ) : <p>No lists found. You can create new lists in the Contacts page.</p>}
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
          </Aler t>
        ))}
      </main>
    </div>
  );
}

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
import { Loader2 } from 'lucide-react';

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
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [recipientsText, setRecipientsText] = useState('');
  const [config, setConfig] = useState<CampaignConfig>({ name: '', subject: '', body_html: '' });
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [userSearch, setUserSearch] = useState('');

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
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
      setUsers(response.data || []);
    } catch (error) {
      showNotification('Failed to load users', 'error');
    }
  };

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
    if (selectedAccounts.length === 0) return [];
    return users.filter(user => 
      selectedAccounts.includes(user.service_account_id) &&
      user.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, selectedAccounts, userSearch]);

  const recipients = recipientsText.split('\n').filter(email => email.trim() && email.includes('@'));

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const payload = {
        ...config,
        recipients: recipients.map(email => ({ email, variables: {} })),
        sender_account_ids: selectedAccounts,
      };
      await axios.post(`${API_URL}/api/v1/campaigns/`, payload);
      showNotification('Campaign created successfully!', 'success');
      router.push('/campaigns');
    } catch (error: any) {
      showNotification(`Campaign creation failed: ${error?.response?.data?.detail || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="bg-black text-white font-mono p-4 rounded-md mb-6 text-xs h-32 overflow-y-scroll">
            <p>[2025-10-13T20:41:31.371Z] 🗺️ Loading Google Workspace users...</p>
            <p>[2025-10-13T20:41:31.534Z] ✅ Users loaded successfully: 294 users (0 admin users excluded)</p>
            <p>[2025-10-13T20:41:31.677Z] 📝 Loaded campaign 24 for editing</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column */} 
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
                    <Label htmlFor={`acc-${account.id}`} className="flex flex-col">
                      <span>{account.client_email}</span>
                      <span className="text-xs text-gray-500">Workspace Users: {account.total_users} | Quota: {account.quota_used_today}/{account.quota_limit}</span>
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Users of Selected Accounts ({filteredUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  placeholder="Search users by email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <div className="max-h-64 overflow-auto mt-2">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="text-sm p-1">{user.email}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column */}
          <div className="xl:col-span-5 space-y-6">
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Input placeholder="Campaign Name (e.g. opp-latest (copy))" value={config.name} onChange={e => setConfig(c => ({...c, name: e.target.value}))} />
                    <Input placeholder="Subject (e.g. Tjek venligst)" value={config.subject} onChange={e => setConfig(c => ({...c, subject: e.target.value}))} />
                </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Google Workspace Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2"><Checkbox id="labels" defaultChecked /><Label htmlFor="labels">Use Gmail Labels for Organization</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="opens" defaultChecked /><Label htmlFor="opens">Track Email Opens (Gmail API)</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="clicks" defaultChecked /><Label htmlFor="clicks">Track Link Clicks (Gmail API)</Label></div>
                <div>
                    <Label>Sender Rotation Strategy</Label>
                    <Select defaultValue="round_robin">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="round_robin">Round Robin (Recommended)</SelectItem>
                            <SelectItem value="random">Random</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Email Composer</CardTitle>
                <div>
                    <Button variant="outline" size="sm">Manage Variables</Button>
                    <Button variant="outline" size="sm" className="ml-2">Save Template</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Email Body (HTML)" rows={18} value={config.body_html} onChange={e => setConfig(c => ({...c, body_html: e.target.value}))} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-3 space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-center">Recipients</CardTitle></CardHeader>
                <CardContent className="text-center">
                    <div className="text-4xl font-bold">{filteredUsers.length}</div>
                    <p className="text-sm text-gray-500">Workspace Users</p>
                    <div className="text-4xl font-bold mt-4">0m</div>
                    <p className="text-sm text-gray-500">Est. Duration</p>
                </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex justify-between"><span className="font-bold">Service Accounts:</span><span>{selectedAccounts.length}</span></div>
                <div className="flex justify-between"><span className="font-bold">Daily Quota:</span><span>2000</span></div>
                <div className="flex justify-between"><span className="font-bold">Concurrent Senders:</span><span>6</span></div>
                <div className="flex justify-between"><span className="font-bold">Gmail API Rate:</span><span>250 req/sec</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Gmail API Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">Send Test Email</Button>
                <Button variant="outline" className="w-full">Preview Email</Button>
                <Button variant="outline" className="w-full">View Analytics</Button>
                <Button className="w-full" onClick={handleCreateCampaign} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Campaign'}
                </Button>
                <p className="text-xs text-center text-gray-500 pt-2">Emails will be sent via Google Workspace users. PowerMTA-style high-speed delivery enabled.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {notifications.map(notification => (
          <Alert key={notification.id} className={`fixed top-5 right-5 max-w-sm z-50 ${
            notification.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
            notification.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' :
            'border-blue-200 bg-blue-50 text-blue-800'
          }`}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        ))}
      </main>
    </div>
  );
}

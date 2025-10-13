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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { API_URL } from '@/lib/api';
import { 
  Save, 
  Users, 
  Settings, 
  Mail, 
  RefreshCw, 
  TestTube,
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';

// Types
interface Account {
  id: number;
  name: string;
  client_email: string;
  domain: string;
  status: string;
  total_users: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  service_account_id: number;
}

interface DraftCampaign {
  name: string;
  subject: string;
  body_html: string;
  from_name: string;
}

export default function NewDraftPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isEditing = useMemo(() => params.id !== 'new', [params.id]);
  
  // State
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [recipientsText, setRecipientsText] = useState('');
  const [campaign, setCampaign] = useState<DraftCampaign>({
    name: '',
    subject: '',
    body_html: '',
    from_name: '',
  });
  const [testEmail, setTestEmail] = useState('');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTestUsers, setSelectedTestUsers] = useState<number[]>([]);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedAccounts.includes(u.service_account_id));
  }, [users, selectedAccounts]);

  // Backend health check
  const checkBackendHealth = async () => {
    try {
      setBackendStatus('checking');
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      if (response.status === 200) {
        setBackendStatus('connected');
        setConnectionError(null);
        return true;
      } else {
        setBackendStatus('disconnected');
        setConnectionError('Backend returned unexpected status');
        return false;
      }
    } catch (error: any) {
      setBackendStatus('disconnected');
      setConnectionError(`Backend connection failed: ${error.message}`);
      return false;
    }
  };

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      const isHealthy = await checkBackendHealth();
      if (isHealthy) {
        await Promise.all([loadAccounts(), loadUsers()]);
        if (isEditing) {
          loadDraft(params.id);
        }
      } else {
        showNotification('Backend server is not available. Please check server status.', 'error');
      }
    };
    initializeData();
  }, [params.id, isEditing]);

  // API Functions
  const loadDraft = async (id: string) => {
      try {
          const response = await axios.get(`${API_URL}/api/campaigns/${id}`);
          const draftData = response.data;
          setCampaign({
              name: draftData.name || '',
              subject: draftData.subject || '',
              body_html: draftData.body_html || '',
              from_name: draftData.from_name || '',
          });
          // Additional fields for drafts can be loaded here if needed
      } catch (error) {
          showNotification('Failed to load draft data.', 'error');
          console.error('Failed to load draft:', error);
      }
  }

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/accounts/`);
      if (response.data && Array.isArray(response.data)) {
        setAccounts(response.data);
        showNotification(`Loaded ${response.data.length} accounts.`, 'success');
      } else {
        setAccounts([]);
        showNotification('No accounts found.', 'info');
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      showNotification('Failed to load accounts.', 'error');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`);
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // UI Notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const payload = {
        ...campaign,
        // Ensure you add any other required fields for a draft
      };

      let response;
      if (isEditing) {
        response = await axios.patch(`${API_URL}/api/campaigns/${params.id}/`, payload);
        showNotification('Draft updated successfully!', 'success');
      } else {
        response = await axios.post(`${API_URL}/api/campaigns/`, { ...payload, status: 'draft' });
        showNotification('Draft saved successfully!', 'success');
      }
      router.push('/drafts');
    } catch (error: any) {
      showNotification(`Failed to save draft: ${error.message}`, 'error');
      console.error('Save draft error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendTest = async () => {
    if (!testEmail.trim() || selectedTestUsers.length === 0) {
        showNotification('Please enter a test email and select at least one sender.', 'error');
        return;
    }
    setLoading(true);
    try {
        const testPromises = selectedTestUsers.map(userId => {
            const user = users.find(u => u.id === userId);
            if (!user) return null;

            return axios.post(`${API_URL}/api/test-email/`, {
                recipient_email: testEmail,
                subject: campaign.subject,
                body_html: campaign.body_html,
                from_name: campaign.from_name,
                sender_account_id: user.service_account_id,
            });
        });

        const results = await Promise.allSettled(testPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        if (successful > 0) {
            showNotification(`${successful} test email(s) sent successfully.`, 'success');
        } else {
            showNotification('Failed to send test emails.', 'error');
        }
        setShowTestModal(false);
    } catch (error) {
        showNotification('An error occurred while sending test emails.', 'error');
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 overflow-auto p-8">
        <header className="mb-8">
            <Button variant="outline" onClick={() => router.push('/drafts')} className="mb-4">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Drafts
            </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Draft Campaign' : 'Create New Draft Campaign'}
          </h1>
        </header>

        {backendStatus === 'disconnected' && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Backend Connection Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
        )}

        {/* Notifications */}
        <div className="fixed top-5 right-5 z-50 w-full max-w-sm">
            {notifications.map(notification => (
                <Alert key={notification.id} className={`mb-4 shadow-lg ${notification.type === 'success' ? 'bg-green-100 border-green-200' : notification.type === 'error' ? 'bg-red-100 border-red-200' : 'bg-blue-100 border-blue-200'}`}>
                <AlertDescription className={`${notification.type === 'success' ? 'text-green-800' : notification.type === 'error' ? 'text-red-800' : 'text-blue-800'}`}>
                    {notification.message}
                </AlertDescription>
                </Alert>
            ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Accounts and Users */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accounts ({accounts.length})</CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center space-x-3 p-2 border-b">
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => setSelectedAccounts(prev => 
                        prev.includes(account.id) ? prev.filter(id => id !== account.id) : [...prev, account.id]
                      )}
                    />
                    <div className="flex-1">
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.client_email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users ({selectedUsers.length})</CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {selectedUsers.map(user => (
                  <div key={user.id} className="p-2 border-b">
                    <p className="text-sm">{user.email}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* CENTER COLUMN: Email Composer */}
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input id="campaign-name" value={campaign.name} onChange={e => setCampaign({...campaign, name: e.target.value})} />
                </div>
                 <div>
                  <Label htmlFor="from-name">From Name</Label>
                  <Input id="from-name" value={campaign.from_name} onChange={e => setCampaign({...campaign, from_name: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={campaign.subject} onChange={e => setCampaign({...campaign, subject: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="body_html">Email Body (HTML)</Label>
                  <Textarea id="body_html" value={campaign.body_html} onChange={e => setCampaign({...campaign, body_html: e.target.value})} rows={15} />
                </div>
              </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Recipients</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        placeholder="recipient1@example.com&#10;recipient2@example.com"
                        rows={10}
                        value={recipientsText}
                        onChange={(e) => setRecipientsText(e.target.value)}
                    />
                </CardContent>
            </Card>
            
            <div className="flex items-center gap-4">
                <Button onClick={handleSaveDraft} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {isEditing ? 'Update Draft' : 'Save Draft'}
                </Button>
                <Button onClick={() => setShowTestModal(true)} variant="outline" className="w-full">
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
            </div>

          </div>
        </div>

        {/* Test Email Modal */}
        {showTestModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
                <div className="space-y-4">
                <div>
                    <Label htmlFor="test-email-input">Recipient Email</Label>
                    <Input id="test-email-input" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                </div>
                <div>
                    <Label>Send From</Label>
                    <div className="max-h-48 overflow-y-auto border rounded p-2 mt-2">
                        {selectedUsers.map(user => (
                            <div key={user.id} className="flex items-center gap-2">
                                <Checkbox 
                                    id={`test-user-${user.id}`}
                                    checked={selectedTestUsers.includes(user.id)} 
                                    onCheckedChange={() => setSelectedTestUsers(prev => 
                                        prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                    )}
                                />
                                <label htmlFor={`test-user-${user.id}`}>{user.email}</label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowTestModal(false)}>Cancel</Button>
                    <Button onClick={handleSendTest} disabled={loading}>{loading ? 'Sending...' : 'Send'}</Button>
                </div>
                </div>
            </div>
            </div>
        )}
      </div>
    </div>
  );
}

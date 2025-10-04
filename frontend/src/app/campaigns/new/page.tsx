'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Loader2
} from 'lucide-react';

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface Account {
  id: number;
  name: string;
  client_email: string;
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
}

export default function NewCampaignPage() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(false);
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
    delay_ms: 200
  });
  const [testEmail, setTestEmail] = useState('');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [showTestModal, setShowTestModal] = useState(false);
  const [recipientLists, setRecipientLists] = useState<Array<{id: string, name: string, recipients: string[], createdAt: string}>>([]);
  const [selectedRecipientListId, setSelectedRecipientListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [templates, setTemplates] = useState<Array<{id: string, name: string, subject: string, body: string, createdAt: string}>>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);

  // Derived state
  const recipients = recipientsText.split('\n').filter(email => email.trim() && email.includes('@'));
  const totalSenders = users.filter(u => selectedAccounts.includes(u.service_account_id)).length;
  const queuedCount = recipients.length;
  const estDuration = Math.ceil(queuedCount / (config.workers * 10));

  // Load data on mount
  useEffect(() => {
    loadAccounts();
    loadUsers();
    loadTemplates();
    loadRecipientLists();
  }, []);

  // API Functions
  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`);
      setAccounts(Array.isArray(response.data) ? response.data : []);
      console.log('Accounts loaded:', response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setAccounts([]);
      showNotification('Failed to load accounts', 'error');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
      setUsers(Array.isArray(response.data) ? response.data : []);
      console.log('Users loaded:', response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
      showNotification('Failed to load users', 'error');
    }
  };

  const loadTemplates = () => {
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

  const loadRecipientLists = () => {
    try {
      if (typeof window !== 'undefined') {
        const savedLists = localStorage.getItem('recipient_lists');
        if (savedLists) {
          setRecipientLists(JSON.parse(savedLists));
        }
      }
    } catch (error) {
      console.error('Failed to load recipient lists:', error);
      setRecipientLists([]);
    }
  };

  const saveTemplate = () => {
    if (!config.name.trim() || !config.subject.trim() || !config.body_html.trim()) {
      showNotification('Please fill in all required fields before saving template', 'error');
      return;
    }

    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    try {
      const newTemplate = {
        id: `template_${Date.now()}`,
        name: templateName,
        subject: config.subject,
        body: config.body_html,
        createdAt: new Date().toISOString()
      };

      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('email_templates', JSON.stringify(updatedTemplates));
      }
      
      showNotification('Template saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save template:', error);
      showNotification('Failed to save template', 'error');
    }
  };

  const loadTemplate = (template: any) => {
    setConfig(prev => ({
      ...prev,
      subject: template.subject,
      body_html: template.body
    }));
    showNotification(`Template "${template.name}" loaded`, 'info');
    setShowTemplateModal(false);
  };

  const deleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('email_templates', JSON.stringify(updatedTemplates));
      }
      
      showNotification('Template deleted', 'success');
    }
  };

  const saveRecipientList = () => {
    if (!newListName.trim()) {
      showNotification('Please enter a name for the recipient list', 'error');
      return;
    }

    if (recipients.length === 0) {
      showNotification('Recipient list is empty', 'error');
      return;
    }

    try {
      const newList = {
        id: `list_${Date.now()}`,
        name: newListName.trim(),
        recipients: recipients,
        createdAt: new Date().toISOString()
      };

      const updatedLists = [...recipientLists, newList];
      setRecipientLists(updatedLists);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('recipient_lists', JSON.stringify(updatedLists));
      }
      
      showNotification('Recipient list saved successfully', 'success');
      setNewListName('');
      setShowRecipientModal(false);
    } catch (error) {
      console.error('Failed to save recipient list:', error);
      showNotification('Failed to save recipient list', 'error');
    }
  };

  const loadRecipientList = (list: any) => {
    setRecipientsText(list.recipients.join('\n'));
    setSelectedRecipientListId(list.id);
    showNotification(`Recipient list "${list.name}" loaded`, 'info');
    setShowRecipientModal(false);
  };

  const deleteRecipientList = (listId: string) => {
    if (confirm('Are you sure you want to delete this recipient list?')) {
      const updatedLists = recipientLists.filter(l => l.id !== listId);
      setRecipientLists(updatedLists);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('recipient_lists', JSON.stringify(updatedLists));
      }
      
      showNotification('Recipient list deleted', 'success');
    }
  };

  // Utility Functions
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Event Handlers
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

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      showNotification('Please enter a test email address', 'error');
      return;
    }

    if (selectedAccounts.length === 0) {
      showNotification('Please select at least one account', 'error');
      return;
    }

    if (!config.subject.trim()) {
      showNotification('Please enter a subject', 'error');
      return;
    }

    if (!config.body_html.trim()) {
      showNotification('Please enter email content', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/test-email/`, {
        recipient_email: testEmail,
        subject: `[TEST] ${config.subject}`,
        body_html: config.body_html,
        body_plain: stripHtml(config.body_html),
        from_name: config.from_name,
        sender_account_id: selectedAccounts[0]
      });

      showNotification(`Test email sent to ${testEmail}`, 'success');
      setShowTestModal(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to send test email';
      showNotification(`Test failed: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!config.name.trim()) {
      showNotification('Please enter a campaign name', 'error');
      return;
    }

    if (!config.subject.trim()) {
      showNotification('Please enter a subject', 'error');
      return;
    }

    if (!config.body_html.trim()) {
      showNotification('Please enter email content', 'error');
      return;
    }

    if (selectedAccounts.length === 0) {
      showNotification('Please select at least one account', 'error');
      return;
    }

    if (recipients.length === 0) {
      showNotification('Please add at least one recipient', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: config.name,
        subject: config.subject,
        body_html: config.body_html,
        body_plain: stripHtml(config.body_html),
        from_name: config.from_name,
        recipients: recipients.map(email => ({ email, variables: {} })),
        sender_account_ids: selectedAccounts,
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: config.daily_limit,
        concurrency: config.workers
      };

      const response = await axios.post(`${API_URL}/api/v1/campaigns/`, payload);
      
      showNotification(`Campaign created successfully! ID: ${response.data.id}`, 'success');
      router.push('/campaigns');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to create campaign';
      showNotification(`Campaign creation failed: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Campaign</h1>
          <p className="text-gray-600 mt-2">Advanced campaign builder — multi-account, high-speed sending</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Active accounts <span className="font-semibold text-blue-600">{accounts.length}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadAccounts}>
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
          <AlertDescription className={
            notification.type === 'success' ? 'text-green-800' :
            notification.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }>
            {notification.message}
          </AlertDescription>
        </Alert>
      ))}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Column - Accounts & Recipients */}
        <div className="space-y-6">
          
          {/* Accounts Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Accounts ({accounts.length})
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
                  <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => handleAccountToggle(account.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {account.name || account.client_email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {account.client_email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {account.total_users || 0} users
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No accounts available. Add accounts first.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recipients Panel */}
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
                  <Upload className="h-4 w-4 mr-2" />
                  Manage Lists
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="recipients">Email Addresses (one per line)</Label>
                  <Textarea
                    id="recipients"
                    placeholder="recipient1@example.com&#10;recipient2@example.com&#10;recipient3@example.com"
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    rows={8}
                    className="mt-1"
                  />
                </div>
                
                {recipients.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <p>Valid recipients: {recipients.length}</p>
                    <p>Invalid entries: {recipientsText.split('\n').length - recipients.length}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Campaign Configuration */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Campaign Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="Enter campaign name"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    placeholder="Enter sender name"
                    value={config.from_name}
                    onChange={(e) => setConfig(prev => ({ ...prev, from_name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject"
                  value={config.subject}
                  onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="daily-limit">Daily Limit</Label>
                  <Input
                    id="daily-limit"
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
                  <Label htmlFor="delay">Delay (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={config.delay_ms}
                    onChange={(e) => setConfig(prev => ({ ...prev, delay_ms: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Composer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Composer
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowVariablesModal(true)}
                  >
                    Manage Variables
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveTemplate}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTemplateModal(true)}
                  >
                    Load Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-body">Email Body (HTML)</Label>
                  <Textarea
                    id="email-body"
                    placeholder="Enter your email content here... You can use HTML tags for formatting."
                    value={config.body_html}
                    onChange={(e) => setConfig(prev => ({ ...prev, body_html: e.target.value }))}
                    rows={12}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Actions */}
        <div className="space-y-6">
          
          {/* Stats Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Campaign Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{queuedCount}</div>
                  <div className="text-sm text-gray-600">Recipients</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-green-600">{totalSenders}</div>
                    <div className="text-xs text-gray-600">Active Senders</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-600">{estDuration}m</div>
                    <div className="text-xs text-gray-600">Est. Duration</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Selected Accounts:</span>
                    <span className="font-medium">{selectedAccounts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Daily Limit:</span>
                    <span className="font-medium">{config.daily_limit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Workers:</span>
                    <span className="font-medium">{config.workers}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="text-xs text-gray-500 text-center">
                Campaign will be created in DRAFT status.<br />
                Go to Campaigns page to launch.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-email">Test Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSendTest}
                  disabled={loading || !testEmail.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Test'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTestModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Load Template</h3>
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded mb-2">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.subject}</div>
                      <div className="text-xs text-gray-400">{new Date(template.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => loadTemplate(template)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No templates saved yet
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowTemplateModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipient Lists Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Manage Recipient Lists</h3>
            
            <div className="space-y-4">
              {/* Save Current List */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Save Current Recipients</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <Button onClick={saveRecipientList} disabled={!newListName.trim()}>
                    Save
                  </Button>
                </div>
              </div>

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
                          onClick={() => loadRecipientList(list)}
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteRecipientList(list.id)}
                        >
                          Delete
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

              <div className="flex justify-end">
                <Button onClick={() => setShowRecipientModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Email Variables</h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">Available variables you can use in your email:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>{'{{name}}'}</code> - Recipient's name</li>
                  <li><code>{'{{email}}'}</code> - Recipient's email</li>
                  <li><code>{'{{company}}'}</code> - Company name</li>
                  <li><code>{'{{date}}'}</code> - Current date</li>
                </ul>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowVariablesModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
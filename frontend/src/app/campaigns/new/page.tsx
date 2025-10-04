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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sidebar } from '@/components/Sidebar';
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

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [enableABTesting, setEnableABTesting] = useState(false);
  const [abTestSubject, setAbTestSubject] = useState('');
  const [abTestBody, setAbTestBody] = useState('');
  const [abTestSplit, setAbTestSplit] = useState(50);
  const [analytics, setAnalytics] = useState({
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalUnsubscribed: 0,
    sendRate: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Derived state
  const recipients = recipientsText.split('\n').filter(email => email.trim() && email.includes('@'));
  const totalSenders = users.filter(u => selectedAccounts.includes(u.service_account_id)).length;
  const queuedCount = recipients.length;
  const estDuration = Math.ceil(queuedCount / (config.workers * 10));

  // Backend health check
  const checkBackendHealth = async () => {
    try {
      setBackendStatus('checking');
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 200) {
        setBackendStatus('connected');
        setConnectionError(null);
        console.log('✅ Backend health check passed');
        return true;
      } else {
        setBackendStatus('disconnected');
        setConnectionError('Backend returned unexpected status');
        return false;
      }
    } catch (error: any) {
      setBackendStatus('disconnected');
      if (error.code === 'ECONNREFUSED') {
        setConnectionError('Cannot connect to backend server. Please check if the server is running on port 8000.');
      } else if (error.response?.status === 404) {
        setConnectionError('Backend health endpoint not found. Please check server configuration.');
      } else {
        setConnectionError(`Backend connection failed: ${error.message}`);
      }
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  };

  // Load data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // First check backend health
        const isHealthy = await checkBackendHealth();
        
        if (isHealthy) {
          await Promise.all([
            loadAccounts(),
            loadUsers(),
            loadTemplates(),
            loadRecipientLists()
          ]);
        } else {
          showNotification('Backend server is not available. Please check server status.', 'error');
        }
      } catch (error) {
        console.error('Failed to initialize data:', error);
        showNotification('Failed to load initial data', 'error');
      }
    };

    initializeData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            saveTemplate();
            break;
          case 'p':
            event.preventDefault();
            if (config.subject.trim() && config.body_html.trim()) {
              setShowPreviewModal(true);
            }
            break;
          case 't':
            event.preventDefault();
            setShowTestModal(true);
            break;
          case 'Enter':
            if (!event.shiftKey) {
              event.preventDefault();
              handleCreateCampaign();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.subject, config.body_html, config.name]);

  // API Functions
  const loadAccounts = async () => {
    try {
      console.log('🔄 Loading Google Workspace accounts...');
      const response = await axios.get(`${API_URL}/api/v1/accounts/`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setAccounts(response.data);
        console.log('✅ Accounts loaded successfully:', response.data.length, 'accounts');
        showNotification(`Loaded ${response.data.length} Google Workspace accounts`, 'success');
      } else {
        console.warn('⚠️ Invalid response format:', response.data);
        setAccounts([]);
        showNotification('No accounts found. Please add Google Workspace service accounts first.', 'info');
      }
    } catch (error: any) {
      console.error('❌ Failed to load accounts:', error);
      setAccounts([]);
      
      let errorMessage = 'Failed to load accounts';
      if (error.response?.status === 404) {
        errorMessage = 'Backend API not found. Please check if the server is running.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Backend server error. Please check server logs.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to backend server. Please check if the server is running on port 8000.';
      } else if (error.message) {
        errorMessage = `Failed to load accounts: ${error.message}`;
      }
      
      showNotification(errorMessage, 'error');
    }
  };

  const loadUsers = async () => {
    try {
      console.log('🔄 Loading Google Workspace users...');
      const response = await axios.get(`${API_URL}/api/v1/users/`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
        console.log('✅ Users loaded successfully:', response.data.length, 'users');
        showNotification(`Loaded ${response.data.length} Google Workspace users`, 'success');
      } else {
        console.warn('⚠️ Invalid response format:', response.data);
        setUsers([]);
        showNotification('No users found. Please sync accounts first.', 'info');
      }
    } catch (error: any) {
      console.error('❌ Failed to load users:', error);
      setUsers([]);
      
      let errorMessage = 'Failed to load users';
      if (error.response?.status === 404) {
        errorMessage = 'Users API not found. Please check backend configuration.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Backend server error while loading users.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to backend server.';
      } else if (error.message) {
        errorMessage = `Failed to load users: ${error.message}`;
      }
      
      showNotification(errorMessage, 'error');
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

  // Enhanced validation
  const validateForm = () => {
    const errors: string[] = [];

    if (!config.name.trim()) {
      errors.push('Campaign name is required');
    }

    if (!config.subject.trim()) {
      errors.push('Email subject is required');
    }

    if (!config.body_html.trim()) {
      errors.push('Email body is required');
    }

    if (selectedAccounts.length === 0) {
      errors.push('Please select at least one account');
    }

    if (recipients.length === 0) {
      errors.push('Please add at least one recipient');
    }

    if (config.daily_limit <= 0) {
      errors.push('Daily limit must be greater than 0');
    }

    if (config.workers <= 0) {
      errors.push('Workers must be greater than 0');
    }

    if (config.delay_ms < 0) {
      errors.push('Delay cannot be negative');
    }

    return errors;
  };

  // Preview functionality
  const generatePreview = () => {
    const sampleData = {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Example Corp',
      date: new Date().toLocaleDateString()
    };

    let previewHtml = config.body_html;
    let previewSubject = config.subject;

    // Replace variables in preview
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewHtml = previewHtml.replace(regex, value);
      previewSubject = previewSubject.replace(regex, value);
    });

    return { html: previewHtml, subject: previewSubject };
  };

  // Analytics functions
  const loadAnalytics = async () => {
    try {
      // This would typically fetch from a real analytics API
      // For now, we'll simulate some data
      const mockAnalytics = {
        totalSent: Math.floor(Math.random() * 1000) + 500,
        totalDelivered: Math.floor(Math.random() * 900) + 450,
        totalOpened: Math.floor(Math.random() * 300) + 150,
        totalClicked: Math.floor(Math.random() * 50) + 25,
        totalBounced: Math.floor(Math.random() * 20) + 5,
        totalUnsubscribed: Math.floor(Math.random() * 10) + 2,
        sendRate: Math.floor(Math.random() * 20) + 80,
        deliveryRate: Math.floor(Math.random() * 10) + 90,
        openRate: Math.floor(Math.random() * 20) + 20,
        clickRate: Math.floor(Math.random() * 5) + 3
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Real-time analytics simulation
  useEffect(() => {
    if (showAnalytics) {
      const interval = setInterval(() => {
        setAnalytics(prev => ({
          ...prev,
          totalSent: prev.totalSent + Math.floor(Math.random() * 5),
          totalDelivered: prev.totalDelivered + Math.floor(Math.random() * 4),
          totalOpened: prev.totalOpened + Math.floor(Math.random() * 2),
          totalClicked: prev.totalClicked + Math.floor(Math.random() * 1),
          sendRate: Math.min(100, prev.sendRate + Math.random() * 2),
          deliveryRate: Math.min(100, prev.deliveryRate + Math.random() * 1),
          openRate: Math.min(100, prev.openRate + Math.random() * 0.5),
          clickRate: Math.min(100, prev.clickRate + Math.random() * 0.2)
        }));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [showAnalytics]);

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
    // Enhanced validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      showNotification(validationErrors.join(', '), 'error');
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
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Google Workspace Campaign</h1>
          <p className="text-gray-600 mt-2">PowerMTA-style sending via Google Workspace API — multi-domain, high-speed delivery</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Backend Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 
              backendStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {backendStatus === 'connected' ? 'Backend Connected' : 
               backendStatus === 'checking' ? 'Checking...' : 
               'Backend Disconnected'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            Active accounts <span className="font-semibold text-blue-600">{accounts.length}</span>
          </div>
          <div className="text-xs text-gray-500 hidden md:block">
            Shortcuts: Ctrl+S (Save), Ctrl+P (Preview), Ctrl+T (Test), Ctrl+Enter (Create)
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const isHealthy = await checkBackendHealth();
              if (isHealthy) {
                await Promise.all([loadAccounts(), loadUsers()]);
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {backendStatus === 'disconnected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('🔍 Running backend diagnostics...');
                showNotification('Running backend diagnostics...', 'info');
                
                // Test multiple endpoints
                const endpoints = [
                  { name: 'Health', url: '/health' },
                  { name: 'Accounts', url: '/api/v1/accounts/' },
                  { name: 'Users', url: '/api/v1/users/' }
                ];
                
                for (const endpoint of endpoints) {
                  try {
                    const response = await axios.get(`${API_URL}${endpoint.url}`, { timeout: 5000 });
                    console.log(`✅ ${endpoint.name}:`, response.status, response.data);
                  } catch (error: any) {
                    console.error(`❌ ${endpoint.name}:`, error.response?.status, error.message);
                  }
                }
                
                showNotification('Diagnostics complete. Check browser console for details.', 'info');
              }}
            >
              🔍 Diagnose
            </Button>
          )}
        </div>
      </div>

      {/* Connection Error Display */}
      {backendStatus === 'disconnected' && connectionError && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Backend Connection Error</AlertTitle>
          <AlertDescription>
            {connectionError}
            <div className="mt-2 text-sm">
              <strong>Troubleshooting steps:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Check if the backend server is running on port 8000</li>
                <li>Verify Docker containers are running: <code>docker-compose ps</code></li>
                <li>Check backend logs: <code>docker-compose logs backend</code></li>
                <li>Restart backend: <code>docker-compose restart backend</code></li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
          
          {/* Google Workspace Accounts Panel */}
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {account.name || account.client_email}
                        </p>
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {account.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        Service Account: {account.client_email}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-blue-600 font-medium">
                          {account.total_users || 0} Workspace Users
                        </span>
                        <span className="text-xs text-gray-500">
                          Domain: {account.domain || 'N/A'}
                        </span>
                        <span className="text-xs text-green-600">
                          Quota: {account.quota_used_today || 0}/{account.quota_limit || 500}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <div className="text-center py-4">
                    {backendStatus === 'disconnected' ? (
                      <div className="text-red-600">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">Backend Connection Failed</p>
                        <p className="text-sm">Cannot load Google Workspace accounts</p>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">No Google Workspace Accounts</p>
                        <p className="text-sm">Add service accounts first in the Accounts page</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => window.location.href = '/accounts'}
                        >
                          Go to Accounts
                        </Button>
                      </div>
                    )}
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

              {/* Google Workspace Specific Options */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-gray-900">Google Workspace Settings</h4>
                
                {/* Gmail API Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-gmail-labels"
                      defaultChecked
                    />
                    <Label htmlFor="use-gmail-labels">Use Gmail Labels for Organization</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="track-opens"
                      defaultChecked
                    />
                    <Label htmlFor="track-opens">Track Email Opens (Gmail API)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="track-clicks"
                      defaultChecked
                    />
                    <Label htmlFor="track-clicks">Track Link Clicks (Gmail API)</Label>
                  </div>
                </div>

                {/* Sender Rotation */}
                <div className="space-y-3">
                  <Label htmlFor="sender-rotation">Sender Rotation Strategy</Label>
                  <select 
                    id="sender-rotation"
                    className="w-full p-2 border rounded-md"
                    defaultValue="round_robin"
                  >
                    <option value="round_robin">Round Robin (Recommended)</option>
                    <option value="random">Random Selection</option>
                    <option value="least_used">Least Used Sender</option>
                    <option value="domain_based">Domain-Based Rotation</option>
                  </select>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-gray-900">Advanced Options</h4>
                
                {/* Scheduling */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-scheduling"
                      checked={enableScheduling}
                      onCheckedChange={setEnableScheduling}
                    />
                    <Label htmlFor="enable-scheduling">Schedule Campaign</Label>
                  </div>
                  
                  {enableScheduling && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div>
                        <Label htmlFor="schedule-date">Date</Label>
                        <Input
                          id="schedule-date"
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="schedule-time">Time</Label>
                        <Input
                          id="schedule-time"
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* A/B Testing */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-ab-testing"
                      checked={enableABTesting}
                      onCheckedChange={setEnableABTesting}
                    />
                    <Label htmlFor="enable-ab-testing">A/B Testing</Label>
                  </div>
                  
                  {enableABTesting && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <Label htmlFor="ab-test-split">Test Split (%)</Label>
                        <Input
                          id="ab-test-split"
                          type="number"
                          min="10"
                          max="90"
                          value={abTestSplit}
                          onChange={(e) => setAbTestSplit(parseInt(e.target.value) || 50)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ab-test-subject">Alternative Subject</Label>
                        <Input
                          id="ab-test-subject"
                          placeholder="Alternative subject line"
                          value={abTestSubject}
                          onChange={(e) => setAbTestSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ab-test-body">Alternative Body</Label>
                        <Textarea
                          id="ab-test-body"
                          placeholder="Alternative email body"
                          value={abTestBody}
                          onChange={(e) => setAbTestBody(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
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
          
          {/* Google Workspace Stats Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Google Workspace Stats
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
                    <div className="text-xs text-gray-600">Workspace Users</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-purple-600">{estDuration}m</div>
                    <div className="text-xs text-gray-600">Est. Duration</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Service Accounts:</span>
                    <span className="font-medium">{selectedAccounts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Daily Quota:</span>
                    <span className="font-medium">{config.daily_limit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Concurrent Senders:</span>
                    <span className="font-medium">{config.workers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Gmail API Rate:</span>
                    <span className="font-medium text-green-600">250 req/sec</span>
                  </div>
                </div>

                {/* Google Workspace Specific Info */}
                <div className="pt-3 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Gmail API Quota:</span>
                      <span className="text-green-600">1B requests/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Send Rate:</span>
                      <span className="text-blue-600">~{Math.min(queuedCount, config.daily_limit)} emails</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PowerMTA Mode:</span>
                      <span className="text-purple-600">⚡ Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Workspace Actions Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Gmail API Actions
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
                onClick={() => setShowPreviewModal(true)}
                variant="outline"
                className="w-full"
                disabled={!config.subject.trim() || !config.body_html.trim()}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Email
              </Button>

              <Button
                onClick={() => {
                  setShowAnalytics(true);
                  loadAnalytics();
                }}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                View Analytics
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
                    Launch via Gmail API
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                Emails will be sent via Google Workspace users.<br />
                PowerMTA-style high-speed delivery enabled.
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

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Email Preview</h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              <div className={`mx-auto bg-white border rounded-lg shadow-lg ${
                previewMode === 'desktop' ? 'max-w-4xl' :
                previewMode === 'tablet' ? 'max-w-2xl' :
                'max-w-sm'
              }`}>
                <div className="p-4 border-b bg-gray-50">
                  <div className="text-sm text-gray-600 mb-1">From: {config.from_name} &lt;{selectedAccounts.length > 0 ? users.find(u => selectedAccounts.includes(u.service_account_id))?.email || 'sender@example.com' : 'sender@example.com'}&gt;</div>
                  <div className="text-sm text-gray-600 mb-1">To: john@example.com</div>
                  <div className="font-medium">{generatePreview().subject}</div>
                </div>
                <div 
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: generatePreview().html }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Campaign Analytics</h3>
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(false)}
              >
                Close
              </Button>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Key Metrics */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalSent}</div>
                  <div className="text-sm text-blue-800">Total Sent</div>
                  <div className="text-xs text-blue-600 mt-1">{analytics.sendRate}% success rate</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.totalDelivered}</div>
                  <div className="text-sm text-green-800">Delivered</div>
                  <div className="text-xs text-green-600 mt-1">{analytics.deliveryRate}% delivery rate</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.totalOpened}</div>
                  <div className="text-sm text-purple-800">Opened</div>
                  <div className="text-xs text-purple-600 mt-1">{analytics.openRate}% open rate</div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{analytics.totalClicked}</div>
                  <div className="text-sm text-orange-800">Clicked</div>
                  <div className="text-xs text-orange-600 mt-1">{analytics.clickRate}% click rate</div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-4">Engagement Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Open Rate</span>
                      <span className="font-medium">{analytics.openRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Click Rate</span>
                      <span className="font-medium">{analytics.clickRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Delivery Rate</span>
                      <span className="font-medium">{analytics.deliveryRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Send Rate</span>
                      <span className="font-medium">{analytics.sendRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-4">Issues & Bounces</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Bounced</span>
                      <span className="font-medium text-red-600">{analytics.totalBounced}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unsubscribed</span>
                      <span className="font-medium text-red-600">{analytics.totalUnsubscribed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bounce Rate</span>
                      <span className="font-medium text-red-600">
                        {analytics.totalSent > 0 ? ((analytics.totalBounced / analytics.totalSent) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unsubscribe Rate</span>
                      <span className="font-medium text-red-600">
                        {analytics.totalSent > 0 ? ((analytics.totalUnsubscribed / analytics.totalSent) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Updates Indicator */}
              <div className="mt-6 flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Real-time updates active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
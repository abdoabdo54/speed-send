'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { serviceAccountsApi, campaignsApi } from '@/lib/api';
import { ArrowLeft, Send, TestTube, Mail } from 'lucide-react';

export default function SimpleSendPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Simple form data
  const [campaignName, setCampaignName] = useState('');
  const [fromName, setFromName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      console.log('🔄 Loading accounts...');
      const response = await serviceAccountsApi.list();
      console.log('✅ Accounts loaded:', response.data);
      setAccounts(response.data);
    } catch (error) {
      console.error('❌ Failed to load accounts:', error);
      alert('Failed to load accounts: ' + (error as any)?.message || 'Unknown error');
    }
  };

  const sendTest = async () => {
    if (!testEmail || !subject || !message) {
      alert('Please fill in test email, subject, and message');
      return;
    }

    if (accounts.length === 0) {
      alert('No accounts available. Please add an account first.');
      return;
    }

    setLoading(true);
    try {
      const testData = {
        name: `Test - ${campaignName || 'Campaign'}`,
        subject: `[TEST] ${subject}`,
        body_html: message,
        from_name: fromName || 'Test Sender',
        recipients: [{ email: testEmail, variables: {} }],
        sender_account_ids: [accounts[0].id],
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: 100,
        concurrency: 1,
        is_test: true,
        test_recipients: [testEmail]
      };

      await campaignsApi.create(testData);
      alert('✅ Test email sent successfully!');
    } catch (error: any) {
      alert('❌ Test failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async () => {
    if (!campaignName || !subject || !message || !recipients) {
      alert('Please fill in all required fields');
      return;
    }

    if (accounts.length === 0) {
      alert('No accounts available. Please add an account first.');
      return;
    }

    setLoading(true);
    try {
      const recipientList = recipients.split('\n').filter(email => email.trim()).map(email => ({
        email: email.trim(),
        variables: {}
      }));

      if (recipientList.length === 0) {
        alert('Please add at least one recipient');
        setLoading(false);
        return;
      }

      const allAccountIds = accounts.map(acc => acc.id);

      const campaignData = {
        name: campaignName,
        subject: subject,
        body_html: message,
        from_name: fromName || 'Campaign Sender',
        recipients: recipientList,
        sender_account_ids: allAccountIds,
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: 10000,
        concurrency: 100,
        is_test: false,
        test_recipients: []
      };

      await campaignsApi.create(campaignData);
      alert('✅ Campaign created successfully!');
      router.push('/campaigns');
    } catch (error: any) {
      alert('Failed to create campaign: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/campaigns')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Simple Email Sender</h1>
                <p className="text-muted-foreground">Send emails quickly and easily</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/campaigns')}>
                Cancel
              </Button>
              <Button onClick={sendTest} disabled={loading} variant="outline">
                {loading ? 'Sending...' : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Send Test
                  </>
                )}
              </Button>
              <Button onClick={sendCampaign} disabled={loading}>
                {loading ? 'Sending...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Campaign
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Account Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Status
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadAccounts}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-red-600 font-medium">⚠️ No accounts configured</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please add accounts first in the Accounts section
                  </p>
                  <Button 
                    className="mt-3" 
                    onClick={() => router.push('/accounts')}
                  >
                    Add Accounts
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {accounts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Accounts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {accounts.reduce((sum, acc) => sum + (acc.total_users || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Senders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      Ready
                    </div>
                    <div className="text-sm text-muted-foreground">Auto-selected</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simple Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>📝 Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Campaign Name *
                    </label>
                    <Input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., Newsletter October 2025"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      From Name *
                    </label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="e.g., Support Team"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Subject Line *
                    </label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Test Email */}
              <Card>
                <CardHeader>
                  <CardTitle>🧪 Test Email</CardTitle>
                  <CardDescription>Send a test before launching</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Test Email Address
                    </label>
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your-email@example.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Message */}
              <Card>
                <CardHeader>
                  <CardTitle>✉️ Message Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Message (HTML) *
                    </label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="<h1>Hello!</h1><p>Your message here...</p>"
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle>👥 Recipients</CardTitle>
                  <CardDescription>One email per line</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Addresses *
                    </label>
                    <Textarea
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder={'user1@example.com\nuser2@example.com\nuser3@example.com'}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="text-sm text-muted-foreground mt-2">
                    📊 {recipients.split('\n').filter(l => l.trim()).length} recipients
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SendPage() {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Simple form
  const [name, setName] = useState('');
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
      const response = await fetch('/api/v1/accounts/');
      const data = await response.json();
      setAccounts(data);
      console.log('Accounts loaded:', data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const sendTest = async () => {
    if (!testEmail || !subject || !message) {
      alert('Please fill in test email, subject, and message');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/campaigns/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test - ${name}`,
          subject: `[TEST] ${subject}`,
          body_html: message,
          from_name: fromName,
          recipients: [{ email: testEmail, variables: {} }],
          sender_account_ids: accounts.map(acc => acc.id),
          is_test: true
        })
      });

      if (response.ok) {
        alert('✅ Test email sent!');
      } else {
        throw new Error('Test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('❌ Test failed: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async () => {
    if (!name || !subject || !message || !recipients) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const recipientList = recipients.split('\n').filter(email => email.trim()).map(email => ({
        email: email.trim(),
        variables: {}
      }));

      const response = await fetch('/api/v1/campaigns/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          body_html: message,
          from_name: fromName,
          recipients: recipientList,
          sender_account_ids: accounts.map(acc => acc.id),
          is_test: false
        })
      });

      if (response.ok) {
        alert('✅ Campaign sent!');
      } else {
        throw new Error('Campaign failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('❌ Campaign failed: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Email Sender</h1>
        
        {/* Account Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-red-600">No accounts available</p>
                <Button onClick={loadAccounts} className="mt-2">Refresh</Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-green-600 font-bold text-xl">{accounts.length} accounts ready</p>
                <p className="text-sm text-gray-600">Total senders: {accounts.reduce((sum, acc) => sum + (acc.total_users || 0), 0)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simple Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Campaign"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">From Name *</label>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Support Team"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Test Email</label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Message (HTML) *</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="<h1>Hello!</h1><p>Your message here...</p>"
                    rows={12}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Addresses *</label>
                  <Textarea
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                    rows={8}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {recipients.split('\n').filter(l => l.trim()).length} recipients
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <Button onClick={sendTest} disabled={loading} variant="outline">
            {loading ? 'Sending...' : 'Send Test'}
          </Button>
          <Button onClick={sendCampaign} disabled={loading}>
            {loading ? 'Sending...' : 'Send Campaign'}
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [fromName, setFromName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('');
  const [testEmail, setTestEmail] = useState('');

  // Get API URL
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return 'http://localhost:8000';
  };

  const API_URL = getApiUrl();

  useEffect(() => {
    loadAccounts();
    loadUsers();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`);
      setAccounts(response.data || []);
      console.log('Accounts loaded:', response.data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
      setUsers(response.data || []);
      console.log('Users loaded:', response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleAddUser = (userEmail: string) => {
    if (!userEmail) return;
    setRecipients(prev => prev ? `${prev}\n${userEmail}` : userEmail);
  };

  const handleSendTest = async () => {
    if (!testEmail || !subject || !message) {
      alert('Please fill: Test Email, Subject, Message');
      return;
    }

    if (accounts.length === 0) {
      alert('No accounts available. Add account first.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/v1/campaigns/`, {
        name: `TEST-${name || 'Campaign'}`,
        subject: `[TEST] ${subject}`,
        body_html: message,
        from_name: fromName || 'Test',
        recipients: [{ email: testEmail, variables: {} }],
        sender_account_ids: [accounts[0].id],
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: 100,
        concurrency: 1
      });
      alert('✅ Test email sent!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Test failed';
      alert('❌ ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!name || !subject || !message || !recipients) {
      alert('Please fill: Name, Subject, Message, Recipients');
      return;
    }

    if (accounts.length === 0) {
      alert('No accounts available. Add account first.');
      return;
    }

    const recipientList = recipients
      .split('\n')
      .map(e => e.trim())
      .filter(Boolean)
      .map(email => ({ email, variables: {} }));

    if (recipientList.length === 0) {
      alert('Add at least one recipient');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/v1/campaigns/`, {
        name,
        subject,
        body_html: message,
        from_name: fromName || 'Sender',
        recipients: recipientList,
        sender_account_ids: accounts.map(a => a.id),
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: 10000,
        concurrency: 100
      });
      alert('✅ Campaign created!');
      router.push('/campaigns');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed';
      alert('❌ ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Send Email Campaign</h1>
          <p className="text-gray-600">Simple bulk email sender</p>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-bold text-lg mb-3">Account Status</h2>
          {accounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-red-600 font-bold">⚠️ No accounts</p>
              <button
                onClick={() => router.push('/accounts')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{accounts.length}</div>
                <div className="text-sm text-gray-600">Accounts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {accounts.reduce((sum, acc) => sum + (acc.total_users || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Senders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">Ready</div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Campaign Details */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">Campaign Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Campaign"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">From Name *</label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Support Team"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Test Email</label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Google Users */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">Google Workspace Users</h2>
              <div className="max-h-64 overflow-auto border rounded p-2">
                {users.length === 0 ? (
                  <p className="text-gray-500 text-sm">No users. Sync accounts first.</p>
                ) : (
                  users.map((user: any) => (
                    <div key={user.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-sm">{user.primary_email || user.email}</span>
                      <button
                        onClick={() => handleAddUser(user.primary_email || user.email)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Message */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">Email Message</h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="<h1>Hello!</h1><p>Your message...</p>"
                rows={12}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            {/* Recipients */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">Recipients</h2>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="user1@example.com&#10;user2@example.com"
                rows={8}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-sm text-gray-600 mt-2">
                {recipients.split('\n').filter(Boolean).length} recipients
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => router.push('/campaigns')}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSendTest}
            disabled={loading}
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Test'}
          </button>
          <button
            onClick={handleSendCampaign}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Send Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

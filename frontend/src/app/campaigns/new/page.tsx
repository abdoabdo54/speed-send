'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  
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
      setUsers(Array.isArray(response.data) ? response.data : []);
      console.log('Users loaded:', response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  };

  const toggleSender = (userEmail: string) => {
    setSelectedSenders(prev => 
      prev.includes(userEmail) 
        ? prev.filter(e => e !== userEmail)
        : [...prev, userEmail]
    );
  };

  const selectAllSenders = () => {
    if (!users || !Array.isArray(users)) return;
    setSelectedSenders(users.map((u: any) => u.primary_email || u.email));
  };

  const clearSenders = () => {
    setSelectedSenders([]);
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
    
    // Create detailed logging container
    const logContainer = document.createElement('div');
    logContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 20px;
      z-index: 9999;
      overflow-y: auto;
    `;
    
    const logContent = document.createElement('div');
    logContainer.appendChild(logContent);
    document.body.appendChild(logContainer);
    
    const log = (message: string, color = 'white') => {
      const line = document.createElement('div');
      line.style.color = color;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logContent.appendChild(line);
      console.log(message);
    };
    
    const closeLog = () => {
      document.body.removeChild(logContainer);
    };
    
    try {
      log('🚀 STARTING DIRECT TEST EMAIL (NO CAMPAIGN)', 'yellow');
      log(`API URL: ${API_URL}`, 'cyan');
      log(`Test Email: ${testEmail}`, 'cyan');
      log(`Subject: ${subject}`, 'cyan');
      log(`Message: ${message}`, 'cyan');
      log(`Accounts: ${JSON.stringify(accounts, null, 2)}`, 'cyan');
      
      // DIRECT EMAIL SENDING - No campaign creation
      log('📤 SENDING DIRECT EMAIL VIA GMAIL API...', 'yellow');
      
      // Use the direct Gmail API test endpoint
      const response = await axios.post(`${API_URL}/api/v1/test-email/`, {
        recipient_email: testEmail,
        subject: `[TEST] ${subject}`,
        body_html: message,
        body_plain: message.replace(/<[^>]*>/g, ''),
        from_name: fromName || 'Test',
        sender_account_id: accounts[0].id
      });
      
      log('✅ DIRECT EMAIL SENT!', 'green');
      log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'white');
      
      alert('✅ Test email sent directly via Gmail API!');
      
    } catch (err: any) {
      log('❌ ERROR OCCURRED', 'red');
      log(`Error Type: ${err.name}`, 'red');
      log(`Error Message: ${err.message}`, 'red');
      log(`Response Status: ${err?.response?.status}`, 'red');
      log(`Response Data: ${JSON.stringify(err?.response?.data, null, 2)}`, 'red');
      
      let msg = 'Test failed';
      if (err?.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else {
          msg = JSON.stringify(data);
        }
      } else if (err?.message) {
        msg = err.message;
      }
      
      log(`Final Error Message: ${msg}`, 'red');
      alert('❌ ' + msg);
    } finally {
      setLoading(false);
      log('🏁 TEST PROCESS COMPLETED', 'yellow');
      log('Click anywhere to close this log', 'cyan');
      
      // Add click to close
      logContainer.onclick = closeLog;
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

    if (selectedSenders.length === 0) {
      alert('⚠️ Please select at least one sender from Google Workspace Users!');
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
      console.log('=== CREATING CAMPAIGN ===');
      console.log('API URL:', API_URL);
      console.log('Accounts:', accounts);
      console.log('Selected Senders:', selectedSenders);
      console.log('Recipients count:', recipientList.length);
      
      const payload = {
        name,
        subject,
        body_html: message,
        body_plain: message.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text
        from_name: fromName || 'Sender',
        recipients: recipientList,
        sender_account_ids: accounts.map(a => a.id),
        sender_rotation: 'round_robin',
        custom_headers: {},
        attachments: [],
        rate_limit: 10000,
        concurrency: 100
      };
      
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(`${API_URL}/api/v1/campaigns/`, payload);
      console.log('✅ Campaign created:', response.data);
      
      // Campaign created in DRAFT status - ready for preparation and launch
      alert(`✅ Campaign created! ID: ${response.data.id}\n\nNow go to Campaigns page to prepare and launch.`);
      router.push('/campaigns');
    } catch (err: any) {
      console.error('=== CAMPAIGN ERROR ===');
      console.error('Full error:', err);
      console.error('Response status:', err?.response?.status);
      console.error('Response data:', err?.response?.data);
      
      let msg = 'Failed to create campaign';
      if (err?.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else {
          msg = JSON.stringify(data);
        }
      } else if (err?.message) {
        msg = err.message;
      }
      
      alert('❌ ' + msg);
      console.error('Final error message:', msg);
    } finally {
      setLoading(false);
    }
  };

  const totalSenders = accounts && Array.isArray(accounts) ? accounts.reduce((sum, acc) => sum + (acc.total_users || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🚀 Send Email Campaign</h1>
          <p className="text-gray-600">Select senders from Google Workspace, add recipients, and launch!</p>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-bold text-lg mb-3">📊 Sending Infrastructure</h2>
          {accounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-red-600 font-bold">⚠️ No accounts configured</p>
              <button
                onClick={() => router.push('/accounts')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-3xl font-bold text-blue-600">{accounts.length}</div>
                <div className="text-sm text-gray-600">Service Accounts</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-3xl font-bold text-green-600">{totalSenders}</div>
                <div className="text-sm text-gray-600">Available Senders</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-3xl font-bold text-purple-600">{selectedSenders.length}</div>
                <div className="text-sm text-gray-600">Selected Senders</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <div className="text-3xl font-bold text-yellow-600">
                  {recipients.split('\n').filter(Boolean).length}
                </div>
                <div className="text-sm text-gray-600">Recipients</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Form - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Campaign Setup */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4 flex items-center">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2">1</span>
                Campaign Setup
              </h2>
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
                  <label className="block text-sm font-medium mb-1">Email Message (HTML) *</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="<h1>Hello!</h1><p>Your message...</p>"
                    rows={8}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Test Email */}
            <div className="bg-yellow-50 rounded-lg shadow p-4 border-2 border-yellow-300">
              <h2 className="font-bold text-lg mb-4">🧪 Test Email</h2>
              <div className="space-y-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-3 py-2 border rounded"
                />
                <button
                  onClick={handleSendTest}
                  disabled={loading || !testEmail || !subject || !message}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  {loading ? 'Sending...' : '🧪 Send Test Email'}
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Select Senders */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold text-lg mb-4 flex items-center">
              <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2">2</span>
              Select Senders (Google Workspace)
            </h2>
            
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800 font-medium">
                ✅ These users will SEND emails via Gmail API
              </p>
              <p className="text-xs text-green-600 mt-1">
                Select users who will act as senders. More senders = faster sending!
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAllSenders}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Select All ({users.length})
              </button>
              <button
                onClick={clearSenders}
                className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>

            <div className="max-h-[600px] overflow-auto border rounded p-2">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No users synced</p>
                  <button
                    onClick={() => router.push('/accounts')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sync Accounts
                  </button>
                </div>
              ) : (
                users && Array.isArray(users) ? users.map((user: any) => {
                  const email = user.primary_email || user.email;
                  const isSelected = selectedSenders.includes(email);
                  return (
                    <div 
                      key={user.id} 
                      className={`flex items-center py-2 px-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                      }`}
                      onClick={() => toggleSender(email)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSender(email)}
                        className="mr-3 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{email}</div>
                        {user.full_name && (
                          <div className="text-xs text-gray-500">{user.full_name}</div>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-green-600 font-bold text-xs">✓ SENDER</span>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-4 text-gray-500">
                    No users available
                  </div>
                )
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm font-bold text-blue-900">
                📊 {selectedSenders.length} senders selected
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Tip: More senders = faster bulk sending (PowerMTA mode)
              </p>
            </div>
          </div>

          {/* Column 3: Recipients */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold text-lg mb-4 flex items-center">
              <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2">3</span>
              Recipients
            </h2>

            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm text-purple-800 font-medium">
                📧 These people will RECEIVE emails
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Add one email per line
              </p>
            </div>

            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="recipient1@example.com&#10;recipient2@example.com&#10;recipient3@example.com"
              rows={20}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
            />

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-bold text-gray-900">
                  📊 {recipients.split('\n').filter(Boolean).length} recipients
                </p>
              </div>

              <button
                onClick={handleSendCampaign}
                disabled={loading || !name || !subject || !message || !recipients || selectedSenders.length === 0}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg"
              >
                {loading ? 'Creating...' : '🚀 Create Campaign'}
              </button>

              {selectedSenders.length === 0 && (
                <p className="text-sm text-red-600 text-center font-medium">
                  ⚠️ Please select senders first!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

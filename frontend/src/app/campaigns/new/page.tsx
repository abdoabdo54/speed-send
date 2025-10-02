'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { accountsApi, campaignsApi } from '@/lib/api';
import { ArrowLeft, Send, TestTube, Upload, Plus, X } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Campaign data
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [returnPath, setReturnPath] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyPlain, setBodyPlain] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [senderRotation, setSenderRotation] = useState('round_robin');
  const [recipients, setRecipients] = useState('');
  const [customHeaders, setCustomHeaders] = useState<{key: string, value: string}[]>([]);
  const [isTest, setIsTest] = useState(false);
  const [testRecipients, setTestRecipients] = useState('');
  const [concurrency, setConcurrency] = useState(100);
  const [rateLimit, setRateLimit] = useState(10000);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await accountsApi.list();
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const parseRecipients = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const email = line.trim();
      return { email, variables: {} };
    });
  };

  const handleCreate = async () => {
    if (!name || !subject || !recipients || selectedAccounts.length === 0) {
      alert('Please fill in all required fields (Name, Subject, Recipients, Sender Accounts)');
      return;
    }

    setLoading(true);
    try {
      const parsedRecipients = parseRecipients(recipients);
      
      if (parsedRecipients.length === 0) {
        alert('Please add at least one recipient');
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = {};
      customHeaders.forEach(h => {
        if (h.key && h.value) headers[h.key] = h.value;
      });

      const campaignData = {
        name,
        subject,
        body_html: bodyHtml || undefined,
        body_plain: bodyPlain || undefined,
        from_name: fromName || undefined,
        from_email: fromEmail || undefined,
        reply_to: replyTo || undefined,
        return_path: returnPath || undefined,
        recipients: parsedRecipients,
        sender_account_ids: selectedAccounts,
        sender_rotation: senderRotation,
        custom_headers: headers,
        attachments: [],
        rate_limit: rateLimit,
        concurrency,
        is_test: isTest,
        test_recipients: isTest ? testRecipients.split('\n').filter(e => e.trim()) : []
      };

      await campaignsApi.create(campaignData);
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
        <div className="p-8 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/campaigns')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create New Campaign</h1>
                <p className="text-muted-foreground">Professional bulk email campaign builder</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/campaigns')}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Main Content - Single Page Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Campaign Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Summer Newsletter 2025"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject Line *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="concurrency">Concurrency</Label>
                      <Input
                        id="concurrency"
                        type="number"
                        value={concurrency}
                        onChange={(e) => setConcurrency(parseInt(e.target.value))}
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateLimit">Rate Limit (emails/hour)</Label>
                      <Input
                        id="rateLimit"
                        type="number"
                        value={rateLimit}
                        onChange={(e) => setRateLimit(parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sender Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Sender Configuration</CardTitle>
                  <CardDescription>Configure how emails are sent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      id="from-name"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="e.g., Support Team"
                    />
                  </div>

                  <div>
                    <Label htmlFor="from-email">From Email</Label>
                    <Input
                      id="from-email"
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="support@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reply-to">Reply-To</Label>
                    <Input
                      id="reply-to"
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="replies@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="return-path">Return-Path</Label>
                    <Input
                      id="return-path"
                      type="email"
                      value={returnPath}
                      onChange={(e) => setReturnPath(e.target.value)}
                      placeholder="bounces@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rotation">Sender Rotation</Label>
                    <Select value={senderRotation} onValueChange={setSenderRotation}>
                      <SelectTrigger id="rotation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                        <SelectItem value="sequential">Sequential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sender Accounts *</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {accounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No accounts available</p>
                      ) : (
                        accounts.map((account) => (
                          <div key={account.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`account-${account.id}`}
                              checked={selectedAccounts.includes(account.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAccounts([...selectedAccounts, account.id]);
                                } else {
                                  setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                                }
                              }}
                            />
                            <Label htmlFor={`account-${account.id}`} className="text-sm cursor-pointer">
                              {account.name} ({account.total_users} users)
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Headers */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Headers</CardTitle>
                  <CardDescription>Optional email headers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customHeaders.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        placeholder="Header name"
                        className="flex-1"
                      />
                      <Input
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        placeholder="Header value"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeHeader(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addHeader}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Header
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Message Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Message Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="body-html">HTML Body</Label>
                    <Textarea
                      id="body-html"
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      placeholder="<html>...</html>"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="body-plain">Plain Text Body (Fallback)</Label>
                    <Textarea
                      id="body-plain"
                      value={bodyPlain}
                      onChange={(e) => setBodyPlain(e.target.value)}
                      placeholder="Plain text version of your email"
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle>Recipients *</CardTitle>
                  <CardDescription>One email per line</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={recipients}
                    onChange={(e) => setRecipients(e.target.value)}
                    placeholder={'user1@example.com\nuser2@example.com\nuser3@example.com'}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {recipients.split('\n').filter(l => l.trim()).length} recipients
                  </p>
                </CardContent>
              </Card>

              {/* Test Mode */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Mode</CardTitle>
                  <CardDescription>Send to test recipients only</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="test-mode"
                      checked={isTest}
                      onCheckedChange={(checked) => setIsTest(checked as boolean)}
                    />
                    <Label htmlFor="test-mode" className="cursor-pointer">
                      Enable Test Mode
                    </Label>
                  </div>

                  {isTest && (
                    <div>
                      <Label htmlFor="test-recipients">Test Recipients</Label>
                      <Textarea
                        id="test-recipients"
                        value={testRecipients}
                        onChange={(e) => setTestRecipients(e.target.value)}
                        placeholder={'test1@example.com\ntest2@example.com'}
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

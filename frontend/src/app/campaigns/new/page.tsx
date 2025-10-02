'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { serviceAccountsApi, usersApi, campaignsApi } from '@/lib/api';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';

type Step = 'senders' | 'recipients' | 'compose' | 'review';

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('senders');
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_plain: '',
    sender_account_ids: [] as number[],
    recipients: [] as any[],
    sender_rotation: 'round_robin',
    rate_limit: 500,
    concurrency: 5,
  });
  
  const [recipientText, setRecipientText] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await serviceAccountsApi.list();
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const toggleAccount = (accountId: number) => {
    setCampaignData(prev => ({
      ...prev,
      sender_account_ids: prev.sender_account_ids.includes(accountId)
        ? prev.sender_account_ids.filter(id => id !== accountId)
        : [...prev.sender_account_ids, accountId]
    }));
  };

  const parseRecipients = () => {
    const lines = recipientText.split('\n').filter(line => line.trim());
    const recipients = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        email: parts[0],
        variables: {
          name: parts[1] || '',
          company: parts[2] || '',
        }
      };
    });
    setCampaignData(prev => ({ ...prev, recipients }));
  };

  const handleCreate = async () => {
    try {
      await campaignsApi.create(campaignData);
      router.push('/campaigns');
    } catch (error: any) {
      alert('Failed to create campaign: ' + (error.response?.data?.detail || error.message));
    }
  };

  const steps: Step[] = ['senders', 'recipients', 'compose', 'review'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create Campaign</h1>
                <p className="text-muted-foreground">Multi-step campaign builder</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex gap-2 mt-6">
              {steps.map((s, idx) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded ${
                    idx <= currentStepIndex ? 'bg-primary' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 'senders' && 'Step 1: Select Sender Accounts'}
                {step === 'recipients' && 'Step 2: Add Recipients'}
                {step === 'compose' && 'Step 3: Compose Email'}
                {step === 'review' && 'Step 4: Review & Launch'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Step 1: Senders */}
              {step === 'senders' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select one or more service accounts to send from. The system will rotate between available users.
                  </p>
                  
                  {accounts.map(account => (
                    <div
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        campaignData.sender_account_ids.includes(account.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.total_users} users • {account.domain}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={campaignData.sender_account_ids.includes(account.id)}
                          onChange={() => {}}
                          className="h-5 w-5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 2: Recipients */}
              {step === 'recipients' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Campaign Name</label>
                    <Input
                      placeholder="e.g., Summer Newsletter 2025"
                      value={campaignData.name}
                      onChange={e => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Recipients (one per line)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Format: email, name, company (CSV format)
                    </p>
                    <textarea
                      className="w-full h-64 p-3 text-sm border rounded-md font-mono"
                      placeholder="user@example.com, John Doe, Acme Corp&#10;jane@example.com, Jane Smith, Tech Inc"
                      value={recipientText}
                      onChange={e => setRecipientText(e.target.value)}
                      onBlur={parseRecipients}
                    />
                  </div>
                  
                  {campaignData.recipients.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      ✅ {campaignData.recipients.length} recipients parsed
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Compose */}
              {step === 'compose' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject Line</label>
                    <Input
                      placeholder="Email subject (supports {{variables}})"
                      value={campaignData.subject}
                      onChange={e => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Plain Text Body</label>
                    <textarea
                      className="w-full h-32 p-3 text-sm border rounded-md"
                      placeholder="Plain text version of your email..."
                      value={campaignData.body_plain}
                      onChange={e => setCampaignData(prev => ({ ...prev, body_plain: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">HTML Body</label>
                    <textarea
                      className="w-full h-64 p-3 text-sm border rounded-md font-mono"
                      placeholder="<html><body>Your HTML email here. Use {{name}}, {{company}} for personalization.</body></html>"
                      value={campaignData.body_html}
                      onChange={e => setCampaignData(prev => ({ ...prev, body_html: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Rate Limit (emails/hour)</label>
                      <Input
                        type="number"
                        value={campaignData.rate_limit}
                        onChange={e => setCampaignData(prev => ({ ...prev, rate_limit: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Concurrency</label>
                      <Input
                        type="number"
                        value={campaignData.concurrency}
                        onChange={e => setCampaignData(prev => ({ ...prev, concurrency: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 'review' && (
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <p className="font-medium">Campaign: {campaignData.name}</p>
                    <p className="text-sm text-muted-foreground">Subject: {campaignData.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sender Accounts</p>
                      <p className="font-medium">{campaignData.sender_account_ids.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recipients</p>
                      <p className="font-medium">{campaignData.recipients.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rate Limit</p>
                      <p className="font-medium">{campaignData.rate_limit}/hour</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Concurrency</p>
                      <p className="font-medium">{campaignData.concurrency}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm font-medium">⚠️ Ready to Launch</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Campaign will be created in DRAFT mode. You can start it from the campaigns page.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const idx = steps.indexOf(step);
                    if (idx > 0) setStep(steps[idx - 1]);
                  }}
                  disabled={currentStepIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentStepIndex < steps.length - 1 ? (
                  <Button
                    onClick={() => {
                      const idx = steps.indexOf(step);
                      setStep(steps[idx + 1]);
                    }}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleCreate}>
                    <Send className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { UserSelector } from '@/components/drafts/UserSelector';
import { DraftEditor } from '@/components/drafts/DraftEditor';
import { DraftActionsPanel } from '@/components/drafts/DraftActionsPanel';
import { NewFeature } from '@/components/drafts/NewFreature';
import { Toast } from '@/components/shared/Toast';

// Define types for our data
interface User {
  id: string;
  name: string;
  email: string;
}

interface Account {
  id: string;
  name: string;
  users: User[];
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  body_html: string;
  body_plain: string;
  attachments: any[];
}

// Utility function for fetch with retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && response.status <= 599) {
        throw new Error(`Server error: ${response.status}`);
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}. Retrying in ${backoff}ms...`, error);
      if (i === retries - 1) {
        throw error;
      }
      await new Promise(res => setTimeout(res, backoff));
      backoff *= 2;
    }
  }
}

export default function DraftEditorPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (params.id !== 'new') {
            const campaignData = await fetchWithRetry(`http://localhost:8000/api/campaigns/${params.id}`, {});
            setCampaign(campaignData);
        }

        const accountsData = await fetchWithRetry('http://localhost:8000/api/accounts', {});
        setAccounts(accountsData);

      } catch (error: any) {
        console.error("Failed to load page data:", error);
        setToastInfo({ message: error.message || 'Failed to load data.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);
  
  const handleSendTestEmail = useCallback(async (recipient_email: string) => {
    if (!campaign) {
        setToastInfo({ message: 'Campaign data not available.', type: 'error' });
        return;
    }
    
    const requestBody = {
        recipient_email,
        subject: campaign.subject,
        body_html: campaign.body_html,
        body_plain: campaign.body_plain,
        from_name: campaign.from_name,
        sender_account_id: 'some-service-account-id', // This should be dynamically selected
    };

    try {
        await fetchWithRetry('http://localhost:8000/api/test-email/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        setToastInfo({ message: `Test email sent to ${recipient_email}`, type: 'success' });
    } catch (error: any) {
        setToastInfo({ message: error.message || 'Failed to send test email.', type: 'error' });
    }
}, [campaign]);

  return (
    <div className="bg-gray-50/50 min-h-screen">
        {toastInfo && (
            <Toast
            message={toastInfo.message}
            type={toastInfo.type}
            onClose={() => setToastInfo(null)}
            />
        )}
      <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <Link href="/drafts" className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Draft Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{
            params.id === 'new' ? 'Create New Draft Campaign' : 'Edit Draft Campaign'
            }</h1>
        </header>

        {loading ? (
            <div className="text-center py-20">
                <p className="text-gray-500">Loading campaign data...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-8">
                <UserSelector accounts={accounts} />
                <NewFeature />
            </div>
    
            <div className="lg:col-span-6">
                <DraftEditor campaign={campaign} onCampaignChange={setCampaign} />
            </div>
    
            <div className="lg:col-span-3">
                <DraftActionsPanel 
                    campaign={campaign} 
                    onSendTestEmail={handleSendTestEmail}
                />
            </div>
            </div>
        )}
      </div>
    </div>
  );
}

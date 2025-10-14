'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select'; // Assuming this component exists
import { API_URL } from '@/lib/api';

// Mock data for service accounts - in a real app, this would be fetched from an API
const MOCK_ACCOUNTS = [
  { value: '1', label: 'SA 1 (Domain: example.com)' },
  { value: '2', label: 'SA 2 (Domain: business.org)' },
  { value: '3', label: 'SA 3 (Domain: example.com)' },
];

// A basic rich text editor component
const RichTextEditor = ({ value, onChange }) => (
  <Textarea 
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="min-h-[150px]"
    placeholder="Enter your campaign HTML body here..."
  />
);

export function CreateDraftCampaign({ onCampaignCreated }) {
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [emailList, setEmailList] = useState('');
  const [draftsPerUser, setDraftsPerUser] = useState(1);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  const [accounts, setAccounts] = useState<{value: string, label: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you'd fetch this from your backend
    setAccounts(MOCK_ACCOUNTS);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const emails = emailList.split(/\s*[,\n\s]+\s*/).filter(Boolean);
    if (emails.length === 0) {
        setError("Email list cannot be empty.");
        setLoading(false);
        return;
    }

    const payload = {
        campaign_name: campaignName,
        subject,
        html_body: htmlBody,
        number_of_drafts_per_user: draftsPerUser,
        email_list: emails,
        selected_accounts: selectedAccounts.map(Number),
    };

    try {
        const response = await axios.post(`${API_URL}/api/v1/drafts/create`, payload);
        setSuccess(`Successfully created campaign: ${response.data.name}. Total drafts: ${response.data.total_drafts}.`);
        onCampaignCreated(); // Callback to refresh parent list
        // Reset form
        setCampaignName('');
        setSubject('');
        setHtmlBody('');
        setEmailList('');
        setDraftsPerUser(1);
        setSelectedAccounts([]);
    } catch (err) {
        setError(err.response?.data?.detail || "An unexpected error occurred.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="sticky top-6">
        <CardHeader>
            <CardTitle>Create New Draft Campaign</CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="campaignName">Campaign Name</Label>
                    <Input id="campaignName" value={campaignName} onChange={e => setCampaignName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>Body (HTML)</Label>
                    <RichTextEditor value={htmlBody} onChange={setHtmlBody} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="emailList">Recipient List</Label>
                    <Textarea 
                        id="emailList"
                        value={emailList}
                        onChange={e => setEmailList(e.target.value)}
                        placeholder="Paste emails, separated by new lines, commas, or spaces."
                        className="min-h-[100px]"
                        required
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="draftsPerUser">Drafts per User</Label>
                    <Input 
                        id="draftsPerUser"
                        type="number"
                        value={draftsPerUser}
                        onChange={e => setDraftsPerUser(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min="1"
                        required 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Service Accounts</Label>
                    <MultiSelect
                        options={accounts}
                        selected={selectedAccounts}
                        onChange={setSelectedAccounts}
                        className="w-full"
                    />
                </div>
                
                {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-100 p-3 rounded-md">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                 {success && (
                    <div className="text-green-600 bg-green-100 p-3 rounded-md">
                        <p className="text-sm">{success}</p>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Drafts
                </Button>
            </form>
        </CardContent>
    </Card>
  );
}

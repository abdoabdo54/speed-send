'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ContactListModal } from '@/components/drafts/ContactListModal';
import { API_URL } from '@/lib/api';

interface Account {
  id: string;
  client_email: string;
}

interface User {
  id: string;
  email: string;
  service_account_id: string;
}

const CreateDraftCampaignPage: React.FC = () => {
  const [campaignName, setCampaignName] = useState('');
  const [fromName, setFromName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [numberOfDraftsPerUser, setNumberOfDraftsPerUser] = useState(1);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<MultiSelectOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/accounts/`);
        const accountOptions = response.data.map((acc: Account) => ({
          value: acc.id.toString(),
          label: acc.client_email,
        }));
        setAccounts(accountOptions);
      } catch (err) {
        setError('Failed to fetch accounts.');
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (selectedAccounts.length === 0) {
        setUsers([]);
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/api/v1/users/`);
        const filteredUsers = response.data.filter((user: User) => selectedAccounts.includes(user.service_account_id));
        setUsers(filteredUsers);
      } catch (err) {
        setError('Failed to fetch users.');
      }
    };
    fetchUsers();
  }, [selectedAccounts]);

  const handleSaveDraft = async () => {
    if (selectedAccounts.length === 0 || emailList.length === 0 || !campaignName || !subject || !htmlBody || !fromName) {
      setError('Please fill all required fields: Campaign Name, From Name, Subject, Body, select at least one account, and provide at least one recipient.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/v1/drafts/create`, {
        campaign_name: campaignName,
        from_name: fromName,
        subject,
        html_body: htmlBody,
        email_list: emailList,
        selected_accounts: selectedAccounts,
        number_of_drafts_per_user: Number(numberOfDraftsPerUser),
      });
      router.push('/drafts');
    } catch (err: any) {
      setError(`Failed to create draft campaign: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <ContactListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectList={setEmailList}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create New Draft Campaign</h1>
        <Button onClick={() => router.push('/drafts')}>Back to Drafts</Button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input id="campaignName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g., Q2 Promo" />
              </div>
              <div>
                <Label htmlFor="fromName">From Name</Label>
                <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="e.g., Your Company Name" />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your email subject" />
              </div>
              <div>
                <Label htmlFor="htmlBody">Email Body (HTML)</Label>
                <Textarea id="htmlBody" value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} placeholder="<html>...</html>" rows={10} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recipient List</CardTitle>
              <Button variant="outline" onClick={() => setIsModalOpen(true)}>Load from Contacts</Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={emailList.join('\n')}
                onChange={(e) => setEmailList(e.target.value.split('\n').filter(email => email.trim() !== ''))}
                placeholder="Enter one email address per line, or load from a contact list."
                rows={10}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account & Draft Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Accounts</Label>
                <MultiSelect
                  options={accounts}
                  selected={selectedAccounts}
                  onChange={setSelectedAccounts}
                  placeholder="Select accounts to send from..."
                />
                <p className="text-sm text-muted-foreground mt-2">{selectedAccounts.length} of {accounts.length} accounts selected.</p>
              </div>
              <div>
                <Label htmlFor="draftsPerUser">Drafts Per User</Label>
                <Input
                  id="draftsPerUser"
                  type="number"
                  value={numberOfDraftsPerUser}
                  onChange={(e) => setNumberOfDraftsPerUser(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
                <p className="text-sm text-muted-foreground mt-2">Each selected account will create this many drafts, with the recipient list split among them.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Users</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5">
                {users.map(user => (
                  <li key={user.id}>{user.email}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Button onClick={handleSaveDraft} className="w-full">Save Draft Campaign</Button>
        </div>
      </div>
    </div>
  );
};

export default CreateDraftCampaignPage;

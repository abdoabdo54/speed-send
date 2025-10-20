'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_URL as DETECTED_API_URL } from '@/lib/api';
import { 
  Upload,
  Users, 
  Mail, 
  Settings,
  Loader2,
  Save
} from 'lucide-react';

const API_URL = DETECTED_API_URL;

interface Account {
  id: number;
  name: string;
  client_email: string;
  domain: string;
  status: string;
  total_users: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  service_account_id: number;
}

interface ContactList {
  id: number;
  name: string;
  contacts: Array<{email: string}>;
}

interface DraftConfig {
  name: string;
  subject: string;
  body_html: string;
  from_name: string;
}

export default function NewDraftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [emailsPerUser, setEmailsPerUser] = useState<number>(1);
  const [config, setConfig] = useState<DraftConfig>({
    name: '',
    subject: '',
    body_html: '',
    from_name: ''
  });
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [createdDraftId, setCreatedDraftId] = useState<number | null>(null);
  const [showUploadSection, setShowUploadSection] = useState(false);

  const filteredSelectedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const base = users.filter(u => selectedAccounts.includes(u.service_account_id));
    if (!q) return base;
    return base.filter(u => u.email.toLowerCase().includes(q));
  }, [users, selectedAccounts, userSearch]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const loadAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`);
      setAccounts(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
        showNotification('Failed to load accounts', 'error');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
        setUsers(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showNotification('Failed to load users', 'error');
    }
  };

  const loadContactLists = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/contacts/`);
      setContactLists(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showNotification('Failed to load contact lists', 'error');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([loadAccounts(), loadUsers(), loadContactLists()]);
    };
    initializeData();
  }, []);

  const createDraft = async () => {
    if (!config.name.trim() || !config.subject.trim() || !config.body_html.trim()) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const draftResponse = await axios.post(`${API_URL}/api/v1/drafts`, config);
      setCreatedDraftId(draftResponse.data.id);
      showNotification('Draft created successfully! Now configure distribution.', 'success');
      setShowUploadSection(true);
    } catch (error: any) {
      console.error('Create draft error:', error);
      showNotification(`Failed to create draft: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadDrafts = async () => {
    if (!createdDraftId) {
      showNotification('No draft created yet.', 'error');
      return;
    }

    if (selectedUsers.length === 0) {
      showNotification('Please select at least one user.', 'error');
      return;
    }

    if (selectedContacts.length === 0) {
      showNotification('Please select at least one contact list.', 'error');
      return;
    }

    setLoading(true);
    try {
      const uploadResponse = await axios.post(`${API_URL}/api/v1/drafts/${createdDraftId}/upload`, {
        user_ids: selectedUsers,
        contact_list_ids: selectedContacts,
        emails_per_user: emailsPerUser
      });
      
      showNotification(`Successfully uploaded ${uploadResponse.data.total_drafts} drafts to ${uploadResponse.data.users_count} users!`, 'success');
      router.push('/drafts');
    } catch (error: any) {
      console.error('Upload drafts error:', error);
      showNotification(`Failed to upload drafts: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">Create New Draft</h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* Draft Details */}
            <Card>
              <CardHeader><CardTitle>Draft Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Draft Name" 
                  value={config.name} 
                  onChange={e => setConfig(c => ({...c, name: e.target.value}))} 
                />
                <Input 
                  placeholder="Subject" 
                  value={config.subject} 
                  onChange={e => setConfig(c => ({...c, subject: e.target.value}))} 
                />
                <Input 
                  placeholder="From Name" 
                  value={config.from_name} 
                  onChange={e => setConfig(c => ({...c, from_name: e.target.value}))} 
                />
                <Textarea 
                  placeholder="Email Body (HTML)" 
                  value={config.body_html} 
                  onChange={e => setConfig(c => ({...c, body_html: e.target.value}))} 
                  rows={12} 
                />
              </CardContent>
            </Card>

            {/* Draft Distribution Logic */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Draft Distribution Logic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Selection */}
                  <div>
                    <Label className="text-base font-medium">Select Users</Label>
                    <div className="max-h-64 overflow-y-auto border rounded-md p-3 mt-2">
                      {users.filter(u => selectedAccounts.includes(u.service_account_id)).map(user => (
                        <div key={user.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <Label htmlFor={`user-${user.id}`} className="text-sm">
                            {user.email}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedUsers.length} users selected
                    </p>
                  </div>

                  {/* Contact Lists Selection */}
                  <div>
                    <Label className="text-base font-medium">Select Contact Lists</Label>
                    <div className="max-h-64 overflow-y-auto border rounded-md p-3 mt-2">
                      {contactLists.map(list => (
                        <div key={list.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`contact-${list.id}`}
                            checked={selectedContacts.includes(list.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts(prev => [...prev, list.id]);
                              } else {
                                setSelectedContacts(prev => prev.filter(id => id !== list.id));
                              }
                            }}
                          />
                          <Label htmlFor={`contact-${list.id}`} className="text-sm">
                            {list.name} ({list.contacts.length} contacts)
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedContacts.length} contact lists selected
                    </p>
                  </div>
                </div>

                {/* Emails Per User */}
                <div>
                  <Label htmlFor="emails-per-user">Emails Per User</Label>
                  <Input
                    id="emails-per-user"
                    type="number"
                    min="1"
                    value={emailsPerUser}
                    onChange={(e) => setEmailsPerUser(parseInt(e.target.value) || 1)}
                    className="w-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Each user will receive {emailsPerUser} draft(s)
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Total drafts: {selectedUsers.length * emailsPerUser}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Account Selection */}
            <Card>
              <CardHeader><CardTitle>Select Accounts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                    <div className="max-h-48 overflow-auto border rounded-md p-2 space-y-2">
                        {accounts.map(acc => (
                            <div key={acc.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`acc-${acc.id}`} 
                                    checked={selectedAccounts.includes(acc.id)} 
                                    onCheckedChange={checked => {
                                        setSelectedAccounts(prev => checked ? [...prev, acc.id] : prev.filter(id => id !== acc.id))
                                    }}
                                />
                        <Label htmlFor={`acc-${acc.id}`} className="font-normal text-sm">
                          {acc.name || acc.client_email}
                        </Label>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedAccounts.length} of {accounts.length} accounts selected.</p>
                </div>
              </CardContent>
            </Card>

            {/* Users of Selected Accounts */}
            <Card>
                <CardHeader><CardTitle>Users of Selected Accounts ({filteredSelectedUsers.length})</CardTitle></CardHeader>
                <CardContent>
                    <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                    <div className="max-h-48 overflow-auto border rounded-md mt-2">
                  {filteredSelectedUsers.map(u => (
                    <div key={u.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`user-${u.id}`}
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(prev => [...prev, u.id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== u.id));
                          }
                        }}
                      />
                      <Label htmlFor={`user-${u.id}`} className="text-sm">
                        {u.email}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedUsers.length} users selected
                </p>
              </CardContent>
            </Card>

            {/* Recipients Summary */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" />Recipients Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Recipients:</span>
                    <span className="font-medium">
                      {contactLists
                        .filter(list => selectedContacts.includes(list.id))
                        .reduce((total, list) => total + list.contacts.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Users:</span>
                    <span className="font-medium">{selectedUsers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emails per User:</span>
                    <span className="font-medium">{emailsPerUser}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Drafts:</span>
                    <span className="font-medium text-blue-600">
                      {selectedUsers.length * emailsPerUser}
                    </span>
                  </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upload Section - Only show after draft is created */}
            {showUploadSection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Drafts to Users
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User Selection */}
                    <div>
                      <Label className="text-base font-medium">Select Users</Label>
                      <div className="max-h-64 overflow-y-auto border rounded-md p-3 mt-2">
                        {users.filter(u => selectedAccounts.includes(u.service_account_id)).map(user => (
                          <div key={user.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers(prev => [...prev, user.id]);
                                } else {
                                  setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                            />
                            <Label htmlFor={`user-${user.id}`} className="text-sm">
                              {user.email}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedUsers.length} users selected
                      </p>
                    </div>

                    {/* Contact Lists Selection */}
                    <div>
                      <Label className="text-base font-medium">Select Contact Lists</Label>
                      <div className="max-h-64 overflow-y-auto border rounded-md p-3 mt-2">
                        {contactLists.map(list => (
                          <div key={list.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`contact-${list.id}`}
                              checked={selectedContacts.includes(list.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedContacts(prev => [...prev, list.id]);
                                } else {
                                  setSelectedContacts(prev => prev.filter(id => id !== list.id));
                                }
                              }}
                            />
                            <Label htmlFor={`contact-${list.id}`} className="text-sm">
                              {list.name} ({list.contacts.length} contacts)
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedContacts.length} contact lists selected
                      </p>
                    </div>
                  </div>

                  {/* Emails Per User */}
                  <div>
                    <Label htmlFor="emails-per-user">Emails Per User</Label>
                    <Input
                      id="emails-per-user"
                      type="number"
                      min="1"
                      value={emailsPerUser}
                      onChange={(e) => setEmailsPerUser(parseInt(e.target.value) || 1)}
                      className="w-32"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Each user will receive {emailsPerUser} draft(s)
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Total drafts: {selectedUsers.length * emailsPerUser}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push('/drafts')}>
                      Skip Upload
                    </Button>
                    <Button onClick={uploadDrafts} disabled={loading}>
                      {loading ? 'Uploading...' : 'Upload Drafts'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="sticky top-0">
              <Button onClick={createDraft} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Draft'}
              </Button>
            </div>
          </div>
        </div>

        {notifications.map(notification => (
          <Alert key={notification.id} className={`fixed top-5 right-5 max-w-sm z-50 ${
            notification.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
            notification.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' :
            'border-blue-200 bg-blue-50 text-blue-800'
          }`}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
}
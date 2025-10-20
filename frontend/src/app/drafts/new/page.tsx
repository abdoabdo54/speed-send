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
  Save,
  ArrowRight
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
  const [step, setStep] = useState(1); // 1: Draft Details, 2: Distribution, 3: Upload

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

  // If the user advances to Distribution or Upload steps and lists are empty, refetch defensively
  useEffect(() => {
    const refetchIfEmpty = async () => {
      if (step >= 2) {
        if (accounts.length === 0) {
          await loadAccounts();
        }
        if (users.length === 0) {
          await loadUsers();
        }
        if (contactLists.length === 0) {
          await loadContactLists();
        }
      }
    };
    refetchIfEmpty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const createDraft = async () => {
    if (!config.name.trim() || !config.subject.trim() || !config.body_html.trim()) {
      showNotification('Please fill in all required fields.', 'error');
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
      const response = await axios.post(`${API_URL}/api/v1/drafts`, {
        ...config,
        selected_account_ids: selectedAccounts,
        selected_user_ids: selectedUsers,
        selected_contact_list_ids: selectedContacts,
        emails_per_user: emailsPerUser
      });
      
      showNotification('Draft created successfully! Now uploading to users...', 'success');
      
      // Automatically upload the draft
      await uploadDrafts(response.data.id);
      
    } catch (error: any) {
      console.error('Create draft error:', error);
      showNotification(`Failed to create draft: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadDrafts = async (draftId: number) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/drafts/${draftId}/upload`);
      
      showNotification(`Successfully uploaded ${response.data.total_drafts} drafts to ${response.data.users_count} users!`, 'success');
      router.push('/drafts');
    } catch (error: any) {
      console.error('Upload drafts error:', error);
      showNotification(`Failed to upload drafts: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!config.name.trim() || !config.subject.trim() || !config.body_html.trim()) {
        showNotification('Please fill in all required fields.', 'error');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedUsers.length === 0) {
        showNotification('Please select at least one user.', 'error');
        return;
      }
      if (selectedContacts.length === 0) {
        showNotification('Please select at least one contact list.', 'error');
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-auto p-8 space-y-6">
        <h1 className="text-3xl font-bold">Create New Draft</h1>

        {/* Progress Steps */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span>Draft Details</span>
          </div>
          <div className={`w-8 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span>Distribution</span>
          </div>
          <div className={`w-8 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span>Upload</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* Step 1: Draft Details */}
            {step === 1 && (
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
            )}

            {/* Step 2: Distribution Logic */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Distribution Logic
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
            )}

            {/* Step 3: Upload Confirmation */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Confirmation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Ready to Upload</h3>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p><strong>Draft:</strong> {config.name}</p>
                      <p><strong>Subject:</strong> {config.subject}</p>
                      <p><strong>Users:</strong> {selectedUsers.length} selected</p>
                      <p><strong>Contact Lists:</strong> {selectedContacts.length} selected</p>
                      <p><strong>Emails per User:</strong> {emailsPerUser}</p>
                      <p><strong>Total Drafts:</strong> {selectedUsers.length * emailsPerUser}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push('/drafts')}>
                      Cancel
                    </Button>
                    <Button onClick={createDraft} disabled={loading} className="flex items-center gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Create & Upload Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Account Selection */}
            <Card>
              <CardHeader><CardTitle>Select Accounts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {accounts.length === 0 ? (
                    <div className="border rounded-md p-3 bg-muted/30 text-sm">
                      <div className="flex items-center justify-between">
                        <span>No accounts found.</span>
                        <Button size="sm" variant="outline" onClick={loadAccounts}>Reload</Button>
                      </div>
                      <p className="mt-1 text-muted-foreground">If this persists, ensure service accounts exist via the Accounts page.</p>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Users of Selected Accounts */}
            <Card>
              <CardHeader><CardTitle>Users of Selected Accounts ({filteredSelectedUsers.length})</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                {accounts.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2">Select accounts first to view users.</div>
                ) : (
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
                )}
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
                {contactLists.length === 0 && (
                  <div className="mt-3 flex items-center justify-between border rounded-md p-2 bg-muted/30 text-sm">
                    <span>No contact lists found.</span>
                    <Button size="sm" variant="outline" onClick={loadContactLists}>Reload</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step Navigation */}
            <div className="sticky top-0 space-y-2">
              {step > 1 && (
                <Button variant="outline" onClick={prevStep} className="w-full">
                  Previous
                </Button>
              )}
              {step < 3 && (
                <Button onClick={nextStep} className="w-full flex items-center gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
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
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MoreHorizontal, 
  Upload, 
  Edit, 
  Copy, 
  Play, 
  Users, 
  Mail, 
  Settings,
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { API_URL as DETECTED_API_URL } from '@/lib/api';

const API_URL = DETECTED_API_URL;

interface DraftCampaign {
  id: number;
  name: string;
  subject: string;
  from_name?: string;
  body_html: string;
  created_at: string;
  total_drafts: number;
  drafts_by_user: { [key: string]: number };
  status: 'draft' | 'uploaded' | 'launched';
  recipients_count: number;
  users_count: number;
  emails_per_user: number;
}

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

const DraftsPage: React.FC = () => {
  const [draftCampaigns, setDraftCampaigns] = useState<DraftCampaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [emailsPerUser, setEmailsPerUser] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState<DraftCampaign | null>(null);
  const [newDraft, setNewDraft] = useState({
    name: '',
    subject: '',
    from_name: '',
    body_html: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchDraftCampaigns();
    fetchAccounts();
    fetchUsers();
    fetchContactLists();
  }, []);

  const fetchDraftCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/drafts`);
      setDraftCampaigns(response.data);
    } catch (err) {
      setError('Failed to fetch draft campaigns.');
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/accounts/`);
      setAccounts(response.data || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users/`);
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchContactLists = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/contacts/`);
      setContactLists(response.data || []);
    } catch (err) {
      console.error('Failed to load contact lists:', err);
    }
  };

  const createDraft = async () => {
    if (!newDraft.name.trim() || !newDraft.subject.trim() || !newDraft.body_html.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/v1/drafts`, newDraft);
      setDraftCampaigns(prev => [...prev, response.data]);
      setShowUploadModal(false);
      setNewDraft({ name: '', subject: '', from_name: '', body_html: '' });
    } catch (err: any) {
      setError(`Failed to create draft: ${err.response?.data?.detail || err.message}`);
    }
  };

  const uploadDrafts = async (draftId: number) => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user.');
      return;
    }

    if (selectedContacts.length === 0) {
      setError('Please select at least one contact list.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/drafts/${draftId}/upload`, {
        user_ids: selectedUsers,
        contact_list_ids: selectedContacts,
        emails_per_user: emailsPerUser
      });
      
      setDraftCampaigns(prev => prev.map(d => 
        d.id === draftId ? { ...d, status: 'uploaded', total_drafts: response.data.total_drafts } : d
      ));
      
      setError(null);
    } catch (err: any) {
      setError(`Failed to upload drafts: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const launchDrafts = async (draftId: number) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/drafts/${draftId}/launch`);
      setDraftCampaigns(prev => prev.map(d => 
        d.id === draftId ? { ...d, status: 'launched' } : d
      ));
      setError(null);
    } catch (err: any) {
      setError(`Failed to launch drafts: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const duplicateDraft = async (draftId: number) => {
    try {
      const originalDraft = draftCampaigns.find(d => d.id === draftId);
      if (!originalDraft) return;

      const response = await axios.post(`${API_URL}/api/v1/drafts`, {
        name: `${originalDraft.name} (Copy)`,
        subject: originalDraft.subject,
        from_name: originalDraft.from_name,
        body_html: originalDraft.body_html
      });
      
      setDraftCampaigns(prev => [...prev, response.data]);
    } catch (err: any) {
      setError(`Failed to duplicate draft: ${err.response?.data?.detail || err.message}`);
    }
  };

  const deleteDraft = async (draftId: number) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/v1/drafts/${draftId}`);
      setDraftCampaigns(prev => prev.filter(d => d.id !== draftId));
    } catch (err: any) {
      setError(`Failed to delete draft: ${err.response?.data?.detail || err.message}`);
    }
  };

  const editDraft = (draft: DraftCampaign) => {
    setEditingDraft(draft);
    setNewDraft({
      name: draft.name,
      subject: draft.subject,
      from_name: draft.from_name || '',
      body_html: draft.body_html
    });
    setShowEditModal(true);
  };

  const updateDraft = async () => {
    if (!editingDraft) return;

    try {
      const response = await axios.patch(`${API_URL}/api/v1/drafts/${editingDraft.id}`, newDraft);
      setDraftCampaigns(prev => prev.map(d => d.id === editingDraft.id ? response.data : d));
      setShowEditModal(false);
      setEditingDraft(null);
      setNewDraft({ name: '', subject: '', from_name: '', body_html: '' });
    } catch (err: any) {
      setError(`Failed to update draft: ${err.response?.data?.detail || err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      uploaded: { color: 'bg-blue-100 text-blue-800', label: 'Uploaded' },
      launched: { color: 'bg-green-100 text-green-800', label: 'Launched' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Draft Management</h1>
          <p className="text-gray-600 mt-2">Upload and manage draft messages for bulk distribution</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Create New Draft
        </Button>
      </div>

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {draftCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg font-medium">{campaign.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(campaign.status)}
                  <span className="text-sm text-gray-500">
                    {campaign.total_drafts} drafts
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => editDraft(campaign)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateDraft(campaign.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => uploadDrafts(campaign.id)}
                    disabled={loading || campaign.status === 'uploaded' || campaign.status === 'launched'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Drafts
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => launchDrafts(campaign.id)}
                    disabled={loading || campaign.status !== 'uploaded'}
                    className="text-green-600"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Launch
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => deleteDraft(campaign.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Subject: {campaign.subject}</p>
                  {campaign.from_name && (
                    <p className="text-sm text-gray-600">From: {campaign.from_name}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Recipients:</span>
                    <span className="ml-1 font-medium">{campaign.recipients_count}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Users:</span>
                    <span className="ml-1 font-medium">{campaign.users_count}</span>
                  </div>
                </div>

                {campaign.drafts_by_user && Object.keys(campaign.drafts_by_user).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Drafts by User:</p>
                    <div className="max-h-24 overflow-y-auto">
                      {Object.entries(campaign.drafts_by_user).map(([user, count]) => (
                        <div key={user} className="flex justify-between text-xs text-gray-600">
                          <span className="truncate">{user}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 text-right">
                  Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Draft Modal */}
      {(showUploadModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {showEditModal ? 'Edit Draft' : 'Create New Draft'}
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="draft-name">Draft Name</Label>
                <Input
                  id="draft-name"
                  placeholder="Enter draft name"
                  value={newDraft.name}
                  onChange={(e) => setNewDraft(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="draft-subject">Subject</Label>
                <Input
                  id="draft-subject"
                  placeholder="Enter email subject"
                  value={newDraft.subject}
                  onChange={(e) => setNewDraft(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="draft-from-name">From Name</Label>
                <Input
                  id="draft-from-name"
                  placeholder="Enter sender name"
                  value={newDraft.from_name}
                  onChange={(e) => setNewDraft(prev => ({ ...prev, from_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="draft-body">Email Body (HTML)</Label>
                <Textarea
                  id="draft-body"
                  placeholder="Enter email content"
                  value={newDraft.body_html}
                  onChange={(e) => setNewDraft(prev => ({ ...prev, body_html: e.target.value }))}
                  rows={8}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => {
                setShowUploadModal(false);
                setShowEditModal(false);
                setEditingDraft(null);
                setNewDraft({ name: '', subject: '', from_name: '', body_html: '' });
              }}>
                Cancel
              </Button>
              <Button onClick={showEditModal ? updateDraft : createDraft}>
                {showEditModal ? 'Update Draft' : 'Create Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DraftsPage;
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusCircle, 
  Copy, 
  Trash2, 
  Pencil, 
  Rocket, 
  Loader2,
  Send
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { format } from 'date-fns';
import { CreateDraftCampaign } from '@/components/drafts/CreateDraftCampaign';

// Types
interface DraftCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  created_at: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/v1/campaigns/?status=draft`);
      setDrafts(response.data || []);
    } catch (err) {
      setError('Failed to load drafts. Please try again.');
      console.error('Load drafts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/drafts/${id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      await axios.delete(`${API_URL}/api/v1/campaigns/${id}/`);
      setDrafts(drafts.filter(d => d.id !== id));
      // Add notification
    } catch (err) {
      console.error('Delete draft error:', err);
      // Add error notification
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
        const response = await axios.get(`${API_URL}/api/v1/campaigns/${id}`);
        const originalDraft = response.data;
        
        const newDraftPayload = {
            ...originalDraft,
            name: `${originalDraft.name} (Copy)`,
            status: 'draft',
        };
        
        // Remove fields that should not be in a create request
        delete newDraftPayload.id;
        delete newDraftPayload.created_at;

        await axios.post(`${API_URL}/api/v1/campaigns/`, newDraftPayload);
        loadDrafts(); // Refresh the list
    } catch (err) {
        console.error('Duplicate draft error:', err);
    }
  };

  const handleLaunch = async (id: number) => {
    try {
      await axios.post(`${API_URL}/api/v1/campaigns/${id}/prepare/`);
      // This just starts the preparation. The status will update in the background.
      // You might want to periodically refresh or use websockets for real-time status.
      loadDrafts();
    } catch (err) {
      console.error('Launch draft error:', err);
    }
  };

  const handleLaunchAll = async () => {
    if (!confirm('Are you sure you want to launch all draft campaigns?')) return;
    const launchPromises = drafts.map(draft => 
        axios.post(`${API_EURL}/api/v1/campaigns/${draft.id}/prepare/`)
    );
    try {
        await Promise.allSettled(launchPromises);
        loadDrafts(); // Refresh list to show status changes
    } catch(err) {
        console.error('Launch all drafts error:', err);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
      <div className="lg:col-span-2">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Draft Campaigns</h1>
          <div className="flex gap-2">
              <Button onClick={handleLaunchAll} variant="default" disabled={loading || drafts.length === 0} className="bg-green-600 hover:bg-green-700">
                  <Send className="h-4 w-4 mr-2" />
                  Launch All Drafts
              </Button>
          </div>
        </header>

        {loading && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        {error && <div className="text-red-500 text-center">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drafts.map((draft) => (
              <Card key={draft.id}>
                <CardHeader>
                  <CardTitle className="truncate">{draft.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 truncate">Subject: {draft.subject}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Status: <span className="font-semibold capitalize">{draft.status}</span></span>
                    <span>{format(new Date(draft.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(draft.id)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(draft.id)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(draft.id)}><Trash2 className="h-4 w-4" /></Button>
                      <Button variant="secondary" size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleLaunch(draft.id)}>
                          <Rocket className="h-4 w-4 mr-2" />
                          Launch
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {drafts.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-10">
                    <p>No draft campaigns found.</p>
                </div>
              )}
          </div>
        )}
      </div>
      <aside>
        <CreateDraftCampaign />
      </aside>
    </div>
  );
}

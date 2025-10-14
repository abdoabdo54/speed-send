'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface DraftCampaign {
  id: number;
  name: string;
  subject: string;
  created_at: string;
  total_drafts: number;
  drafts_by_user: { [key: string]: number };
}

const DraftsPage: React.FC = () => {
  const [draftCampaigns, setDraftCampaigns] = useState<DraftCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchDraftCampaigns();
  }, []);

  const fetchDraftCampaigns = async () => {
    try {
      const response = await axios.get('/api/v1/drafts');
      setDraftCampaigns(response.data);
    } catch (err) {
      setError('Failed to fetch draft campaigns.');
    }
  };

  const deleteCampaign = async (id: number) => {
    try {
      await axios.delete(`/api/v1/drafts/${id}`);
      fetchDraftCampaigns(); // Refresh the list
    } catch (err) {
      setError('Failed to delete draft campaign.');
    }
  };
  
  const launchAllDrafts = async () => {
    try {
      const response = await axios.post('/api/v1/drafts/launch');
      alert(`Launch complete! Sent: ${response.data.total_launched}, Failed: ${response.data.total_failed}`);
      fetchDraftCampaigns(); // Refresh to show updated statuses if applicable
    } catch (err: any) {
      setError(`Failed to launch drafts: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Draft Campaigns</h1>
        <div>
          <Button onClick={launchAllDrafts} className="mr-2">Launch All Drafts</Button>
          <Button onClick={() => router.push('/drafts/new')}>Create New Draft</Button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {draftCampaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{campaign.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/drafts/${campaign.id}`)}>View</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteCampaign(campaign.id)} className="text-red-500">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Subject: {campaign.subject}</p>
              <div className="mt-4">
                <p className="font-semibold">Total Drafts: {campaign.total_drafts}</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2">
                  {Object.entries(campaign.drafts_by_user).map(([user, count]) => (
                    <li key={user}>{user}: {count} drafts</li>
                  ))}
                </ul>
              </div>
               <p className="text-xs text-muted-foreground text-right mt-4">Created on {format(new Date(campaign.created_at), 'PPpp')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DraftsPage;

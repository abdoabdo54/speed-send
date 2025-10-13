'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DraftCampaignCard, DraftCampaign, CampaignStatus } from '@/components/drafts/DraftCampaignCard';
import { Toast } from '@/components/shared/Toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Utility function for fetch with retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && response.status <= 599) {
        // Throw an error for server-side issues to trigger retry
        throw new Error(`Server error: ${response.status}`);
      }
      if (!response.ok) {
        // For client errors, don't retry, just throw
        const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed. Retrying in ${backoff}ms...`, error);
      if (i === retries - 1) {
        // Last retry failed, re-throw the final error
        throw error;
      }
      // Wait for the backoff period before the next retry
      await new Promise(res => setTimeout(res, backoff));
      // Increase backoff for next attempt
      backoff *= 2;
    }
  }
}

export default function DraftsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<DraftCampaign[]>([]);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchCampaigns = async () => {
      try {
        const data = await fetchWithRetry('http://localhost:8000/api/v1/campaigns', {});
        setCampaigns(data);
      } catch (error: any) {
        console.error("Failed to fetch campaigns after multiple retries:", error);
        setToastInfo({ message: error.message || 'Failed to load campaigns after several attempts.', type: 'error' });
      }
    };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateNew = () => {
    router.push('/drafts/new');
  };

  const handleApiCall = async (url: string, options: RequestInit, successMessage: string, errorMessage: string) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: errorMessage }));
        throw new Error(errorData.detail);
      }
      setToastInfo({ message: successMessage, type: 'success' });
      fetchCampaigns(); // Refetch campaigns to show updated state
      return await response.json();
    } catch (error: any) {
      console.error(error);
      setToastInfo({ message: error.message, type: 'error' });
    }
  };


  const handleUpload = (id: string) => {
    handleApiCall(`http://localhost:8000/api/v1/campaigns/${id}/launch`, { method: 'POST' }, 'Successfully uploaded drafts!', 'Failed to upload drafts.');
  };

  const handleDuplicate = (id:string) => {
     handleApiCall(`http://localhost:8000/api/v1/campaigns/${id}/duplicate`, { method: 'POST' }, 'Campaign duplicated!', 'Failed to duplicate campaign.');
  };

  const handleResume = (id: string) => {
    console.log(`Resuming campaign ${id}`);
    setToastInfo({ message: 'Flash send initiated!', type: 'success' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      handleApiCall(`http://localhost:8000/api/v1/campaigns/${id}`, { method: 'DELETE' }, 'Campaign deleted.', 'Failed to delete campaign.');
    }
  };
  
  const handleEdit = (id: string) => {
    router.push(`/drafts/${id}`);
  };

  return (
    <div className="bg-gray-50/50 min-h-screen p-4 sm:p-6 lg:p-8">
      {toastInfo && (
        <Toast
          message={toastInfo.message}
          type={toastInfo.type}
          onClose={() => setToastInfo(null)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <p className="text-sm text-gray-500">Dashboard / Draft Campaigns</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Draft Campaigns</h1>
          </div>
          <Button 
            onClick={handleCreateNew}
            className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all transform hover:scale-105"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Draft
          </Button>
        </header>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input placeholder="Search campaigns..." className="pl-10 w-full" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 w-full md:w-auto">
                  Status: All
                  <ChevronsUpDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>Not Uploaded</DropdownMenuItem>
                <DropdownMenuItem>Uploaded</DropdownMenuItem>
                <DropdownMenuItem>In Progress</DropdownMenuItem>
                <DropdownMenuItem>Completed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {campaigns.map((campaign) => (
            <DraftCampaignCard
              key={campaign.id}
              campaign={campaign}
              onUpload={handleUpload}
              onDuplicate={handleDuplicate}
              onResume={handleResume}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

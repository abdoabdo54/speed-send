'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { campaignsApi } from '@/lib/api';
import { Plus, Play, Pause, Copy, Trash2, MoreVertical } from 'lucide-react';

const statusColors: any = {
  draft: 'bg-gray-500',
  preparing: 'bg-blue-400',
  ready: 'bg-cyan-500',
  sending: 'bg-blue-600',
  paused: 'bg-orange-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
    const interval = setInterval(loadCampaigns, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await campaignsApi.list();
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrepare = async (campaignId: number) => {
    try {
      await campaignsApi.prepare(campaignId);
      loadCampaigns();
    } catch (error: any) {
      alert('Failed to prepare: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLaunch = async (campaignId: number) => {
    try {
      const response = await campaignsApi.launch(campaignId);
      alert(`🚀 Campaign launched! ${response.data.sent_count} emails sent, ${response.data.failed_count} failed.`);
      loadCampaigns();
    } catch (error: any) {
      alert('Failed to launch: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDuplicate = async (campaignId: number) => {
    try {
      await campaignsApi.duplicate(campaignId);
      alert('✅ Campaign duplicated successfully!');
      loadCampaigns();
    } catch (error: any) {
      alert('Failed to duplicate: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleControl = async (campaignId: number, action: string) => {
    try {
      await campaignsApi.control(campaignId, action);
      loadCampaigns();
    } catch (error: any) {
      alert('Failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await campaignsApi.delete(campaignId);
      loadCampaigns();
    } catch (error: any) {
      alert('Failed to delete: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Campaigns</h1>
              <p className="text-muted-foreground">Manage your email campaigns</p>
            </div>
            <Button onClick={() => router.push('/campaigns/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </div>

          <div className="grid gap-6">
            {loading ? (
              <div className="animate-pulse">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No campaigns yet</p>
                  <Button className="mt-4" onClick={() => router.push('/campaigns/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => {
                const progress = campaign.total_recipients > 0
                  ? ((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100
                  : 0;

                return (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{campaign.name}</CardTitle>
                            <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${statusColors[campaign.status]}`}>
                              {campaign.status.toUpperCase()}
                            </span>
                          </div>
                          <CardDescription>{campaign.subject}</CardDescription>
                        </div>
                        
                        <div className="flex gap-2">
                          {campaign.status === 'draft' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleLaunch(campaign.id)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                🚀 Launch
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDuplicate(campaign.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(campaign.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {campaign.status === 'ready' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleLaunch(campaign.id)}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Launch
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrepare(campaign.id)}
                              >
                                Re-Prepare
                              </Button>
                            </>
                          )}
                          
                          {campaign.status === 'sending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleControl(campaign.id, 'pause')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {campaign.status === 'paused' && (
                            <Button
                              size="sm"
                              onClick={() => handleControl(campaign.id, 'resume')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {campaign.status !== 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicate(campaign.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {campaign.sent_count + campaign.failed_count} / {campaign.total_recipients}
                            </span>
                          </div>
                          <Progress value={progress} />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Sent</p>
                            <p className="font-medium text-green-600">{campaign.sent_count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Failed</p>
                            <p className="font-medium text-red-600">{campaign.failed_count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pending</p>
                            <p className="font-medium">{campaign.pending_count}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


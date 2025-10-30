'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { campaignsApi, API_URL } from '@/lib/api';
import { Plus, Play, Pause, Copy, Trash2, MoreVertical, Activity } from 'lucide-react';

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
  const [preparingIds, setPreparingIds] = useState<Set<number>>(new Set());
  const [statistics, setStatistics] = useState<any>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});
  const [liveLogs, setLiveLogs] = useState<Record<number, {items: {ts:string, message:string}[], next:number}>>({});

  useEffect(() => {
    loadCampaigns();
    loadStatistics();
    const interval = setInterval(() => {
      loadCampaigns();
      loadStatistics();
    }, 2000); // Refresh every 2 seconds for faster status updates
    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await campaignsApi.list();
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/campaigns/statistics/`);
      if (response.ok) {
        const stats = await response.json();
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const toggleLogs = async (campaignId: number) => {
    setExpandedLogs(prev => ({ ...prev, [campaignId]: !prev[campaignId] }));
    // start polling if opening
    if (!expandedLogs[campaignId]) {
      // init state
      setLiveLogs(prev => ({ ...prev, [campaignId]: prev[campaignId] || { items: [], next: 0 } }));
      pollLogs(campaignId);
    }
  };

  const pollLogs = async (campaignId: number) => {
    try {
      const offset = liveLogs[campaignId]?.next || 0;
      const res = await fetch(`${API_URL}/api/v1/campaigns/${campaignId}/logs/live?offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setLiveLogs(prev => ({
          ...prev,
          [campaignId]: {
            items: [...(prev[campaignId]?.items || []), ...(data.items || [])].slice(-5000),
            next: data.next_offset || offset,
          }
        }));
      }
    } catch (e) {
      console.error('Failed to poll logs', e);
    } finally {
      // keep polling while expanded
      if (expandedLogs[campaignId]) {
        setTimeout(() => pollLogs(campaignId), 1000);
      }
    }
  };

  const handlePrepare = async (campaignId: number) => {
    try {
      setPreparingIds(prev => new Set(prev).add(campaignId));
      const response = await campaignsApi.prepare(campaignId);
      
      alert(`✅ V2 Preparation Started!\n\nPre-generating all email tasks to Redis for instant send...\n\nTask ID: ${response.data.task_id}`);
      
      // Poll for status update with visual feedback
      const pollInterval = setInterval(async () => {
        await loadCampaigns();
        const camp = campaigns.find((c: any) => c.id === campaignId);
        if (camp && camp.status === 'ready') {
          clearInterval(pollInterval);
          setPreparingIds(prev => {
            const updated = new Set(prev);
            updated.delete(campaignId);
            return updated;
          });
          alert('🎉 Campaign is READY!\n\nAll emails are pre-generated in Redis.\nClick "⚡ Resume" to send 15,000 emails in < 10 seconds!');
        } else if (camp && camp.status === 'failed') {
          clearInterval(pollInterval);
          setPreparingIds(prev => {
            const updated = new Set(prev);
            updated.delete(campaignId);
            return updated;
          });
          alert('❌ Preparation failed. Check backend logs.');
        }
      }, 2000);
      
      // Clear after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setPreparingIds(prev => {
          const updated = new Set(prev);
          updated.delete(campaignId);
          return updated;
        });
      }, 120000);
    } catch (error: any) {
      setPreparingIds(prev => {
        const updated = new Set(prev);
        updated.delete(campaignId);
        return updated;
      });
      alert('Failed to prepare: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleResume = async (campaignId: number) => {
    try {
      // Get campaign to show stats
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      const totalEmails = campaign?.total_recipients || 0;
      
      const confirmed = window.confirm(
        `⚡ V2 PowerMTA INSTANT RESUME\n\n` +
        `This will send ${totalEmails.toLocaleString()} emails instantly from the pre-generated Redis queue.\n\n` +
        `Expected time: < 10 seconds for 15,000 emails\n\n` +
        `Continue?`
      );
      
      if (!confirmed) return;
      
      const startTime = Date.now();
      // CRITICAL FIX: Use /resume/ endpoint, NOT /control/
      const response = await campaignsApi.resume(campaignId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      alert(
        `✅ V2 RESUME TRIGGERED!\n\n` +
        `Dispatch time: ${elapsed}s\n` +
        `Task ID: ${response.data.task_id || 'N/A'}\n\n` +
        `All ${totalEmails.toLocaleString()} emails are being sent in parallel NOW.\n\n` +
        `Watch the live dashboard for real-time progress!`
      );
      
      loadCampaigns();
    } catch (error: any) {
      alert('Failed to resume: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLaunch = async (campaignId: number) => {
    // Create detailed logging container
    const logContainer = document.createElement('div');
    logContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 20px;
      z-index: 9999;
      overflow-y: auto;
    `;
    
    const logContent = document.createElement('div');
    logContainer.appendChild(logContent);
    document.body.appendChild(logContainer);
    
    const log = (message: string, color = 'white') => {
      const line = document.createElement('div');
      line.style.color = color;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logContent.appendChild(line);
      console.log(message);
    };
    
    const closeLog = () => {
      document.body.removeChild(logContainer);
    };
    
    try {
      log('🚀 STARTING CAMPAIGN LAUNCH', 'yellow');
      log(`Campaign ID: ${campaignId}`, 'cyan');
      
      log('📤 SENDING LAUNCH REQUEST...', 'yellow');
      const url = `${API_URL}/api/v1/campaigns/${campaignId}/launch/`;
      log(`Request URL: ${url}`, 'cyan');
      const response = await campaignsApi.launch(campaignId);
      
      log('✅ LAUNCH RESPONSE RECEIVED', 'green');
      log(`Full Response: ${JSON.stringify(response, null, 2)}`, 'white');
      log(`Response Data: ${JSON.stringify(response.data, null, 2)}`, 'white');
      log(`Sent Count: ${response.data?.sent_count}`, 'cyan');
      log(`Failed Count: ${response.data?.failed_count}`, 'cyan');
      log(`Status: ${response.data?.status}`, 'cyan');
      
      if (response.data?.sent_count !== undefined && response.data?.failed_count !== undefined) {
        log('🎉 LAUNCH SUCCESSFUL!', 'green');
        alert(`🚀 Campaign launched! ${response.data.sent_count} emails sent, ${response.data.failed_count} failed.`);
      } else {
        log('⚠️ LAUNCH RESPONSE MISSING DATA', 'orange');
        log('This means the backend response is incomplete', 'red');
        alert(`⚠️ Campaign launched but response incomplete. Check logs above.`);
      }
      
      loadCampaigns();
      
    } catch (error: any) {
      log('❌ LAUNCH ERROR OCCURRED', 'red');
      log(`Error Type: ${error.name}`, 'red');
      log(`Error Message: ${error.message}`, 'red');
      log(`Error Code: ${error.code}`, 'red');
      log(`Online: ${navigator.onLine}`, 'red');
      log(`Response Status: ${error?.response?.status}`, 'red');
      log(`Response Data: ${JSON.stringify(error?.response?.data, null, 2)}`, 'red');
      log(`Full Error: ${JSON.stringify(error, null, 2)}`, 'red');
      
      let msg = 'Launch failed';
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else {
          msg = JSON.stringify(data);
        }
      } else if (error?.message) {
        msg = error.message;
      }
      
      log(`Final Error Message: ${msg}`, 'red');
      alert('❌ Failed to launch: ' + msg);
    } finally {
      log('🏁 LAUNCH PROCESS COMPLETED', 'yellow');
      log('Click anywhere to close this log', 'cyan');
      
      // Add click to close
      logContainer.onclick = closeLog;
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

    // Create detailed logging container
    const logContainer = document.createElement('div');
    logContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 20px;
      z-index: 9999;
      overflow-y: auto;
    `;
    
    const logContent = document.createElement('div');
    logContainer.appendChild(logContent);
    document.body.appendChild(logContainer);
    
    const log = (message: string, color = 'white') => {
      const line = document.createElement('div');
      line.style.color = color;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logContent.appendChild(line);
      console.log(message);
    };
    
    const closeLog = () => {
      document.body.removeChild(logContainer);
    };
    
    try {
      log('🗑️ STARTING CAMPAIGN DELETE', 'yellow');
      log(`Campaign ID: ${campaignId}`, 'cyan');
      
      log('📤 SENDING DELETE REQUEST...', 'yellow');
      const response = await campaignsApi.delete(campaignId);
      
      log('✅ DELETE RESPONSE RECEIVED', 'green');
      log(`Full Response: ${JSON.stringify(response, null, 2)}`, 'white');
      log(`Response Data: ${JSON.stringify(response.data, null, 2)}`, 'white');
      
      log('🎉 DELETE SUCCESSFUL!', 'green');
      alert('✅ Campaign deleted successfully!');
      loadCampaigns();
      
    } catch (error: any) {
      log('❌ DELETE ERROR OCCURRED', 'red');
      log(`Error Type: ${error.name}`, 'red');
      log(`Error Message: ${error.message}`, 'red');
      log(`Response Status: ${error?.response?.status}`, 'red');
      log(`Response Data: ${JSON.stringify(error?.response?.data, null, 2)}`, 'red');
      log(`Full Error: ${JSON.stringify(error, null, 2)}`, 'red');
      
      let msg = 'Delete failed';
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else {
          msg = JSON.stringify(data);
        }
      } else if (error?.message) {
        msg = error.message;
      }
      
      log(`Final Error Message: ${msg}`, 'red');
      alert('❌ Failed to delete: ' + msg);
    } finally {
      log('🏁 DELETE PROCESS COMPLETED', 'yellow');
      log('Click anywhere to close this log', 'cyan');
      
      // Add click to close
      logContainer.onclick = closeLog;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* V2 PowerMTA Info Banner */}
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">V2 PowerMTA Engine Active</h3>
                <p className="text-sm opacity-90 mb-2">
                  Send 15,000 emails in &lt;10 seconds using the V2 workflow: <strong>Prepare → Resume</strong>
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/20 p-2 rounded">
                    <strong>1️⃣ Prepare:</strong> Pre-renders emails to Redis
                  </div>
                  <div className="bg-white/20 p-2 rounded">
                    <strong>2️⃣ Resume:</strong> Instant parallel send (all at once)
                  </div>
                  <div className="bg-white/20 p-2 rounded">
                    <strong>📊 Live:</strong> Real-time SSE dashboard updates
                  </div>
                </div>
                <p className="text-xs opacity-75 mt-2">
                  💡 <strong>Legacy Send</strong> is slower (sequential) - use <strong>V2 Prepare→Resume</strong> for PowerMTA speed
                </p>
              </div>
            </div>
          </div>

          {/* Daily Limits & Statistics */}
          {statistics && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Daily Limit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.daily_limits?.total_daily_limit?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">2k per account</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.daily_limits?.total_sent_today?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.emails?.sent_today?.toLocaleString() || '0'} total
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {statistics.daily_limits?.total_remaining?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Available today</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {statistics.emails?.sent_all_time?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
            </div>
          )}
          
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
              campaigns && Array.isArray(campaigns) ? campaigns.map((campaign) => {
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
                                onClick={() => handlePrepare(campaign.id)}
                                disabled={preparingIds.has(campaign.id)}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white relative"
                              >
                                {preparingIds.has(campaign.id) ? (
                                  <>
                                    <span className="animate-spin mr-2">🔄</span>
                                    Preparing...
                                  </>
                                ) : (
                                  <>
                                    🎯 Prepare (V2)
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleLaunch(campaign.id)}
                                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs"
                                title="Legacy sequential send - slower than V2"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Legacy Send
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
                                variant="outline"
                                onClick={() => router.push(`/campaigns/new?id=${campaign.id}`) }
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(campaign.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
                          
                          {campaign.status === 'ready' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleResume(campaign.id)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse relative"
                              >
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                                ⚡ Resume (Instant Send)
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
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          )}
                          
                          {campaign.status === 'preparing' && (
                            <>
                              <Button size="sm" disabled className="bg-blue-400 text-white relative">
                                <span className="animate-spin mr-2">⚙️</span>
                                V2 Preparing...
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                                </span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="text-xs text-muted-foreground"
                              >
                                Pre-rendering to Redis...
                              </Button>
                            </>
                          )}
                          
                          {campaign.status === 'sending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/campaigns/${campaign.id}/live`)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white animate-pulse"
                              >
                                <Activity className="mr-2 h-4 w-4" />
                                📊 Live Dashboard
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleControl(campaign.id, 'pause')}
                              >
                                <Pause className="h-4 w-4" />
                                Pause
                              </Button>
                            </>
                          )}
                          
                          {campaign.status === 'paused' && (
                            <Button
                              size="sm"
                              onClick={() => handleResume(campaign.id)}
                            >
                              <Play className="h-4 w-4" />
                              Resume
                            </Button>
                          )}
                          
                          {/* Completed and Failed Campaigns */}
                          {(campaign.status === 'completed' || campaign.status === 'failed') && (
                            <>
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
                                variant="outline"
                                onClick={() => router.push(`/campaigns/new?id=${campaign.id}`)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(campaign.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          )}
                          
                          {campaign.status !== 'draft' && campaign.status !== 'completed' && campaign.status !== 'failed' && (
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

                        {/* Live Logs Dropdown */}
                        <div className="mt-4">
                          <button
                            className="text-xs underline text-blue-600"
                            onClick={() => toggleLogs(campaign.id)}
                          >
                            {expandedLogs[campaign.id] ? 'Hide Live Logs' : 'Show Live Logs'}
                          </button>
                          {expandedLogs[campaign.id] && (
                            <div className="mt-2 max-h-64 overflow-auto rounded border p-2 bg-black text-green-200 text-[11px] font-mono">
                              {(liveLogs[campaign.id]?.items || []).map((line, idx) => (
                                <div key={idx}>[{new Date(line.ts || Date.now()).toLocaleTimeString()}] {line.message}</div>
                              ))}
                              {(liveLogs[campaign.id]?.items || []).length === 0 && (
                                <div className="text-gray-400">No logs yet...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="text-center py-4 text-gray-500">
                  No campaigns available
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

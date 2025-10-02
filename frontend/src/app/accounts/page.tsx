'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { serviceAccountsApi, healthCheck, API_URL } from '@/lib/api';
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({ name: '', json: '' });
  const [backendStatus, setBackendStatus] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackend();
    loadAccounts();
  }, []);

  const checkBackend = async () => {
    const isHealthy = await healthCheck();
    setBackendStatus(isHealthy);
    if (!isHealthy) {
      console.error('⚠️ Backend is not accessible at:', API_URL);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await serviceAccountsApi.list();
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.name || !uploadData.json) {
      alert('Please provide both account name and JSON content');
      return;
    }

    try {
      console.log('Uploading service account...', { name: uploadData.name });
      const response = await serviceAccountsApi.create({
        name: uploadData.name,
        json_content: uploadData.json,
      });
      console.log('Upload successful:', response.data);
      
      const accountId = response.data.id;
      
      // Immediately ask for admin email to sync users
      const adminEmail = prompt(
        '✅ Service account added successfully!\n\n' +
        'To sync workspace users, please enter an admin email address with domain-wide delegation:\n\n' +
        '(This is required to fetch users from your Google Workspace)'
      );
      
      if (adminEmail && adminEmail.includes('@')) {
        try {
          console.log('Starting user sync...');
          await serviceAccountsApi.sync(accountId, adminEmail);
          alert(
            '✅ Service account added and user sync started!\n\n' +
            'Users will be synced in the background. This may take 1-2 minutes.\n\n' +
            'Refresh the page in a moment to see the synced users.'
          );
        } catch (syncError: any) {
          alert(
            '⚠️ Service account added, but user sync failed:\n' +
            (syncError.message || 'Unknown error') +
            '\n\nYou can manually sync users later using the Sync button.'
          );
        }
      } else {
        alert(
          '✅ Service account added!\n\n' +
          '⚠️ User sync skipped. Click the Sync button later to fetch workspace users.'
        );
      }
      
      setShowUpload(false);
      setUploadData({ name: '', json: '' });
      loadAccounts();
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || error.response?.data?.detail || 'Failed to upload';
      alert('Failed to upload: ' + errorMessage);
    }
  };

  const handleSync = async (accountId: number) => {
    const adminEmail = prompt('Enter admin email for domain-wide delegation:');
    if (!adminEmail) return;

    try {
      await serviceAccountsApi.sync(accountId, adminEmail);
      alert('User sync started! This may take a few minutes.');
      setTimeout(loadAccounts, 5000);
    } catch (error: any) {
      alert('Failed to sync: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (accountId: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await serviceAccountsApi.delete(accountId);
      loadAccounts();
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
              <h1 className="text-3xl font-bold">Service Accounts</h1>
              <p className="text-muted-foreground">Manage Google Workspace service accounts</p>
              {backendStatus !== null && (
                <div className="mt-2 flex items-center gap-2">
                  {backendStatus ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Backend Connected ({API_URL})</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Backend Offline ({API_URL})</span>
                      <Button size="sm" variant="outline" onClick={checkBackend}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <Button onClick={() => setShowUpload(!showUpload)} disabled={!backendStatus}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>

          {showUpload && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upload Service Account JSON</CardTitle>
                <CardDescription>
                  Upload your Google Cloud service account JSON file with domain-wide delegation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Account Name</label>
                  <Input
                    placeholder="e.g., My Workspace Account"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Service Account JSON</label>
                  <textarea
                    className="w-full h-32 p-3 text-sm border rounded-md"
                    placeholder="Paste your service account JSON here..."
                    value={uploadData.json}
                    onChange={(e) => setUploadData({ ...uploadData, json: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpload}>Upload</Button>
                  <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6">
            {loading ? (
              <div className="animate-pulse">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No service accounts configured yet</p>
                  <Button className="mt-4" onClick={() => setShowUpload(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {account.name}
                          {account.status === 'active' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </CardTitle>
                        <CardDescription>{account.client_email}</CardDescription>
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Synced Users: </span>
                          <span className={account.total_users > 0 ? "text-green-600 font-semibold" : "text-amber-600"}>
                            {account.total_users || 0}
                            {account.total_users === 0 && " ⚠️ Click Sync button →"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(account.id)}
                          title="Sync workspace users from Google"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync Users
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Domain</p>
                        <p className="font-medium">{account.domain}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Users</p>
                        <p className="font-medium">{account.total_users}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quota Used Today</p>
                        <p className="font-medium">{account.quota_used_today} / {account.quota_limit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Synced</p>
                        <p className="font-medium">
                          {account.last_synced 
                            ? new Date(account.last_synced).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


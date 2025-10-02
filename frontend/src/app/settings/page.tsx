'use client';

import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure your application settings</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Rate Limits</CardTitle>
                <CardDescription>
                  Configure default rate limits for email sending
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Personal Account Limit (per day)</label>
                    <Input type="number" defaultValue={500} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Workspace Account Limit (per day)</label>
                    <Input type="number" defaultValue={2000} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Concurrency Per Account</label>
                    <Input type="number" defaultValue={5} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Global Concurrency</label>
                    <Input type="number" defaultValue={50} />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage encryption and security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Service account credentials are encrypted using AES-256 encryption.
                  Encryption keys are managed via environment variables.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment</span>
                    <span className="font-medium">Development</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Status</span>
                    <span className="font-medium text-green-600">Connected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


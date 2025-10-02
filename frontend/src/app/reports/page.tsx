'use client';

import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Export and analyze campaign performance</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reports Coming Soon</CardTitle>
              <CardDescription>
                Advanced analytics and export features will be available here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Campaign performance charts</li>
                <li>• CSV/JSON export</li>
                <li>• Success vs failure analysis</li>
                <li>• Per-account usage reports</li>
                <li>• Error logs with retry information</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


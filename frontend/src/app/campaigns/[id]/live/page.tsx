'use client';

import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { CampaignLiveDashboard } from '@/components/CampaignLiveDashboard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function CampaignLivePage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = parseInt(params.id as string);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6 flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/campaigns')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Live Campaign Dashboard</h1>
              <p className="text-muted-foreground">Campaign #{campaignId} - Real-time progress</p>
            </div>
          </div>

          <CampaignLiveDashboard 
            campaignId={campaignId}
            onClose={() => router.push('/campaigns')}
          />
        </div>
      </div>
    </div>
  );
}


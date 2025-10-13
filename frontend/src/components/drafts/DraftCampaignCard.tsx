import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, UploadCloud, Copy, Play, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type CampaignStatus = 'Not Uploaded' | 'Uploaded' | 'Completed' | 'In Progress';

export interface DraftCampaign {
  id: string;
  name: string;
  createdAt: string;
  targetedUsers: number;
  draftsPerUser: number;
  status: CampaignStatus;
}

interface DraftCampaignCardProps {
  campaign: DraftCampaign;
  onUpload: (id: string) => void;
  onDuplicate: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const statusStyles: { [key in CampaignStatus]: string } = {
  'Not Uploaded': 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  'Uploaded': 'bg-blue-200 text-blue-800 hover:bg-blue-300',
  'Completed': 'bg-green-200 text-green-800 hover:bg-green-300',
  'In Progress': 'bg-amber-200 text-amber-800 hover:bg-amber-300',
};

export function DraftCampaignCard({
  campaign,
  onUpload,
  onDuplicate,
  onResume,
  onDelete,
  onEdit,
}: DraftCampaignCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-grow cursor-pointer" onClick={() => onEdit(campaign.id)}>
          <h3 className="text-lg font-bold text-gray-900 truncate">{campaign.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Created: {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge className={cn('text-xs font-semibold px-2 py-1', statusStyles[campaign.status])}>
          {campaign.status}
        </Badge>
      </div>
      
      <div className="space-y-3 text-sm text-gray-700 mb-5">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Targeted Users</span>
          <span className="font-semibold text-gray-800">{campaign.targetedUsers}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600">Drafts per User</span>
          <span className="font-semibold text-gray-800">{campaign.draftsPerUser}</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
          <span className="font-bold text-gray-600">Total Drafts</span>
          <span className="font-bold text-lg text-blue-600">{campaign.targetedUsers * campaign.draftsPerUser}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-transform hover:scale-105"
          onClick={() => onUpload(campaign.id)}
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onResume(campaign.id)}>
              <Play className="mr-3 h-4 w-4 text-green-500" />
              <span>Flash Send</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(campaign.id)}>
              <Copy className="mr-3 h-4 w-4 text-blue-500" />
              <span>Duplicate</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(campaign.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="mr-3 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

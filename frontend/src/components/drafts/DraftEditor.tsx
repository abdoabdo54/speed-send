'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Code, Eye } from 'lucide-react';

// Define the campaign type to match the data from the parent page
interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  body_html: string;
  body_plain: string;
  attachments: any[];
}

interface DraftEditorProps {
  campaign: Campaign | null;
  onCampaignChange: (campaign: Campaign | null) => void;
}

export function DraftEditor({ campaign, onCampaignChange }: DraftEditorProps) {
  // Use a default campaign object if none is provided
  const currentCampaign = campaign || {
    id: 'new',
    name: '',
    subject: '',
    from_name: '',
    body_html: '',
    body_plain: '',
    attachments: [],
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCampaignChange && currentCampaign) {
      onCampaignChange({
        ...currentCampaign,
        [e.target.id]: e.target.value,
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 space-y-6">
      <h3 className="text-lg font-bold text-gray-900">Prepare Draft Campaign</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">Campaign Name</label>
          <Input id="name" value={currentCampaign.name} onChange={handleInputChange} />
        </div>
        <div>
          <label htmlFor="subject" className="text-sm font-medium text-gray-700 block mb-2">Subject Line</label>
          <Input id="subject" value={currentCampaign.subject} onChange={handleInputChange} />
        </div>
        <div>
          <label htmlFor="from_name" className="text-sm font-medium text-gray-700 block mb-2">From Name <span className='text-gray-400'>(Optional)</span></label>
          <Input id="from_name" value={currentCampaign.from_name} onChange={handleInputChange} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">HTML/Email Body</label>
        <div className="border rounded-lg overflow-hidden">
          <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
            <div className="flex gap-1">
                <Button variant="ghost" size="sm"><Code className="h-4 w-4 mr-1"/> Variables</Button>
                <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1"/> Preview</Button>
            </div>
          </div>
          {/* WYSIWYG Editor Placeholder */}
          <div
            className="prose prose-sm max-w-none p-4 h-64 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: currentCampaign.body_html }}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Attachments</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-500 transition-colors">
          <Paperclip className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Drag & drop files here or <span className="font-semibold text-blue-600">browse</span></p>
        </div>
      </div>
    </div>
  );
}

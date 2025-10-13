'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, FileText, Settings, FlaskConical, AlertTriangle } from 'lucide-react';

export function DraftActionsPanel() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 space-y-5 sticky top-6">
      <h3 className="text-lg font-bold text-gray-900">Actions</h3>

      <div className="space-y-3">
        <Button className="w-full justify-start gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all transform hover:scale-105">
          <Save className="h-5 w-5" />
          <span>Save Draft Campaign</span>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-3">
          <Send className="h-5 w-5" />
          <span>Save & Upload Drafts</span>
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-3">
        <h4 className="font-semibold text-gray-800">Advanced</h4>
        <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600">
          <FlaskConical className="h-5 w-5" />
          <span>A/B Test Content</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600">
          <FileText className="h-5 w-5" />
          <span>Variables & Placeholders</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600">
          <Settings className="h-5 w-5" />
          <span>Advanced Settings</span>
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                        Remember to save your changes before uploading or sending.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

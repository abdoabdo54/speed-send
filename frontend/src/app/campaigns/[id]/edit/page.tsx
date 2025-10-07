'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Sidebar } from '@/components/Sidebar';
import { API_URL } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, TestTube, Loader2, ArrowLeft } from 'lucide-react';

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [senderAccountIds, setSenderAccountIds] = useState<number[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/v1/campaigns/${id}/`);
        const c = res.data;
        setName(c.name || '');
        setSubject(c.subject || '');
        setFromName(c.from_name || '');
        setBodyHtml(c.body_html || '');
        // Collect associated sender accounts if present
        if (Array.isArray(c.sender_accounts)) {
          setSenderAccountIds(c.sender_accounts.map((a: any) => a.id).filter(Boolean));
        }
      } catch (e) {
        console.error('Failed to load campaign', e);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const save = async () => {
    try {
      setSaving(true);
      await axios.patch(`${API_URL}/api/v1/campaigns/${id}/`, {
        name,
        subject,
        body_html: bodyHtml,
        body_plain: stripHtml(bodyHtml),
        from_name: fromName,
      });
      router.push('/campaigns');
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/v1/test-email/`, {
        recipient_email: testEmail,
        subject,         // exact subject
        body_html: bodyHtml,
        body_plain: stripHtml(bodyHtml),
        from_name: fromName, // exact from name
        sender_account_id: senderAccountIds[0],
      });
      setShowTest(false);
    } catch (e) {
      console.error('Test failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/campaigns')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <h1 className="text-2xl font-bold">Edit Campaign #{id}</h1>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-from">From Name</Label>
              <Input id="c-from" value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-subject">Subject</Label>
              <Input id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-body">Body (HTML)</Label>
              <Textarea id="c-body" rows={12} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowTest(true)} disabled={loading || senderAccountIds.length === 0}>
                <TestTube className="h-4 w-4 mr-2" /> Send Test
              </Button>
              <span className="text-xs text-muted-foreground">Uses exact From Name and Subject</span>
            </div>
          </CardContent>
        </Card>

        {showTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="test-email">Test recipient</Label>
                  <Input id="test-email" type="email" value={testEmail} onChange={(e)=>setTestEmail(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={sendTest} disabled={!testEmail.trim() || loading} className="flex-1">
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send Test'}
                  </Button>
                  <Button variant="outline" onClick={()=>setShowTest(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



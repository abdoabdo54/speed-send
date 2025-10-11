'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dataListsApi } from '@/lib/api';

type DataList = {
  id: number;
  name: string;
  description?: string;
  list_type: string; // custom | openers | clickers | leaders | unsubscribers | delivery
  geo_filter?: string;
  recipients: string[];
  tags: string[];
  is_active: boolean;
  total_recipients: number;
  created_at: string;
  updated_at: string;
};

const LIST_TYPES = ['custom','openers','clickers','leaders','unsubscribers','delivery'];

export default function ContactsPage() {
  const [lists, setLists] = useState<DataList[]>([]);
  const [editing, setEditing] = useState<DataList | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [geo, setGeo] = useState('');
  const [type, setType] = useState('custom');
  const [emailsText, setEmailsText] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGeo, setFilterGeo] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLists = async () => {
    try {
      setLoading(true);
      const response = await dataListsApi.list();
      setLists(response.data);
    } catch (error) {
      console.error('Failed to load data lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const filtered = useMemo(() => {
    return lists
      .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()))
      .filter(l => !filterType || l.list_type === filterType)
      .filter(l => !filterGeo || (l.geo_filter || '').toLowerCase().includes(filterGeo.toLowerCase()));
  }, [lists, search, filterType, filterGeo]);

  const startNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setGeo('');
    setType('custom');
    setEmailsText('');
  };

  const startEdit = (list: DataList) => {
    setEditing(list);
    setName(list.name);
    setDescription(list.description || '');
    setGeo(list.geo_filter || '');
    setType(list.list_type);
    setEmailsText(list.recipients.join('\n'));
  };

  const save = async () => {
    if (!name.trim()) return;
    
    try {
      setLoading(true);
      const recipients = Array.from(new Set(
        emailsText.split(/\n|,|\s+/).map(s => s.trim()).filter(s => s.includes('@'))
      ));
      
      if (editing) {
        // Update existing list
        await dataListsApi.update(editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          list_type: type,
          geo_filter: geo.trim() || undefined,
          recipients,
        });
      } else {
        // Create new list
        await dataListsApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
          list_type: type,
          geo_filter: geo.trim() || undefined,
          recipients,
          tags: [],
        });
      }
      
      await loadLists();
      startNew();
    } catch (error) {
      console.error('Failed to save data list:', error);
      alert('Failed to save data list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this list?')) return;
    
    try {
      setLoading(true);
      await dataListsApi.delete(id);
      await loadLists();
      if (editing?.id === id) startNew();
    } catch (error) {
      console.error('Failed to delete data list:', error);
      alert('Failed to delete data list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Data Lists</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadLists}>Refresh</Button>
            <Button onClick={startNew}>New List</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{editing ? `Edit: ${editing.name}` : 'Create New List'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="l-name">Name</Label>
                <Input id="l-name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Elite Buyers US" />
              </div>
              <div>
                <Label htmlFor="l-description">Description (optional)</Label>
                <Input id="l-description" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Brief description of this list" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="l-geo">Geo (optional)</Label>
                  <Input id="l-geo" value={geo} onChange={(e)=>setGeo(e.target.value)} placeholder="US, EU, Worldwide" />
                </div>
                <div>
                  <Label htmlFor="l-type">Type</Label>
                  <select id="l-type" className="w-full p-2 border rounded-md" value={type} onChange={(e)=>setType(e.target.value)}>
                    {LIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="l-emails">Emails (one per line)</Label>
                <Textarea id="l-emails" rows={12} value={emailsText} onChange={(e)=>setEmailsText(e.target.value)} placeholder={'email1@example.com\nemail2@example.com'} />
              </div>
              <div className="flex gap-2">
                <Button onClick={save}>Save</Button>
                {editing && <Button variant="outline" onClick={()=>remove(editing.id)}>Delete</Button>}
              </div>
            </CardContent>
          </Card>

          {/* Lists & Filters */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Lists</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Search by name..." value={search} onChange={(e)=>setSearch(e.target.value)} />
                <select className="p-2 border rounded-md" value={filterType} onChange={(e)=>setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  {LIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Input placeholder="Geo filter (e.g., US)" value={filterGeo} onChange={(e)=>setFilterGeo(e.target.value)} />
                <Button variant="outline" onClick={()=>{setSearch('');setFilterType('');setFilterGeo('');}}>Clear Filters</Button>
              </div>
              <div className="max-h-[60vh] overflow-auto divide-y border rounded">
                {filtered.map(list => (
                  <div key={list.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{list.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {list.list_type} {list.geo_filter ? `• ${list.geo_filter}` : ''} • {list.total_recipients} recipients
                        {list.description && ` • ${list.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={()=>startEdit(list)}>Edit</Button>
                      <Button size="sm" onClick={()=>{
                        // Quick copy to clipboard
                        navigator.clipboard.writeText(list.recipients.join('\n'));
                      }}>Copy Emails</Button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No lists yet. Create one on the left.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
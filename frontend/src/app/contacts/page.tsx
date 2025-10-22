'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { API_URL } from '@/lib/api';

type Contact = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  position?: string;
  city?: string;
  country?: string;
};

type ContactList = {
  id: number;
  name: string;
  description?: string;
  contacts: Contact[];
};

export default function ContactsPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [editing, setEditing] = useState<ContactList | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/contacts/lists`);
      if (!response.ok) {
        throw new Error('Failed to fetch contact lists');
      }
      const data = await response.json();
      setLists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load contact lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const filtered = useMemo(() => {
    return lists
      .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()))
  }, [lists, search]);

  const startNew = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setEmailsText('');
  };

  const startEdit = (list: ContactList) => {
    setEditing(list);
    setName(list.name);
    setDescription(list.description || '');
    setEmailsText(list.contacts.map(c => c.email).join('\n'));
  };

  const save = async () => {
    if (!name.trim()) return;
    
    try {
      setLoading(true);
      const contacts = Array.from(new Set(
        emailsText.split(/\n|,|\s+/).map(s => s.trim()).filter(s => s.includes('@'))
      )).map(email => {
        const namePart = email.split('@')[0];
        const nameParts = namePart.split('.');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join('.') || '';
        return {
            first_name: firstName,
            last_name: lastName,
            email: email
        };
      });
      
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      let response;
      if (editing) {
        // Update existing list
        response = await fetch(`${API_URL}/api/v1/contacts/${editing.id}` , {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new list
        response = await fetch(`${API_URL}/api/v1/contacts/lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save contact list');
      }
      
      const result = await response.json();
      console.log('Contact list saved:', result);
      
      // If we have contacts and this is a new list, create the contacts
      if (contacts.length > 0 && !editing) {
        try {
          for (const contact of contacts) {
            const contactPayload = {
              contact_list_id: result.id,
              email: contact.email,
              first_name: contact.first_name,
              last_name: contact.last_name
            };
            
            const contactResponse = await fetch(`${API_URL}/api/v1/contacts/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(contactPayload),
            });
            
            if (!contactResponse.ok) {
              console.error('Failed to create contact:', contact.email);
            }
          }
        } catch (error) {
          console.error('Error creating contacts:', error);
        }
      }
      
      await loadLists();
      startNew();
    } catch (error) {
      console.error('Failed to save contact list:', error);
      alert('Failed to save contact list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this list?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/contacts/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete contact list');
      }
      await loadLists();
      if (editing?.id === id) startNew();
    } catch (error) {
      console.error('Failed to delete contact list:', error);
      alert('Failed to delete contact list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Contact Lists</h1>
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
                <Button variant="outline" onClick={()=>{setSearch('');}}>Clear Filters</Button>
              </div>
              <div className="max-h-[60vh] overflow-auto divide-y border rounded">
                {filtered.map(list => (
                  <div key={list.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{list.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {list.contacts?.length || 0} contacts
                        {list.description && ` • ${list.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={()=>startEdit(list)}>Edit</Button>
                      <Button size="sm" onClick={()=>{
                        // Quick copy to clipboard
                        navigator.clipboard.writeText(list.contacts.map(c => c.email).join('\n'));
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

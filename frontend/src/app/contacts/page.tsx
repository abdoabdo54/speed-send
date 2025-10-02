'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Tag,
  Users,
  FileSpreadsheet
} from 'lucide-react';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const lines = importText.split('\n').filter(line => line.trim());
    const imported = lines.map((line, index) => {
      const email = line.trim();
      return {
        id: Date.now() + index,
        email,
        name: email.split('@')[0],
        tags: [],
        added: new Date().toISOString()
      };
    });

    setContacts([...contacts, ...imported]);
    setImportText('');
    setShowImport(false);
  };

  const handleAddManual = () => {
    const email = prompt('Enter email address:');
    if (!email) return;

    setContacts([
      ...contacts,
      {
        id: Date.now(),
        email,
        name: email.split('@')[0],
        tags: [],
        added: new Date().toISOString()
      }
    ]);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this contact?')) return;
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleExport = () => {
    const csv = contacts.map(c => c.email).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
  };

  const filteredContacts = contacts.filter(c =>
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Contacts</h1>
              <p className="text-muted-foreground">
                Manage your recipient lists and segments
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowImport(!showImport)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={contacts.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleAddManual}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          </div>

          {/* Import Section */}
          {showImport && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Import Contacts</CardTitle>
                <CardDescription>Upload CSV file or paste email addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCSVUpload}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="paste-emails">Or Paste Emails (one per line)</Label>
                  <Textarea
                    id="paste-emails"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={'email1@example.com\nemail2@example.com\nemail3@example.com'}
                    rows={8}
                    className="font-mono text-sm mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleImport} disabled={!importText.trim()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import {importText.split('\n').filter(l => l.trim()).length} Contacts
                  </Button>
                  <Button variant="outline" onClick={() => setShowImport(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{contacts.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Segments</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lists</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1</div>
                <p className="text-xs text-muted-foreground mt-1">Main list</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacts Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Contacts ({filteredContacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No contacts yet</p>
                  <p className="text-muted-foreground mb-4">
                    Import contacts from CSV or add them manually
                  </p>
                  <Button onClick={() => setShowImport(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Contacts
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Email</th>
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Tags</th>
                        <th className="text-left p-4 font-medium">Added</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-4 font-mono text-sm">{contact.email}</td>
                          <td className="p-4">{contact.name}</td>
                          <td className="p-4">
                            {contact.tags.length > 0 ? (
                              <div className="flex gap-1">
                                {contact.tags.map((tag: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No tags</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(contact.added).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(contact.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


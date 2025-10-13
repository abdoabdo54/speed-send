'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Upload, Trash2 } from 'lucide-react';
import { UploadModal } from '@/components/data-lists/UploadModal';
import { Toast } from '@/components/ui/toast';

interface DataList {
  id: number;
  name: string;
  total_recipients: number;
  created_at: string;
}

export default function DataListsPage() {
  const [dataLists, setDataLists] = useState<DataList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchDataLists();
  }, []);

  const fetchDataLists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data-lists');
      if (!response.ok) {
        throw new Error('Failed to fetch data lists');
      }
      const data = await response.json();
      setDataLists(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, listName: string) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const emails = text.split('\n').map(line => line.trim()).filter(line => line.includes('@'));
      
      try {
        const response = await fetch('/api/data-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: listName, recipients: emails }),
        });

        if (!response.ok) {
          throw new Error('Failed to create data list');
        }

        setToast({ message: 'Data list created successfully', type: 'success' });
        fetchDataLists(); // Refresh the list
      } catch (error) {
        if (error instanceof Error) {
          setToast({ message: error.message, type: 'error' });
        } else {
          setToast({ message: 'An unknown error occurred', type: 'error' });
        }
      }
    };
    reader.readAsText(file);
    setShowUploadModal(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this data list?')) {
      try {
        const response = await fetch(`/api/data-lists/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete data list');
        }

        setToast({ message: 'Data list deleted successfully', type: 'success' });
        fetchDataLists(); // Refresh the list
      } catch (error) {
        if (error instanceof Error) {
          setToast({ message: error.message, type: 'error' });
        } else {
          setToast({ message: 'An unknown error occurred', type: 'error' });
        }
      }
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-screen">
      <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Lists</h1>
          <Button onClick={() => setShowUploadModal(true)} className="gap-2">
            <Upload className="h-5 w-5" />
            Upload List
          </Button>
        </header>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Your Data Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List Name</TableHead>
                  <TableHead>Contact Count</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>{list.total_recipients.toLocaleString()}</TableCell>
                    <TableCell>{new Date(list.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/data-lists/${list.id}`)}>View</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(list.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onUpload={handleUpload} />}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}

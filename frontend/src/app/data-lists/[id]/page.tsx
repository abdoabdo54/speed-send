'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface Contact {
  email: string;
}

interface DataList {
  id: number;
  name: string;
  recipients: string[];
}

export default function DataListPage() {
  const [dataList, setDataList] = useState<DataList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      fetchDataList();
    }
  }, [id]);

  const fetchDataList = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data-lists/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data list');
      }
      const data = await response.json();
      setDataList(data);
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

  const handleDeleteContact = async (email: string) => {
    if (dataList && confirm('Are you sure you want to delete this contact?')) {
      const updatedRecipients = dataList.recipients.filter(r => r !== email);
      try {
        const response = await fetch(`/api/data-lists/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients: updatedRecipients }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to delete contact');
        }

        setToast({ message: 'Contact deleted successfully', type: 'success' });
        fetchDataList(); // Refresh the list
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
        <header className="flex items-center mb-8">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 ml-4">
            {dataList ? dataList.name : 'Data List'}
          </h1>
        </header>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {dataList && (
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataList.recipients.map((recipient, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{recipient}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteContact(recipient)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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

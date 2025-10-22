'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

export default function SimpleTestPage() {
  const [results, setResults] = useState<any>({});

  useEffect(() => {
    const testBackend = async () => {
      const testResults: any = {};

      // Test 1: Health check
      try {
        console.log('Testing health endpoint...');
        const healthResponse = await fetch(`${API_URL}/health`);
        const healthData = await healthResponse.json();
        testResults.health = {
          status: 'success',
          data: healthData,
          statusCode: healthResponse.status
        };
      } catch (error: any) {
        testResults.health = {
          status: 'error',
          error: error.message
        };
      }

      // Test 2: Root endpoint
      try {
        console.log('Testing root endpoint...');
        const rootResponse = await fetch(`${API_URL}/`);
        const rootData = await rootResponse.json();
        testResults.root = {
          status: 'success',
          data: rootData,
          statusCode: rootResponse.status
        };
      } catch (error: any) {
        testResults.root = {
          status: 'error',
          error: error.message
        };
      }

      // Test 3: Accounts endpoint
      try {
        console.log('Testing accounts endpoint...');
        const accountsResponse = await fetch(`${API_URL}/api/v1/accounts/`);
        const accountsData = await accountsResponse.json();
        testResults.accounts = {
          status: 'success',
          data: accountsData,
          count: Array.isArray(accountsData) ? accountsData.length : 0,
          statusCode: accountsResponse.status
        };
      } catch (error: any) {
        testResults.accounts = {
          status: 'error',
          error: error.message
        };
      }

      // Test 4: Users endpoint
      try {
        console.log('Testing users endpoint...');
        const usersResponse = await fetch(`${API_URL}/api/v1/users/`);
        const usersData = await usersResponse.json();
        testResults.users = {
          status: 'success',
          data: usersData,
          count: Array.isArray(usersData) ? usersData.length : 0,
          statusCode: usersResponse.status
        };
      } catch (error: any) {
        testResults.users = {
          status: 'error',
          error: error.message
        };
      }

      // Test 5: Contacts endpoint
      try {
        console.log('Testing contacts endpoint...');
        const contactsResponse = await fetch(`${API_URL}/api/v1/contacts/`);
        const contactsData = await contactsResponse.json();
        testResults.contacts = {
          status: 'success',
          data: contactsData,
          count: Array.isArray(contactsData) ? contactsData.length : 0,
          statusCode: contactsResponse.status
        };
      } catch (error: any) {
        testResults.contacts = {
          status: 'error',
          error: error.message
        };
      }

      setResults(testResults);
    };

    testBackend();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Backend Test</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">API URL: {API_URL}</h2>
        </div>
        
        <div className="grid gap-4">
          {Object.entries(results).map(([key, result]: [string, any]) => (
            <div key={key} className="border rounded p-4">
              <h3 className="font-semibold capitalize">{key}</h3>
              <div className="mt-2">
                <p><strong>Status:</strong> {result.status}</p>
                {result.status === 'success' ? (
                  <div>
                    <p><strong>Status Code:</strong> {result.statusCode}</p>
                    {result.count !== undefined && <p><strong>Count:</strong> {result.count}</p>}
                    <pre className="bg-gray-100 p-2 rounded text-xs mt-2 max-h-40 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <p><strong>Error:</strong> {result.error}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

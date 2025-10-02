'use client';

import { useState } from 'react';
import { serviceAccountsApi } from '@/lib/api';

export default function TestApi() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing API call...');
      const response = await serviceAccountsApi.list();
      console.log('✅ API Response:', response);
      setResult(response.data);
    } catch (error) {
      console.error('❌ API Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-4">🧪 API Test</h3>
      <button 
        onClick={testApi} 
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Accounts API'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h4 className="font-bold">Result:</h4>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      className={cn(
        'fixed top-5 right-5 z-50 flex items-center gap-4 rounded-lg p-4 text-white shadow-2xl animate-in slide-in-from-top-5',
        isSuccess ? 'bg-green-600' : 'bg-red-600'
      )}
    >
      {isSuccess ? (
        <CheckCircle className="h-6 w-6" />
      ) : (
        <XCircle className="h-6 w-6" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto-pl-2 opacity-70 hover:opacity-100">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

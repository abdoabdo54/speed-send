'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white',
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      )}
    >
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white font-bold">
          &times;
        </button>
      </div>
    </div>
  );
}

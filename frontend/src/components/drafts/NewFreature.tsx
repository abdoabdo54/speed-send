'use client';

import React, { useState, useCallback } from 'react';
import { Upload, File as FileIcon, X, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Mock upload service to simulate file upload with progress and potential failure
const mockUploadService = {
  upload: (file: File, onProgress: (percentage: number) => void, onComplete: (success: boolean) => void) => {
    let progress = 0;
    const interval = setInterval(() => {
      // Simulate progress
      progress += Math.random() * 20;
      if (progress > 100) progress = 100;
      onProgress(progress);

      if (progress === 100) {
        clearInterval(interval);
        // Simulate a 20% chance of failure for demonstration
        const success = Math.random() > 0.2;
        onComplete(success);
      }
    }, 500);

    return () => clearInterval(interval); // Return a function to cancel the upload
  },
};

export function NewFeature() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  };

  const handleUpload = useCallback(() => {
    if (!file) return;

    setUploadStatus('uploading');
    mockUploadService.upload(
      file,
      (percentage) => setUploadProgress(percentage),
      (success) => {
        setUploadStatus(success ? 'success' : 'failed');
      }
    );
  }, [file]);

  const handleRetry = () => {
    setUploadProgress(0);
    handleUpload();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 space-y-5 sticky top-6">
      <h3 className="text-lg font-bold text-gray-900">File Upload Feature</h3>
      <div className="flex items-center justify-center w-full">
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">CSV, JSON, or TXT (MAX. 5MB)</p>
          </div>
          <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".csv,.json,.txt" />
        </label>
      </div>

      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <FileIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{file.name}</span>
            </div>
            <button onClick={handleRemoveFile} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          {(uploadStatus === 'idle' || uploadStatus === 'uploading' || uploadStatus === 'failed') && (
            <div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-right text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <Button className="w-full" disabled>Uploading...</Button>
          )}

          {uploadStatus === 'idle' && (
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpload}>Upload File</Button>
          )}

          {uploadStatus === 'success' && (
            <div className="text-center p-4 bg-green-100 text-green-800 rounded-lg">
              <p className="font-semibold">Upload Successful!</p>
            </div>
          )}

          {uploadStatus === 'failed' && (
             <div className="text-center p-4 bg-red-100 text-red-800 rounded-lg space-y-3">
              <p className="font-semibold">Upload Failed</p>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-red-300 text-red-800 hover:bg-red-200"
                onClick={handleRetry}
              >
                <RotateCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

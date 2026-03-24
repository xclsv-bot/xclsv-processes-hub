'use client';

import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import api from '@/lib/api';

interface MediaUploaderProps {
  processId?: string;
  onUpload?: (file: any) => void;
  accept?: string;
  maxSize?: number; // in MB
}

export function MediaUploader({
  processId,
  onUpload,
  accept = 'image/*,video/*,application/pdf',
  maxSize = 50,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setError(null);

    // Validate size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = processId 
        ? `/media/upload?processId=${processId}`
        : '/media/upload';

      const { data } = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onUpload?.(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={clsx(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="text-4xl mb-4">📁</div>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Drag and drop a file here, or
      </p>
      <Button
        onClick={() => fileInputRef.current?.click()}
        loading={isUploading}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Choose File'}
      </Button>
      <p className="text-xs text-gray-500 mt-2">
        Max file size: {maxSize}MB
      </p>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}

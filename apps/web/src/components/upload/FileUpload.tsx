'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface FileUploadProps {
  processId?: string;
  onUpload?: (file: UploadedFile) => void;
  onRemove?: (fileId: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
}

export function FileUpload({
  processId,
  onUpload,
  onRemove,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  maxSize = 10,
  multiple = true,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setError(null);
    setUploading(true);

    const uploadPromises = Array.from(fileList).map(async (file) => {
      // Validate size
      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`${file.name} exceeds ${maxSize}MB limit`);
      }

      const formData = new FormData();
      formData.append('file', file);
      if (processId) {
        formData.append('processId', processId);
      }

      try {
        const { data } = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.data as UploadedFile;
      } catch (err: any) {
        throw new Error(`Failed to upload ${file.name}: ${err.response?.data?.message || err.message}`);
      }
    });

    try {
      const uploaded = await Promise.all(uploadPromises);
      setFiles((prev) => [...prev, ...uploaded]);
      uploaded.forEach((f) => onUpload?.(f));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async (fileId: string) => {
    try {
      await api.delete(`/media/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      onRemove?.(fileId);
    } catch (err: any) {
      setError(`Failed to remove file: ${err.response?.data?.message || err.message}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-10 h-10 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-gray-600">
            {uploading ? (
              'Uploading...'
            ) : (
              <>
                <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
              </>
            )}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Max {maxSize}MB per file
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Icon based on type */}
                {file.mimeType.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(file.id)}
                className="text-gray-400 hover:text-red-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

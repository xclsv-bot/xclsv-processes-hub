'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const AREAS = [
  { value: 'AFFILIATE', label: 'Affiliate' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'INFLUENCER', label: 'Influencer' },
  { value: 'PARTNERS', label: 'Partners' },
  { value: 'CRM', label: 'CRM' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'GENERAL', label: 'General' },
];

const SUPPORTED_FORMATS = ['txt', 'vtt', 'srt', 'doc', 'docx', 'pdf'];

interface Props {
  onSuccess?: (processId: string) => void;
  onCancel?: () => void;
}

export function TranscriptUpload({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [area, setArea] = useState('GENERAL');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      setError(`Unsupported file format. Please upload: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`);
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const extension = droppedFile.name.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      setError(`Unsupported file format. Please upload: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`);
      return;
    }

    setFile(droppedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setProgress('Uploading transcript...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('area', area);

      setProgress('Analyzing transcript with AI...');
      
      const res = await api.post('/ai/upload-transcript', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = res.data;
      setProgress('Process created! Redirecting...');

      // Navigate to the new process or call callback
      if (onSuccess) {
        onSuccess(result.id);
      } else {
        router.push(`/processes/${result.id}/edit`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process transcript');
      setProgress('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📄 Create Process from Transcript
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Upload a meeting transcript or document and AI will generate a structured process document.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          file
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.vtt,.srt,.doc,.docx,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div>
            <div className="text-4xl mb-2">✅</div>
            <div className="font-medium text-green-700">{file.name}</div>
            <div className="text-sm text-green-600">
              {(file.size / 1024).toFixed(1)} KB
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">📁</div>
            <div className="font-medium text-gray-700">
              Drop your transcript file here
            </div>
            <div className="text-sm text-gray-500 mt-1">
              or click to browse
            </div>
            <div className="text-xs text-gray-400 mt-3">
              Supported formats: TXT, VTT, SRT, DOC, DOCX, PDF
            </div>
          </div>
        )}
      </div>

      {/* Department Selection */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Department
        </label>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Progress */}
      {progress && (
        <div className="mt-4 flex items-center gap-2 text-blue-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{progress}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {uploading ? 'Processing...' : '✨ Generate Process'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Zoom transcripts</strong> export as VTT files</li>
          <li>• <strong>Meeting notes</strong> work great as TXT, DOCX, or PDF</li>
          <li>• <strong>Existing SOPs</strong> can be uploaded as PDF to reformat</li>
          <li>• AI will identify steps, owners, and tools mentioned</li>
          <li>• The generated process is a draft — review and edit before publishing</li>
        </ul>
      </div>
    </div>
  );
}

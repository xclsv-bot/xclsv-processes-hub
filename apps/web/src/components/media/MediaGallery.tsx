'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui';

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

interface MediaGalleryProps {
  files: MediaFile[];
  onDelete?: (id: string) => void;
  onSelect?: (file: MediaFile) => void;
  selectable?: boolean;
}

export function MediaGallery({ files, onDelete, onSelect, selectable }: MediaGalleryProps) {
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  const isPdf = (mimeType: string) => mimeType === 'application/pdf';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className={clsx(
              'relative group rounded-lg overflow-hidden border dark:border-gray-700',
              selectable && 'cursor-pointer hover:ring-2 hover:ring-primary-500'
            )}
            onClick={() => selectable ? onSelect?.(file) : setPreviewFile(file)}
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {isImage(file.mimeType) ? (
                <img
                  src={file.thumbnailUrl || file.url}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                />
              ) : isVideo(file.mimeType) ? (
                <div className="text-4xl">🎬</div>
              ) : isPdf(file.mimeType) ? (
                <div className="text-4xl">📄</div>
              ) : (
                <div className="text-4xl">📁</div>
              )}
            </div>

            {/* Info overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs truncate">{file.originalName}</p>
              <p className="text-xs text-gray-300">{formatSize(file.size)}</p>
            </div>

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file.id);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.originalName}
        size="xl"
      >
        {previewFile && (
          <div className="flex flex-col items-center">
            {isImage(previewFile.mimeType) ? (
              <img
                src={previewFile.url}
                alt={previewFile.originalName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            ) : isVideo(previewFile.mimeType) ? (
              <video
                src={previewFile.url}
                controls
                className="max-w-full max-h-[60vh]"
              />
            ) : (
              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Download {previewFile.originalName}
              </a>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

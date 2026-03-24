'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isResolved: boolean;
  createdAt: string;
  replies?: Comment[];
}

interface CommentCardProps {
  comment: Comment;
  depth?: number;
  maxDepth?: number;
  currentUserId?: string;
  onReply?: (parentId: string) => void;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
}

export function CommentCard({
  comment,
  depth = 0,
  maxDepth = 3,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onResolve,
}: CommentCardProps) {
  const [showReplies, setShowReplies] = useState(depth < 2);
  const isOwner = currentUserId === comment.author.id;
  const canNest = depth < maxDepth;

  // Parse @mentions and make them clickable
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-600 font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className={`bg-white rounded-lg p-4 ${comment.isResolved ? 'opacity-60' : ''}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {comment.author.avatarUrl ? (
              <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-full h-full rounded-full" />
            ) : (
              comment.author.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{comment.author.name}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.isEdited && !comment.isDeleted && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
              {comment.isResolved && (
                <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">✓ Resolved</span>
              )}
            </div>

            {/* Comment text */}
            <p className={`mt-1 text-gray-700 whitespace-pre-wrap ${comment.isDeleted ? 'italic text-gray-400' : ''}`}>
              {comment.isDeleted ? '[Comment deleted]' : renderContent(comment.content)}
            </p>

            {/* Actions */}
            {!comment.isDeleted && (
              <div className="flex items-center gap-3 mt-2">
                {onReply && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply
                  </button>
                )}

                {isOwner && onEdit && (
                  <button
                    onClick={() => onEdit(comment.id)}
                    className="text-xs text-gray-500 hover:text-blue-600"
                  >
                    Edit
                  </button>
                )}

                {isOwner && onDelete && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}

                {onResolve && (
                  <button
                    onClick={() => onResolve(comment.id)}
                    className="text-xs text-gray-500 hover:text-green-600"
                  >
                    {comment.isResolved ? 'Unresolve' : 'Resolve'}
                  </button>
                )}

                {comment.replyCount > 0 && !showReplies && (
                  <button
                    onClick={() => setShowReplies(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              depth={canNest ? depth + 1 : depth}
              maxDepth={maxDepth}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommentCard } from './CommentCard';
import { CommentForm } from './CommentForm';
import api from '@/lib/api';

interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Comment {
  id: string;
  content: string;
  parentId?: string;
  author: CommentAuthor;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isResolved: boolean;
  createdAt: string;
  replies?: Comment[];
}

interface User {
  id: string;
  name: string;
}

interface CommentSectionProps {
  processId: string;
  currentUserId?: string;
}

type SortOption = 'newest' | 'oldest' | 'most_replies';

export function CommentSection({ processId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch comments
  const fetchComments = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      const { data } = await api.get(`/processes/${processId}/comments`, {
        params: { page: pageNum, pageSize: 20, sort: sortBy },
      });

      if (append) {
        setComments((prev) => [...prev, ...data.data.comments]);
      } else {
        setComments(data.data.comments);
      }
      setTotal(data.data.total);
      setHasMore(data.data.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [processId, sortBy]);

  // Fetch users for mention autocomplete
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || []);
    } catch (err) {
      // Silently fail - mentions just won't autocomplete
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchComments(1);
    fetchUsers();
  }, [fetchComments, fetchUsers]);

  // Create comment
  const handleCreateComment = async (content: string, parentId?: string) => {
    try {
      const { data } = await api.post(`/processes/${processId}/comments`, {
        content,
        parentId,
      });

      if (parentId) {
        // Add reply to parent's replies array
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replyCount: c.replyCount + 1,
                replies: [...(c.replies || []), data.data],
              };
            }
            return c;
          })
        );
      } else {
        // Add to top of list
        setComments((prev) => [data.data, ...prev]);
        setTotal((t) => t + 1);
      }

      setReplyingTo(null);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to post comment');
    }
  };

  // Update comment
  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const { data } = await api.put(`/comments/${commentId}`, { content });

      // Update in state (recursive for nested)
      const updateInTree = (comments: Comment[]): Comment[] =>
        comments.map((c) => {
          if (c.id === commentId) {
            return { ...c, ...data.data };
          }
          if (c.replies) {
            return { ...c, replies: updateInTree(c.replies) };
          }
          return c;
        });

      setComments(updateInTree);
      setEditingId(null);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update comment');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);

      // Mark as deleted in state
      const markDeleted = (comments: Comment[]): Comment[] =>
        comments.map((c) => {
          if (c.id === commentId) {
            return { ...c, isDeleted: true, content: '[Comment deleted]' };
          }
          if (c.replies) {
            return { ...c, replies: markDeleted(c.replies) };
          }
          return c;
        });

      setComments(markDeleted);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  // Toggle resolve
  const handleResolve = async (commentId: string) => {
    try {
      const { data } = await api.patch(`/comments/${commentId}/resolve`);

      const updateResolved = (comments: Comment[]): Comment[] =>
        comments.map((c) => {
          if (c.id === commentId) {
            return { ...c, isResolved: data.data.isResolved };
          }
          if (c.replies) {
            return { ...c, replies: updateResolved(c.replies) };
          }
          return c;
        });

      setComments(updateResolved);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update comment');
    }
  };

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  if (loading && comments.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Comments {total > 0 && <span className="text-gray-500 font-normal">({total})</span>}
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_replies">Most Replies</option>
        </select>
      </div>

      {/* New Comment Form */}
      <div className="bg-gray-50 rounded-lg p-4">
        <CommentForm
          onSubmit={(content) => handleCreateComment(content)}
          users={users}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No comments yet</p>
          <p className="text-sm">Be the first to comment on this process</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                currentUserId={currentUserId}
                onReply={(parentId) => setReplyingTo(parentId)}
                onEdit={(id) => setEditingId(id)}
                onDelete={(id) => setDeleteConfirmId(id)}
                onResolve={handleResolve}
              />

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="ml-12 mt-2 bg-gray-50 rounded-lg p-3">
                  <CommentForm
                    onSubmit={(content) => handleCreateComment(content, comment.id)}
                    onCancel={() => setReplyingTo(null)}
                    placeholder={`Reply to ${comment.author.name}...`}
                    submitLabel="Reply"
                    autoFocus
                    users={users}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
            >
              Load more comments
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Comment?</h3>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. The comment will be replaced with "[Comment deleted]".
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteComment(deleteConfirmId)}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

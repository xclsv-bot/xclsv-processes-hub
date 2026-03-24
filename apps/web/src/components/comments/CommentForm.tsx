'use client';

import { useState, useRef, useEffect } from 'react';

interface User {
  id: string;
  name: string;
}

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  initialContent?: string;
  maxLength?: number;
  autoFocus?: boolean;
  users?: User[]; // For mention autocomplete
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  submitLabel = 'Comment',
  initialContent = '',
  maxLength = 2000,
  autoFocus = false,
  users = [],
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionSearch(atMatch[1].toLowerCase());
      setShowMentions(true);
      // Position the dropdown (simplified)
      if (textareaRef.current) {
        setMentionPosition({ top: 40, left: 10 });
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: User) => {
    const cursorPos = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    
    // Replace the @partial with @username
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${user.name.split(' ')[0]} `);
    setContent(newTextBefore + textAfterCursor);
    setShowMentions(false);

    // Refocus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
    // Cancel on Escape
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(mentionSearch)
  ).slice(0, 5);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
      />

      {/* Mention Autocomplete */}
      {showMentions && filteredUsers.length > 0 && mentionPosition && (
        <div
          className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
          style={{ top: mentionPosition.top, left: mentionPosition.left }}
        >
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                {user.name.charAt(0)}
              </div>
              <span className="text-sm">{user.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs ${content.length > maxLength * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
          {content.length}/{maxLength}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting || content.length > maxLength}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : submitLabel}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1">
        Use @name to mention someone. Press Cmd+Enter to submit.
      </p>
    </form>
  );
}

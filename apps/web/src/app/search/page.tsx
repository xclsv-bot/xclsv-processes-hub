'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Input, Button, Badge, Card } from '@/components/ui';
import ReactMarkdown from 'react-markdown';

const AREAS = ['AFFILIATE', 'EVENTS', 'INFLUENCER', 'PARTNERS', 'CRM', 'OPERATIONS', 'FINANCE', 'HR', 'GENERAL'];

interface AiSearchResult {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    slug: string;
    area: string;
    relevance: number;
    snippet: string;
  }>;
  relatedQuestions: string[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiSearchResult | null>(null);

  // AI Search mutation
  const aiSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await api.post('/search/ai', { query: searchQuery, limit: 5 });
      // API returns { data: { answer, sources, relatedQuestions } }
      return response.data.data as AiSearchResult;
    },
    onSuccess: (data) => {
      setAiResult(data);
    },
  });

  // Fallback keyword search
  const { data: keywordResults, isLoading: keywordLoading } = useQuery({
    queryKey: ['search', query, selectedArea],
    queryFn: async () => {
      if (!query) return { data: [], total: 0 };
      const params = new URLSearchParams({ q: query });
      if (selectedArea) params.append('area', selectedArea);
      const { data } = await api.get(`/search?${params}`);
      return data;
    },
    enabled: !!query && !aiResult,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAiResult(null);
    aiSearchMutation.mutate(query);
  };

  const handleRelatedQuestion = (question: string) => {
    setQuery(question);
    setAiResult(null);
    aiSearchMutation.mutate(question);
  };

  const isLoading = aiSearchMutation.isPending || keywordLoading;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* ChatGPT-style header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Process Hub</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ask anything about XCLSV processes
          </p>
        </div>

        {/* Search input - ChatGPT style */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="How do I process ambassador payroll?"
              className="w-full py-4 px-6 text-lg rounded-full border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 pr-16"
            />
            <Button 
              type="submit" 
              loading={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-4"
            >
              {isLoading ? '...' : '→'}
            </Button>
          </div>
        </form>

        {/* Area filter pills */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <Badge
            variant={selectedArea === null ? 'success' : 'default'}
            className="cursor-pointer"
            onClick={() => setSelectedArea(null)}
          >
            All
          </Badge>
          {AREAS.map((area) => (
            <Badge
              key={area}
              variant={selectedArea === area ? 'success' : 'default'}
              className="cursor-pointer"
              onClick={() => setSelectedArea(area)}
            >
              {area}
            </Badge>
          ))}
        </div>

        {/* AI Answer */}
        {aiResult && (
          <div className="space-y-6">
            {/* Answer card */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-blue-200 dark:border-blue-800">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{aiResult.answer}</ReactMarkdown>
              </div>
            </Card>

            {/* Sources */}
            {aiResult.sources && aiResult.sources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Sources
                </h3>
                <div className="space-y-3">
                  {aiResult.sources.map((source) => (
                    <Link key={source.id} href={`/processes/${source.id}`}>
                      <Card variant="bordered" className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-blue-600 dark:text-blue-400 truncate">
                              {source.title}
                            </h4>
                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                              {source.snippet}
                            </p>
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-1">
                            <Badge size="sm">{source.area}</Badge>
                            <span className="text-xs text-gray-400">
                              {Math.round(source.relevance * 100)}% match
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related questions */}
            {aiResult.relatedQuestions && aiResult.relatedQuestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Related Questions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {aiResult.relatedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleRelatedQuestion(question)}
                      className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {aiSearchMutation.isError && (
          <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">
              AI search failed. Showing keyword results instead.
            </p>
          </Card>
        )}

        {/* Fallback keyword results when AI fails or no query */}
        {!aiResult && keywordResults?.data && keywordResults.data.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{keywordResults.total} results</p>
            {keywordResults.data.map((result: any) => (
              <Link key={result.id} href={`/processes/${result.id}`}>
                <Card variant="bordered" className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{result.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {result.snippet}
                      </p>
                    </div>
                    <Badge size="sm">{result.area}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!query && !aiResult && (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-lg mb-4">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'How do I process ambassador payroll?',
                'What is the bar outreach process?',
                'How do I onboard a new affiliate?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleRelatedQuestion(suggestion)}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

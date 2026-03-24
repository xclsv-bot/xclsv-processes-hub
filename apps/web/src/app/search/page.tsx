'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Input, Button, Badge, Card } from '@/components/ui';

const AREAS = ['EVENTS', 'INFLUENCER', 'PARTNERS', 'CRM', 'OPERATIONS', 'FINANCE', 'HR', 'GENERAL'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', searchQuery, selectedArea],
    queryFn: async () => {
      if (!searchQuery) return { data: [], total: 0 };
      const params = new URLSearchParams({ q: searchQuery });
      if (selectedArea) params.append('area', selectedArea);
      const { data } = await api.get(`/search?${params}`);
      return data;
    },
    enabled: !!searchQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Search Processes</h1>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for processes..."
              className="flex-1"
            />
            <Button type="submit" loading={isLoading}>
              Search
            </Button>
          </div>
        </form>

        {/* Area filters */}
        <div className="flex flex-wrap gap-2 mb-6">
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

        {/* Results */}
        {error && (
          <p className="text-red-500">Search failed. Please try again.</p>
        )}

        {data?.data && data.data.length === 0 && searchQuery && (
          <p className="text-gray-500">No results found for "{searchQuery}"</p>
        )}

        {data?.data && data.data.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{data.total} results</p>
            {data.data.map((result: any) => (
              <Link key={result.id} href={`/processes/${result.id}`}>
                <Card variant="bordered" className="hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{result.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {result.snippet}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge size="sm">{result.area}</Badge>
                      <Badge 
                        size="sm" 
                        variant={result.matchType === 'semantic' ? 'info' : 'default'}
                      >
                        {result.matchType}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

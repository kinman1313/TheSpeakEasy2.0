"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react'; // Icons
import Image from 'next/image'; // For displaying GIFs

interface GifObject {
  id: string;
  images: {
    fixed_height: {
      url: string;
      width?: string;
      height?: string;
    };
    // Add other Giphy image formats if needed, e.g., original
  };
  title?: string; // Alt text for the GIF
}

interface GiphyPickerProps {
  onSelectGif: (gifUrl: string) => void;
  onClose: () => void;
}

// Mock Giphy API Response Structure (Simplified)
const mockGiphyData: GifObject[] = [
  { id: '1', images: { fixed_height: { url: 'https://media.giphy.com/media/Vh8pbGX3SGRwA/giphy.gif', width: '200', height: '150' } }, title: 'Funny Cat GIF' },
  { id: '2', images: { fixed_height: { url: 'https://media.giphy.com/media/3o7TKsWn5LzAMB4ZWM/giphy.gif', width: '200', height: '112' } }, title: 'Dancing GIF' },
  { id: '3', images: { fixed_height: { url: 'https://media.giphy.com/media/l3q2zbskZq2P44woM/giphy.gif', width: '200', height: '112' } }, title: 'Excited GIF' },
  { id: '4', images: { fixed_height: { url: 'https://media.giphy.com/media/d2Z9QYzA2aidiWn6/giphy.gif', width: '200', height: '150' } }, title: 'Thumbs Up GIF' },
];

export default function GiphyPicker({ onSelectGif, onClose }: GiphyPickerProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GifObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(mockGiphyData); // Show default mocks if search is empty
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const filteredResults = mockGiphyData.filter(gif =>
        gif.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filteredResults.length > 0 ? filteredResults : mockGiphyData.slice(0,2)); // Show some if no results
      setIsLoading(false);
    }, 1000);
  };

  // Show initial set of GIFs on mount
  useEffect(() => {
    setSearchResults(mockGiphyData);
  }, []);


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card p-4 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Search GIFs</h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Giphy picker">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search GIPHY"
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </Button>
        </form>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2 pr-1">
          {isLoading && searchResults.length === 0 && ( // Show loader only if no results yet
            <div className="col-span-full flex justify-center items-center p-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && searchResults.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">No GIFs found. Try another search?</p>
          )}
          {searchResults.map((gif) => (
            <div
              key={gif.id}
              className="cursor-pointer aspect-square relative overflow-hidden rounded group bg-muted"
              onClick={() => onSelectGif(gif.images.fixed_height.url)}
            >
              <Image
                src={gif.images.fixed_height.url}
                alt={gif.title || 'GIF'}
                layout="fill"
                objectFit="cover" // Or "contain" depending on desired look
                className="group-hover:scale-105 transition-transform duration-150"
                unoptimized // If Giphy URLs are not configured in next.config.js
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

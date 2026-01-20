import { useState, useEffect, useRef } from 'react';
import type { Page, SearchResult } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: Page) => void;
}

export default function SearchModal({ isOpen, onClose, onSelectPage }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      
      const searchResults = await window.electronAPI.searchPages(query);
      setResults(searchResults);
      setSelectedIndex(0);
    };
    
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (result: SearchResult) => {
    const page = await window.electronAPI.getPage(result.id);
    if (page) {
      onSelectPage(page);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = { note: '📝', task: '✓', doc: '📄' };
    return icons[type as keyof typeof icons] || '📄';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-24 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-96 flex flex-col">
        {/* Search input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg outline-none"
              placeholder="Поиск по страницам..."
            />
            <kbd className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">Esc</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Введите минимум 2 символа для поиска</p>
              <p className="text-sm mt-2">Поиск работает по названию и содержимому</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Ничего не найдено</p>
            </div>
          ) : (
            <div>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-4 cursor-pointer border-b border-gray-100 ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getTypeIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1">{result.title}</h3>
                      {result.snippet && (
                        <p
                          className="text-sm text-gray-600"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex items-center justify-between">
          <span>💡 Используйте ↑↓ для навигации, Enter для выбора</span>
          <span>Ctrl+K для поиска</span>
        </div>
      </div>

      {/* Backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
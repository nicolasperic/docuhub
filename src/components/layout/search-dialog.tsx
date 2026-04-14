"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface RecentSearch {
  id: string;
  query: string;
}

interface DocResult {
  id: string;
  title: string;
  slug: string;
  spaceName: string;
  spaceSlug: string;
  activityType: string | null;
  activityDate: string | null;
}

function formatActivity(type: string | null, date: string | null): string | null {
  if (!type || !date) return null;
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const verb = type === "EDIT" ? "edited" : type === "VIEW" ? "viewed" : type === "PUBLISHED" ? "published" : null;
  if (!verb) return null;
  return `You ${verb} ${month} ${year}`;
}

export function SearchDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recommendations, setRecommendations] = useState<DocResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut — focus the input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape and blur input
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Fetch initial data when dropdown opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    fetch("/api/search?mode=initial")
      .then((r) => r.json())
      .then((data) => {
        setRecentSearches(data.recentSearches ?? []);
        setRecommendations(data.recommendations ?? []);
      })
      .catch(() => {});
  }, [open]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(value.trim())}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
  }, []);

  const selectDocument = useCallback(
    (spaceSlug: string, docSlug: string) => {
      setOpen(false);
      router.push(`/spaces/${spaceSlug}/${docSlug}`);
    },
    [router]
  );

  const removeRecentSearch = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setRecentSearches((prev) => prev.filter((s) => s.id !== id));
      fetch(`/api/search/recent?id=${id}`, { method: "DELETE" }).catch(() => {});
    },
    []
  );

  const selectRecentSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      inputRef.current?.focus();
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    []
  );

  const hasQuery = query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search documents..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pl-9 pr-12 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full">
          <Command shouldFilter={false} className="rounded-md border bg-popover shadow-md">
            <CommandList>
              {hasQuery ? (
                <>
                  <CommandEmpty>
                    {loading ? "Searching..." : "No results found."}
                  </CommandEmpty>
                  <CommandGroup heading="Search Results">
                    {results.map((doc) => (
                      <CommandItem
                        key={doc.id}
                        value={doc.title}
                        onSelect={() => selectDocument(doc.spaceSlug, doc.slug)}
                      >
                        <FileText className="size-4 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <span className="truncate">{doc.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {doc.spaceName}
                            {formatActivity(doc.activityType, doc.activityDate) &&
                              ` · ${formatActivity(doc.activityType, doc.activityDate)}`}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              ) : (
                <>
                  {recentSearches.length > 0 && (
                    <CommandGroup heading="Recent Searches">
                      {recentSearches.map((search) => (
                        <CommandItem
                          key={search.id}
                          value={search.query}
                          onSelect={() => selectRecentSearch(search.query)}
                        >
                          <span className="flex-1 truncate">&ldquo;{search.query}&rdquo;</span>
                          <button
                            type="button"
                            className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                            onClick={(e) => removeRecentSearch(e, search.id)}
                          >
                            <X className="size-3.5" />
                          </button>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {recentSearches.length > 0 && recommendations.length > 0 && (
                    <CommandSeparator />
                  )}
                  {recommendations.length > 0 && (
                    <CommandGroup heading="Recommendations">
                      {recommendations.map((doc) => (
                        <CommandItem
                          key={doc.id}
                          value={doc.title}
                          onSelect={() => selectDocument(doc.spaceSlug, doc.slug)}
                        >
                          <FileText className="size-4 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="truncate">{doc.title}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {doc.spaceName}
                              {formatActivity(doc.activityType, doc.activityDate) &&
                                ` · ${formatActivity(doc.activityType, doc.activityDate)}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {recentSearches.length === 0 && recommendations.length === 0 && (
                    <CommandEmpty>Start typing to search documents.</CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

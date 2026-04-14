"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FavoriteItem {
  id: string;
  createdAt: string;
  document: {
    id: string;
    title: string;
    slug: string;
    author: { name: string | null };
    space: { name: string; slug: string };
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  async function load() {
    const res = await fetch("/api/favorites");
    if (res.ok) setFavorites(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function removeFavorite(documentId: string) {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    if (res.ok) {
      toast.success("Removed from favorites");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Favorites</h1>
        <p className="text-muted-foreground">Your bookmarked documents</p>
      </div>

      <div className="space-y-2">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <Link
              href={`/spaces/${fav.document.space.slug}/${fav.document.slug}`}
              className="flex items-center gap-3 hover:underline"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{fav.document.title}</p>
                <p className="text-sm text-muted-foreground">
                  {fav.document.space.name} &middot; {fav.document.author.name}
                </p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFavorite(fav.document.id)}
            >
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </Button>
          </div>
        ))}
        {favorites.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="mx-auto mb-2 h-8 w-8" />
            <p>No favorites yet. Star documents to quickly access them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { prisma } from "@/lib/database/prisma";
import type { Charter } from "@fishon/ui";

export interface FavoriteWithCharter {
  id: string;
  captainCharterId: string;
  charterName: string;
  location: string;
  notes: string | null;
  addedAt: Date;
  charterData: Charter | null;
}

/**
 * Get all favorites for a user
 */
export async function getUserFavorites(
  userId: string
): Promise<FavoriteWithCharter[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  });

  return favorites.map((fav) => ({
    id: fav.id,
    captainCharterId: fav.captainCharterId,
    charterName: fav.charterName,
    location: fav.location,
    notes: fav.notes,
    addedAt: fav.addedAt,
    charterData: fav.charterData as Charter | null,
  }));
}

/**
 * Check if a charter is favorited by user
 */
export async function isFavorited(
  userId: string,
  captainCharterId: string
): Promise<boolean> {
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_captainCharterId: {
        userId,
        captainCharterId,
      },
    },
  });

  return !!favorite;
}

/**
 * Add a charter to favorites
 */
export async function addFavorite(
  userId: string,
  captainCharterId: string,
  charterName: string,
  location: string,
  charterData?: Charter | null,
  notes?: string
): Promise<FavoriteWithCharter> {
  const favorite = await prisma.favorite.create({
    data: {
      userId,
      captainCharterId,
      charterName,
      location,
      charterData: charterData as any,
      notes,
    },
  });

  return {
    id: favorite.id,
    captainCharterId: favorite.captainCharterId,
    charterName: favorite.charterName,
    location: favorite.location,
    notes: favorite.notes,
    addedAt: favorite.addedAt,
    charterData: favorite.charterData as Charter | null,
  };
}

/**
 * Remove a charter from favorites
 */
export async function removeFavorite(
  userId: string,
  favoriteId: string
): Promise<void> {
  // Verify ownership before deletion
  await prisma.favorite.deleteMany({
    where: {
      id: favoriteId,
      userId, // Ensure user owns this favorite
    },
  });
}

/**
 * Remove favorite by charter ID
 */
export async function removeFavoriteByCharterId(
  userId: string,
  captainCharterId: string
): Promise<void> {
  await prisma.favorite.deleteMany({
    where: {
      userId,
      captainCharterId,
    },
  });
}

/**
 * Get favorite count for a user
 */
export async function getFavoriteCount(userId: string): Promise<number> {
  return await prisma.favorite.count({
    where: { userId },
  });
}

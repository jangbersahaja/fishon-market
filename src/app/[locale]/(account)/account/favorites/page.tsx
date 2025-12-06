import { EmptyState } from "@/components/account";
import BaseCharterCard from "@/components/charters/BaseCharterCard";
import { auth } from "@/lib/auth/auth";
import { getUserFavorites } from "@/lib/services/favorite-service";
import { getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "My Favorites - Fishon.my",
  description: "View your saved fishing charters",
};

type RouteParams = Promise<{ locale: string }>;

export default async function FavoritesPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  
  const session = await auth();

  const locale = await getLocale();

  if (!session?.user?.id) {
    redirect(`/${locale}/login?next=/${locale}/account/favorites`);
  }

  const favorites = await getUserFavorites(session.user.id);

  if (favorites.length === 0) {
    return (
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="mt-1 text-sm text-gray-500">
            Charters you&apos;ve saved for later
          </p>
        </div>

        <EmptyState
          icon="inbox"
          title="No favorites yet"
          description="Save charters you're interested in to easily find them later"
          action={{
            label: "Browse Charters",
            href: `/${locale}/search`,
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
        <p className="mt-1 text-sm text-gray-500">
          {favorites.length} saved{" "}
          {favorites.length === 1 ? "charter" : "charters"}
        </p>
      </div>

      {/* Grid of Favorites */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map((favorite) => {
          const charter = favorite.charterData;

          return (
            <BaseCharterCard
              key={favorite.id}
              charter={charter as any}
              variant="favorite"
              imageAspect="square"
              notes={favorite.notes || undefined}
              savedAt={favorite.addedAt}
              showFavoriteButton={true}
              initialIsFavorited={true}
            />
          );
        })}
      </div>
    </div>
  );
}

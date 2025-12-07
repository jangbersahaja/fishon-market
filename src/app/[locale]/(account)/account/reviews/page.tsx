import { UserReviewsList } from "@/components/account/UserReviewsList";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import { getUserReviews } from "@/lib/services/review-service";
import { ArrowLeft } from "lucide-react";
import { getLocale, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type RouteParams = Promise<{ locale: string }>;

export default async function UserReviewsPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/login?next=/${locale}/account/reviews`);
  }

  const reviews = await getUserReviews(session.user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600 mt-1">
            Manage your charter reviews and feedback
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/account/bookings`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Link>
        </Button>
      </div>

      {/* Reviews List */}
      <UserReviewsList reviews={reviews} />
    </div>
  );
}

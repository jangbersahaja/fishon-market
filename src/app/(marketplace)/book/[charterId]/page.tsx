import { BookingProgressTimeline } from "@/components/booking";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { getCharterById } from "@/lib/services/charter-service";
import { notFound } from "next/navigation";
import CheckoutForm from "./ui/CheckoutForm";

type RouteParams = Promise<{
  charterId: string;
}>;

type RouteSearchParams = Promise<{
  trip_index?: string;
  date?: string;
  days?: string;
  adults?: string;
  children?: string;
  start_time?: string;
}>;

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: RouteSearchParams;
}) {
  const session = await auth();
  const { charterId } = await params;
  const sp = await searchParams;

  // Fetch charter data
  const charter = await getCharterById(charterId);

  // Return 404 if charter not found
  if (!charter) {
    notFound();
  }

  const tripIndex = Number.isFinite(Number(sp.trip_index))
    ? Number(sp.trip_index)
    : 0;
  const trips = Array.isArray(charter.trip) ? charter.trip : [];
  const selectedTrip = trips[tripIndex] ?? trips[0];
  const startTimes: string[] | undefined = Array.isArray(
    (selectedTrip as any)?.startTimes
  )
    ? (selectedTrip as any).startTimes
    : undefined;
  const defaultStartTime =
    sp.start_time && typeof sp.start_time === "string"
      ? sp.start_time
      : undefined;

  // Prefill user details if available
  let defaultUser:
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;
  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: String((session.user as any).id) },
        select: { name: true, email: true },
      });
      if (user) {
        const name = user.name || "";
        const [firstName, ...rest] = name.split(" ");
        const lastName = rest.join(" ").trim() || undefined;
        defaultUser = {
          firstName: firstName || undefined,
          lastName,
          email: user.email || undefined,
        };
      }
    } catch {}
  } else if (session?.user?.email) {
    defaultUser = { email: session.user.email || undefined };
  }

  const charterData = {
    id: charterId,
    name: charter.name,
    address: charter.address,
    location: charter.location,
    species: charter.species,
    techniques: charter.techniques,
    images:
      Array.isArray(charter.images) && charter.images.length
        ? charter.images
        : charter.imageUrl
        ? [charter.imageUrl]
        : ["/placeholder-1.jpg"],
    boat: charter.boat,
    includes: charter.includes,
    coordinates: charter.coordinates,
    captain: charter.captain,
  };

  return (
    <main className="w-full min-h-screen px-4 py-6 mx-auto bg-gray-50 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
          Complete Your Booking
        </h1>
        <p className="mb-6 text-sm text-gray-600 sm:text-base">
          Review your trip details and tell the captain about yourself
        </p>

        {/* Progress Timeline */}
        <div className="px-4 py-6 mb-6 bg-white border border-gray-200 rounded-lg sm:px-8">
          <BookingProgressTimeline currentStep="details" />
        </div>

        <CheckoutForm
          startTimes={startTimes}
          defaultStartTime={defaultStartTime}
          trips={trips as any}
          selectedTripIndex={tripIndex}
          charter={charterData as any}
          defaultUser={defaultUser}
        />
      </div>
    </main>
  );
}

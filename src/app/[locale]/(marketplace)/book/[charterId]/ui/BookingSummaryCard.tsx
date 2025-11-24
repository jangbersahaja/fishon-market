"use client";

import { AMENITIES_OPTIONS } from "@/data/amenities";
import { BOAT_FEATURE_OPTIONS } from "@/data/boatFeatures";
import { MapPin, Ship } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

interface Boat {
  name?: string;
  type?: string;
  features?: string[];
}

interface Charter {
  id?: string;
  name?: string;
  address?: string;
  location?: string;
  images?: string[];
  boat?: Boat;
  includes?: string[];
  coordinates?: { lat: number; lng: number };
}

interface Captain {
  name: string;
  avatarUrl?: string;
}

interface PricingBreakdown {
  tripPrice: number;
  days: number;
  subtotal: number;
  platformFee: number;
  discount: number;
  paymentGatewayFee: number;
  sst: number;
  finalPrice: number;
  captainEarnings: number;
}

interface BookingSummaryCardProps {
  charter?: Charter;
  captain?: Captain | null;
  totalPrice?: number | null; // Legacy, remove after full migration
  pricingBreakdown?: PricingBreakdown | null;
}

export default function BookingSummaryCard({
  charter,
  captain,
  totalPrice,
  pricingBreakdown,
}: BookingSummaryCardProps) {
  const t = useTranslations("booking.checkout.summary");
  const locale = useLocale();
  const images = charter?.images || [];
  const mainImage = images[0] || "/placeholder-1.jpg";
  const sideImages = images.slice(1, 3);

  // Helper function to get localized label for amenity
  const getAmenityLabel = (key: string) => {
    const amenity = AMENITIES_OPTIONS.find((a) => a.key === key);
    if (!amenity) return key;
    return locale === "my" ? amenity.labelMy : amenity.label;
  };

  // Helper function to get localized label for boat feature
  const getFeatureLabel = (key: string) => {
    const feature = BOAT_FEATURE_OPTIONS.find((f) => f.key === key);
    if (!feature) return key;
    return locale === "my" ? feature.labelMy : feature.label;
  };

  const mapEmbedSrc = charter?.coordinates
    ? `https://www.google.com/maps?q=${charter.coordinates.lat},${charter.coordinates.lng}&z=13&output=embed`
    : charter?.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(
          charter.address
        )}&z=13&output=embed`
      : null;

  return (
    <aside className="p-3 bg-white border rounded-lg border-black/10 sm:p-5 h-fit">
      <h2 className="mb-3 text-base font-semibold sm:text-lg">{t("title")}</h2>

      {/* Photo Collage */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-3 overflow-hidden h-60 sm:h-48 rounded-lg">
          {/* Main large image */}
          <div className="relative h-full col-span-2 bg-gray-100 sm:col-span-1 sm:row-span-2">
            <Image
              src={mainImage}
              alt={charter?.name || "Charter"}
              fill
              sizes="(max-width: 640px) 100vw, 300px"
              className="object-cover"
            />
          </div>

          {/* Two smaller images on the right */}
          {sideImages.map((img, idx) => (
            <div
              key={idx}
              className="relative hidden overflow-hidden bg-gray-100 sm:block"
            >
              <Image
                src={img}
                alt={`${charter?.name} - ${idx + 2}`}
                fill
                sizes="150px"
                className="object-cover"
              />
            </div>
          ))}

          {/* Fallback if only one image */}
          {sideImages.length === 0 && (
            <>
              <div className="relative hidden overflow-hidden bg-gray-200 sm:block aspect-video">
                <div className="flex items-center justify-center w-full h-full text-gray-400">
                  <Ship className="w-8 h-8" />
                </div>
              </div>
              <div className="relative hidden overflow-hidden bg-gray-200 sm:block aspect-video">
                <div className="flex items-center justify-center w-full h-full text-gray-400">
                  <Ship className="w-8 h-8" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Charter Info */}
      <div className="pb-3 mb-3 border-b border-black/10">
        <h3 className="text-base font-semibold">
          {charter?.name || "Charter"}
        </h3>
        {captain?.name && (
          <p className="mt-1 text-sm text-gray-600">
            {t("captain")}{" "}
            <span className="font-medium text-gray-800">{captain.name}</span>
          </p>
        )}
      </div>

      {/* Boat Details */}
      {charter?.boat && (
        <div className="pb-3 mb-3 border-b border-black/10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Ship className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-semibold">
              {charter.boat.name || t("vessel")}
            </h4>
            {charter.boat.type && (
              <p className="text-sm text-gray-600">- {charter.boat.type}</p>
            )}
          </div>

          {charter.boat.features && charter.boat.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {charter.boat.features.slice(0, 3).map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700"
                >
                  {getFeatureLabel(feature)}
                </span>
              ))}
              {charter.boat.features.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {t("moreFeatures", {
                    count: charter.boat.features.length - 3,
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      {mapEmbedSrc && (
        <div className="pb-3 mb-3 border-b border-black/10">
          <div className="overflow-hidden rounded-lg">
            <iframe
              src={mapEmbedSrc}
              width="100%"
              height="200"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Starting location"
              className="w-full"
            />
          </div>
          {charter?.address && (
            <div className="mt-4">
              <h4 className="mb-1.5 text-sm font-semibold">
                {t("startingPoint")}
              </h4>
              <div className="flex items-start gap-1.5 mt-1.5 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="capitalize">{charter.address}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Amenities */}
      {charter?.includes && charter.includes.length > 0 && (
        <div className="">
          <h4 className="mb-1.5 text-sm font-semibold">{t("included")}</h4>
          <div className="flex flex-wrap gap-1.5">
            {charter.includes.slice(0, 4).map((item) => (
              <span
                key={item}
                className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200"
              >
                {getAmenityLabel(item)}
              </span>
            ))}
            {charter.includes.length > 4 && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">
                {t("moreFeatures", { count: charter.includes.length - 4 })}
              </span>
            )}
          </div>
        </div>
      )}

      {(pricingBreakdown || totalPrice) && (
        <>
          {/* Pricing Breakdown */}
          <div className="pt-3 mt-3 border-t border-black/10">
            {pricingBreakdown ? (
              <>
                {/* Itemized Breakdown */}
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {t("tripPrice", { days: pricingBreakdown.days })}
                    </span>
                    <span className="font-medium">
                      RM{pricingBreakdown.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t("commission")}</span>
                    <span className="font-medium">
                      RM{pricingBreakdown.platformFee.toFixed(2)}
                    </span>
                  </div>
                  {pricingBreakdown.discount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t("discount")}</span>
                      <span className="font-medium text-green-600">
                        -RM{pricingBreakdown.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t("serviceFee")}</span>
                    <span className="font-medium">
                      RM{pricingBreakdown.paymentGatewayFee.toFixed(2)}
                    </span>
                  </div>
                  {pricingBreakdown.sst > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t("sst")}</span>
                      <span className="font-medium">
                        RM{pricingBreakdown.sst.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-black/10">
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>{t("total")}</span>
                    <span className="text-[#ec2227]">
                      RM{pricingBreakdown.finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              // Legacy: show simple total
              <div className="flex items-center justify-between text-base font-semibold">
                <span>{t("totalEstimate")}</span>
                <span className="text-[#ec2227]">RM{totalPrice}</span>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <details className="mt-3 text-xs text-gray-600">
            <summary className="font-medium cursor-pointer select-none hover:text-gray-900">
              {t("paymentInfo")}
            </summary>
            <p className="mt-1.5 leading-relaxed p-2 border rounded-md border-slate-200 bg-slate-50">
              {pricingBreakdown ? t("paymentInfoAuto") : t("paymentInfoManual")}
            </p>
          </details>

          {/* Cancellation Policy Note */}

          <details className="mt-3 text-xs text-gray-600">
            <summary className="font-medium cursor-pointer select-none hover:text-gray-900">
              {t("cancellationNotes")}
            </summary>
            <ul className="space-y-0.5 my-1.5 leading-relaxed p-2 border rounded-md border-slate-200 bg-slate-50">
              <li>• {t("cancellationPolicy1")}</li>
              <li>• {t("cancellationPolicy2")}</li>
              <li>• {t("cancellationPolicy3")}</li>
            </ul>
            <p>{t("cancellationRefund")}</p>
            <p>{t("refundTiming")}</p>
          </details>
        </>
      )}
    </aside>
  );
}

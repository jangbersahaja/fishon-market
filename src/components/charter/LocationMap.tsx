"use client";

import { useTranslations } from "next-intl";

export default function LocationMap({
  title,
  mapEmbedSrc,
}: {
  title: string;
  mapEmbedSrc: string;
}) {
  const t = useTranslations("charter.location");

  return (
    <section className="p-5 bg-white shadow-lg rounded-2xl">
      <div className="px-0">
        <h3 className="text-base font-semibold sm:text-lg">{t("title")}</h3>
        <p className="mt-1 text-xs text-gray-500">{t("subtitle")}</p>
      </div>
      <div className="relative mt-3">
        <iframe
          title={t("mapTitle", { title })}
          src={mapEmbedSrc}
          className="block w-full border border-gray-200 rounded-lg shadow"
          style={{ aspectRatio: "16 / 9", border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}

// src/app/charters/view/page.tsx
import { getCharters } from "@/lib/services/charter-service";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function ViewIndex() {
  const locale = await getLocale();
  const t = await getTranslations("charter");
  const charters = await getCharters();
  const first = charters[0];

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">{t("chartersTitle")}</h1>
      {!first ? (
        <p className="mt-2 text-gray-600">{t("noChartersAvailable")}</p>
      ) : (
        <div className="mt-2">
          <p className="text-gray-700">{t("tryASampleCharter")}</p>
          <Link
            href={`/${locale}/charters/${
              (first as any).backendId || String(first.id)
            }`}
            className="text-red-600 underline"
          >
            {t("view")} {first.name}
          </Link>
        </div>
      )}
    </main>
  );
}

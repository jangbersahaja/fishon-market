// src/app/charters/view/page.tsx
import { getCharters } from "@/lib/services/charter-service";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

type RouteParams = Promise<{ locale: string }>;

export default async function ChartersPage({
  params,
}: {
  params: RouteParams;
}) {
  noStore();
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "charter" });
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

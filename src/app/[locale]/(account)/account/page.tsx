import { getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type RouteParams = Promise<{ locale: string }>;

export default async function AccountPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  
  const locale = await getLocale();
  redirect(`/${locale}/account/overview`);
}

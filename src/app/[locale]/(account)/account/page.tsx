import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const locale = await getLocale();
  redirect(`/${locale}/account/overview`);
}

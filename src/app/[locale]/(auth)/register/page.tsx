import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account - Fishon",
  description:
    "Create your Fishon account to start booking amazing fishing charters in Malaysia.",
};

type RouteParams = Promise<{ locale: string }>;

export default async function RegisterPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  return <RegisterClient />;
}

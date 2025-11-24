import { defaultLocale } from "@/i18n/config";
import { redirect } from "next/navigation";

/**
 * Root page redirect
 *
 * When users access the root path (/), redirect them to the default locale.
 * This ensures proper i18n routing when the middleware doesn't catch the request.
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}

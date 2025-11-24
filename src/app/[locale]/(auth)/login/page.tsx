import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In - Fishon",
  description:
    "Sign in to your Fishon account to book fishing charters and manage your bookings.",
};

export default function LoginPage() {
  return <LoginClient />;
}

import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account - Fishon",
  description:
    "Create your Fishon account to start booking amazing fishing charters in Malaysia.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}

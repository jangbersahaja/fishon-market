"use client";

import { createContactPointSchema, serializeSchema } from "@/lib/seo";
import { Anchor, HelpCircle, LifeBuoy, Mail, Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// NOTE: If you later add a server action or API route, you can swap the mailto fallback with a real submit.

// ContactPoint schema for structured data
const contactPointSchema = createContactPointSchema(
  "Customer Service",
  "+60",
  "support@fishon.my"
);

type Topic =
  | "General"
  | "Booking Support"
  | "Captain Onboarding"
  | "Partnerships"
  | "Press / Media";

export default function ContactPage() {
  const t = useTranslations("contactPage");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "General" as Topic,
    message: "",
    charterUrl: "",
    honey: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => validate(form, t), [form, t]);

  const isValid = Object.keys(errors).length === 0;

  const submitViaMailto = () => {
    // Basic honeypot
    if (form.honey) return;

    const subject = encodeURIComponent(
      `[${form.topic}] ${form.name || "Fishon.my Enquiry"}`
    );

    const lines = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : "",
      form.charterUrl ? `Charter URL: ${form.charterUrl}` : "",
      "",
      "Message:",
      form.message,
    ].filter(Boolean);

    const body = encodeURIComponent(lines.join("\n"));

    window.location.href = `mailto:support@fishon.my?subject=${subject}&body=${body}`;
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* JSON-LD: ContactPoint schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSchema(contactPointSchema),
        }}
      />

      {/* Hero Section */}
      <div className="bg-white border-b border-neutral-200">
        <div className="px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              {t("hero.title")}{" "}
              <span className="text-[#EC2227]">Fishon.my</span>
            </h1>
            <p className="mt-4 text-lg text-neutral-600">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Contact Info & Cards */}
          <div className="space-y-6 lg:col-span-1">
            {/* Customer Support Card */}
            <div className="p-6 bg-white border shadow-sm rounded-xl border-neutral-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t("cards.customerSupport.title")}
                </h3>
              </div>
              <p className="mb-6 text-neutral-600">
                {t("cards.customerSupport.description")}
              </p>
              <a
                href="mailto:support@fishon.my"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Mail className="w-4 h-4" />
                support@fishon.my
              </a>
            </div>

            {/* Captain Onboarding Card */}
            <div className="p-6 bg-white border shadow-sm rounded-xl border-neutral-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#EC2227]/10 text-[#EC2227]">
                  <Anchor className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {t("cards.captainOnboarding.title")}
                </h3>
              </div>
              <p className="mb-6 text-neutral-600">
                {t("cards.captainOnboarding.description")}
              </p>
              <a
                href="https://fishon-captain.vercel.app/ms/list-your-business"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-[#EC2227] rounded-lg hover:bg-[#d11f24] shadow-sm"
              >
                {t("cards.captainOnboarding.cta")}
              </a>
            </div>

            {/* FAQ Section */}
            <div className="space-y-6">
              <div>
                <h4 className="flex items-center gap-2 font-medium text-neutral-900">
                  <HelpCircle className="w-4 h-4 text-neutral-500" />
                  {t("faq.whatHappens.title")}
                </h4>
                <p className="mt-2 text-sm text-neutral-600">
                  {t("faq.whatHappens.description")}
                </p>
              </div>
              <div>
                <h4 className="flex items-center gap-2 font-medium text-neutral-900">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  {t("faq.preferEmail.title")}
                </h4>
                <p className="mt-2 text-sm text-neutral-600">
                  {t("faq.preferEmail.description")}{" "}
                  <a
                    className="font-medium text-neutral-900 underline hover:text-[#EC2227]"
                    href="mailto:support@fishon.my"
                  >
                    support@fishon.my
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white border shadow-sm rounded-xl border-neutral-200 sm:p-8">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-neutral-900">
                  {t("form.title")}
                </h2>
                <p className="mt-2 text-neutral-600">{t("form.description")}</p>
              </div>

              <form
                className="grid grid-cols-1 gap-6 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setTouched({
                    name: true,
                    email: true,
                    message: true,
                  });
                  if (isValid) submitViaMailto();
                }}
                noValidate
              >
                {/* Honeypot */}
                <input
                  type="text"
                  name="company"
                  autoComplete="off"
                  className="hidden"
                  tabIndex={-1}
                  value={form.honey}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, honey: e.target.value }))
                  }
                  aria-hidden="true"
                />

                <Field
                  label={t("form.fields.name.label")}
                  name="name"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  error={touched.name ? errors.name : undefined}
                  placeholder={t("form.fields.name.placeholder")}
                  icon={<UserIcon className="w-4 h-4" />}
                />
                <Field
                  label={t("form.fields.email.label")}
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  error={touched.email ? errors.email : undefined}
                  placeholder={t("form.fields.email.placeholder")}
                  icon={<Mail className="w-4 h-4" />}
                />
                <Field
                  label={t("form.fields.phone.label")}
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  placeholder={t("form.fields.phone.placeholder")}
                  icon={<Phone className="w-4 h-4" />}
                />
                <Select
                  label={t("form.fields.topic.label")}
                  name="topic"
                  value={form.topic}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, topic: v as Topic }))
                  }
                  options={[
                    {
                      value: "General",
                      label: t("form.fields.topic.options.general"),
                    },
                    {
                      value: "Booking Support",
                      label: t("form.fields.topic.options.bookingSupport"),
                    },
                    {
                      value: "Captain Onboarding",
                      label: t("form.fields.topic.options.captainOnboarding"),
                    },
                    {
                      value: "Partnerships",
                      label: t("form.fields.topic.options.partnerships"),
                    },
                    {
                      value: "Press / Media",
                      label: t("form.fields.topic.options.pressMedia"),
                    },
                  ]}
                />
                <Field
                  className="sm:col-span-2"
                  label={t("form.fields.charterUrl.label")}
                  name="charterUrl"
                  value={form.charterUrl}
                  onChange={(v) => setForm((f) => ({ ...f, charterUrl: v }))}
                  placeholder={t("form.fields.charterUrl.placeholder")}
                  icon={<Anchor className="w-4 h-4" />}
                />
                <Textarea
                  className="sm:col-span-2"
                  label={t("form.fields.message.label")}
                  name="message"
                  value={form.message}
                  onChange={(v) => setForm((f) => ({ ...f, message: v }))}
                  onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                  error={touched.message ? errors.message : undefined}
                  placeholder={t("form.fields.message.placeholder")}
                  rows={6}
                />

                <div className="flex flex-col items-start justify-between gap-4 pt-2 sm:flex-row sm:items-center sm:col-span-2">
                  <p className="text-xs text-neutral-500">
                    {t("form.disclaimer")}
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#EC2227] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d11f24] focus:outline-none focus:ring-2 focus:ring-[#EC2227] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    disabled={!isValid}
                  >
                    <Send className="w-4 h-4" />
                    {t("form.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------------- Small UI helpers ---------------------- */

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  className = "",
  error,
  icon,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  className?: string;
  error?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="block mb-1.5 text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={[
            "block w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder:text-neutral-400",
            icon ? "pl-10" : "",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-neutral-300 focus:border-[#EC2227] focus:ring-[#EC2227]",
            "focus:outline-none focus:ring-1",
          ].join(" ")}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 5,
  className = "",
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="block mb-1.5 text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={[
          "block w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder:text-neutral-400",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-neutral-300 focus:border-[#EC2227] focus:ring-[#EC2227]",
          "focus:outline-none focus:ring-1",
        ].join(" ")}
      />
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="block mb-1.5 text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-[#EC2227] focus:outline-none focus:ring-1 focus:ring-[#EC2227]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function validate(f: { name: string; email: string; message: string }, t: any) {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = t("form.fields.name.error");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = t("form.fields.email.error");
  if (!f.message.trim()) e.message = t("form.fields.message.error");
  return e;
}

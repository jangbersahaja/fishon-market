"use client";

import { useMemo, useState } from "react";

// NOTE: If you later add a server action or API route, you can swap the mailto fallback with a real submit.

// ---- Page-level metadata (kept here for co-location; App Router also supports exporting from a server file) ----

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fishon.my",
  url: "https://www.fishon.my",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@fishon.my",
      availableLanguage: ["en", "ms"],
    },
  ],
  sameAs: [
    "https://www.facebook.com/fishon.my",
    "https://www.instagram.com/fishon.my",
  ],
};

type Topic =
  | "General"
  | "Booking Support"
  | "Captain Onboarding"
  | "Partnerships"
  | "Press / Media";

export default function ContactPage() {
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

  const errors = useMemo(() => validate(form), [form]);

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
    <main className="px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* Header */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Contact <span className="text-[#EC2227]">Fishon.my</span>
        </h1>
        <p className="mt-4 text-neutral-700">
          Questions about bookings, listing your charter, or partnerships? We’d
          love to hear from you.
        </p>
      </section>

      {/* Contact Cards */}
      <section className="grid gap-4 mb-12 sm:grid-cols-2">
        <InfoCard
          title="Customer Support"
          desc="For booking help, refunds, or account issues."
          email="support@fishon.my"
        />
        <InfoCard
          title="Captain Onboarding"
          desc="List your charter and grow with us."
          email="support@fishon.my"
          cta={{ href: "/captains/apply", label: "Apply to List" }}
        />
      </section>

      {/* Form */}
      <section className="p-6 border rounded-xl border-neutral-200">
        <h2 className="text-xl font-semibold">Send us a message</h2>
        <p className="mt-1 text-neutral-600">
          Fill out the form and we’ll get back to you. Required fields are
          marked with *.
        </p>

        <form
          className="grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2"
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
            onChange={(e) => setForm((f) => ({ ...f, honey: e.target.value }))}
            aria-hidden="true"
          />

          <Field
            label="Full Name *"
            name="name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            error={touched.name ? errors.name : undefined}
            placeholder="e.g., Aiman Roslan"
          />
          <Field
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={touched.email ? errors.email : undefined}
            placeholder="you@example.com"
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="+60 12-345 6789"
          />
          <Select
            label="Topic"
            name="topic"
            value={form.topic}
            onChange={(v) => setForm((f) => ({ ...f, topic: v as Topic }))}
            options={[
              "General",
              "Booking Support",
              "Captain Onboarding",
              "Partnerships",
              "Press / Media",
            ]}
          />
          <Field
            className="sm:col-span-2"
            label="Charter URL"
            name="charterUrl"
            value={form.charterUrl}
            onChange={(v) => setForm((f) => ({ ...f, charterUrl: v }))}
            placeholder="https://www.fishon.my/charters/your-listing"
          />
          <Textarea
            className="sm:col-span-2"
            label="Message *"
            name="message"
            value={form.message}
            onChange={(v) => setForm((f) => ({ ...f, message: v }))}
            onBlur={() => setTouched((t) => ({ ...t, message: true }))}
            error={touched.message ? errors.message : undefined}
            placeholder="Tell us how we can help…"
            rows={6}
          />

          <div className="flex items-center justify-between sm:col-span-2">
            <p className="text-xs text-neutral-500">
              By submitting, you agree to be contacted regarding your enquiry.
            </p>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-[#EC2227] px-5 py-2.5 text-white shadow hover:opacity-95 disabled:opacity-60"
              disabled={!isValid}
            >
              Send Message
            </button>
          </div>
        </form>
      </section>

      {/* FAQ / Quick help */}
      <section className="grid gap-6 mt-12 sm:grid-cols-2">
        <Card title="What happens after I send a message?">
          <p>
            We’ll review your enquiry and respond via email. For urgent booking
            issues, include your booking reference or charter URL for faster
            handling.
          </p>
        </Card>
        <Card title="Prefer email?">
          <p>
            You can email us directly at{" "}
            <a
              className="font-medium underline"
              href="mailto:support@fishon.my"
            >
              support@fishon.my
            </a>
            .
          </p>
        </Card>
      </section>
    </main>
  );
}

/* ---------------------- Small UI helpers ---------------------- */

function InfoCard({
  title,
  desc,
  email,
  cta,
}: {
  title: string;
  desc: string;
  email: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="p-5 border rounded-xl border-neutral-200">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-neutral-700">{desc}</p>
      <div className="flex flex-wrap gap-3 mt-3">
        <a
          className="inline-flex items-center px-4 py-2 border rounded-md border-neutral-300 text-neutral-900 hover:bg-neutral-50"
          href={`mailto:${email}`}
        >
          {email}
        </a>
        {cta ? (
          <a
            href={cta.href}
            className="inline-flex items-center rounded-md bg-[#EC2227] px-4 py-2 text-white shadow hover:opacity-95"
          >
            {cta.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 border rounded-xl border-neutral-200">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-2 text-neutral-700">{children}</div>
    </div>
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
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={[
          "mt-1 block w-full rounded-md border px-3 py-2",
          error ? "border-red-500" : "border-neutral-300",
          "focus:outline-none focus:ring-2 focus:ring-[#EC2227]/30",
        ].join(" ")}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
      <label htmlFor={name} className="block text-sm font-medium">
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
          "mt-1 block w-full rounded-md border px-3 py-2",
          error ? "border-red-500" : "border-neutral-300",
          "focus:outline-none focus:ring-2 focus:ring-[#EC2227]/30",
        ].join(" ")}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
  options: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EC2227]/30"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function validate(f: { name: string; email: string; message: string }) {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = "Please enter a valid email.";
  if (!f.message.trim()) e.message = "Please write a brief message.";
  return e;
}

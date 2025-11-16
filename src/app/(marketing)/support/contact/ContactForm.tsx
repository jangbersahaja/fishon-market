// import Footer from "@/components/Footer";
// import Navbar from "@/components/Navbar";
// import type { Metadata } from "next";
// import { revalidatePath } from "next/cache";

// // --------------------- SEO Metadata ---------------------
// export const metadata: Metadata = {
//   title: "Contact Us | Fishon.my",
//   description:
//     "Get in touch with Fishon.my — Malaysia’s #1 fishing charter booking platform. Contact support, partnerships, or list your charter.",
//   alternates: { canonical: "https://www.fishon.my/contact" },
//   openGraph: {
//     title: "Contact Fishon.my",
//     description:
//       "We’re here to help with bookings, partnerships, and captain onboarding.",
//     url: "https://www.fishon.my/contact",
//     type: "website",
//     siteName: "Fishon.my",
//   },
//   twitter: {
//     card: "summary_large_image",
//     title: "Contact Fishon.my",
//     description: "Support, partnerships, and captain onboarding — talk to us.",
//   },
// };

// // --------------------- JSON-LD ---------------------
// const orgSchema = {
//   "@context": "https://schema.org",
//   "@type": "Organization",
//   name: "Fishon.my",
//   url: "https://www.fishon.my",
//   contactPoint: [
//     {
//       "@type": "ContactPoint",
//       contactType: "customer support",
//       email: "support@fishon.my",
//       availableLanguage: ["en", "ms"],
//     },
//   ],
//   sameAs: [
//     "https://www.facebook.com/fishon.my",
//     "https://www.instagram.com/fishon.my",
//   ],
// };

// // --------------------- Server Action ---------------------
// export async function contactAction(formData: FormData) {
//   "use server";

//   // Honeypot
//   const honey = (formData.get("company") as string | null) || "";
//   if (honey.trim()) {
//     // silently ignore bot submissions
//     return { ok: true };
//   }

//   const name = (formData.get("name") as string | null)?.trim() || "";
//   const email = (formData.get("email") as string | null)?.trim() || "";
//   const phone = (formData.get("phone") as string | null)?.trim() || "";
//   const topic = (formData.get("topic") as string | null)?.trim() || "General";
//   const charterUrl =
//     (formData.get("charterUrl") as string | null)?.trim() || "";
//   const message = (formData.get("message") as string | null)?.trim() || "";

//   const errors: Record<string, string> = {};
//   if (!name) errors.name = "Please enter your full name.";
//   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
//     errors.email = "Please enter a valid email.";
//   if (!message) errors.message = "Please write a brief message.";

//   if (Object.keys(errors).length) {
//     return { ok: false, errors };
//   }

//   // Optional: forward to a webhook if configured (e.g., Zapier, Make.com, Slack)
//   const webhook = process.env.CONTACT_WEBHOOK_URL;
//   if (webhook) {
//     try {
//       await fetch(webhook, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           source: "fishon.my/contact",
//           timestamp: new Date().toISOString(),
//           name,
//           email,
//           phone,
//           topic,
//           charterUrl,
//           message,
//         }),
//         // Do not revalidate on failed webhooks
//         cache: "no-store",
//       });
//     } catch (e) {
//       // Swallow network errors to avoid blocking UX; you can log server-side
//       console.error("CONTACT_WEBHOOK_URL error:", e);
//     }
//   }

//   // Invalidate any relevant caches (optional; no-op here)
//   revalidatePath("/contact");

//   return { ok: true };
// }

// // --------------------- Server Page ---------------------
// export default function ContactPage() {
//   return (
//     <main className="min-h-screen flex flex-col">
//       <Navbar />

//       <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 w-full flex-1">
//         {/* JSON-LD */}
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
//         />

//         {/* Header */}
//         <section className="mb-10">
//           <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
//             Contact <span className="text-[#EC2227]">Fishon.my</span>
//           </h1>
//           <p className="mt-4 text-neutral-700">
//             Questions about bookings, listing your charter, or partnerships?
//             We’d love to hear from you.
//           </p>
//         </section>

//         {/* Contact Cards */}
//         <section className="mb-12 grid gap-4 sm:grid-cols-2">
//           <InfoCard
//             title="Customer Support"
//             desc="For booking help, refunds, or account issues."
//             email="support@fishon.my"
//           />
//           <InfoCard
//             title="Captain Onboarding"
//             desc="List your charter and grow with us."
//             email="support@fishon.my"
//             cta={{ href: "/captains/apply", label: "Apply to List" }}
//           />
//         </section>

//         {/* Form (Client) */}
//         <ContactForm />
//       </div>

//       <Footer />
//     </main>
//   );
// }

// // ===================== Client Components =====================
// ("use client");

// import { useMemo, useState } from "react";
// import { useFormStatus } from "react-dom";

// function ContactForm() {
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     phone: "",
//     topic: "General",
//     message: "",
//     charterUrl: "",
//     honey: "",
//   });

//   const errors = useMemo(() => validate(form), [form]);
//   const [serverState, setServerState] = useState<{
//     ok: boolean;
//     errors?: Record<string, string>;
//   } | null>(null);

//   const onAction = async (_: FormData) => {
//     // no-op: we handle via fetcher below to read server result
//   };

//   return (
//     <section className="rounded-xl border border-neutral-200 p-6">
//       <h2 className="text-xl font-semibold">Send us a message</h2>
//       <p className="mt-1 text-neutral-600">
//         Fill out the form and we’ll get back to you. Required fields are marked
//         with *.
//       </p>

//       <form
//         className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
//         action={async (fd) => {
//           // Sync local state into FormData for server
//           fd.set("name", form.name);
//           fd.set("email", form.email);
//           fd.set("phone", form.phone);
//           fd.set("topic", form.topic);
//           fd.set("charterUrl", form.charterUrl);
//           fd.set("message", form.message);
//           fd.set("company", form.honey); // honeypot

//           const res = await contactAction(fd);
//           setServerState(res);
//           if (res.ok) {
//             setForm({
//               name: "",
//               email: "",
//               phone: "",
//               topic: "General",
//               message: "",
//               charterUrl: "",
//               honey: "",
//             });
//           }
//         }}
//       >
//         {/* Honeypot */}
//         <input
//           type="text"
//           name="company"
//           autoComplete="off"
//           className="hidden"
//           tabIndex={-1}
//           value={form.honey}
//           onChange={(e) => setForm((f) => ({ ...f, honey: e.target.value }))}
//           aria-hidden="true"
//         />

//         <Field
//           label="Full Name *"
//           name="name"
//           value={form.name}
//           onChange={(v) => setForm((f) => ({ ...f, name: v }))}
//           placeholder="e.g., Aiman Roslan"
//           error={serverState?.errors?.name || errors.name}
//         />
//         <Field
//           label="Email *"
//           name="email"
//           type="email"
//           value={form.email}
//           onChange={(v) => setForm((f) => ({ ...f, email: v }))}
//           placeholder="you@example.com"
//           error={serverState?.errors?.email || errors.email}
//         />
//         <Field
//           label="Phone"
//           name="phone"
//           type="tel"
//           value={form.phone}
//           onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
//           placeholder="+60 12-345 6789"
//         />
//         <Select
//           label="Topic"
//           name="topic"
//           value={form.topic}
//           onChange={(v) => setForm((f) => ({ ...f, topic: v }))}
//           options={[
//             "General",
//             "Booking Support",
//             "Captain Onboarding",
//             "Partnerships",
//             "Press / Media",
//           ]}
//         />
//         <Field
//           className="sm:col-span-2"
//           label="Charter URL"
//           name="charterUrl"
//           value={form.charterUrl}
//           onChange={(v) => setForm((f) => ({ ...f, charterUrl: v }))}
//           placeholder="https://www.fishon.my/charters/your-listing"
//         />
//         <Textarea
//           className="sm:col-span-2"
//           label="Message *"
//           name="message"
//           value={form.message}
//           onChange={(v) => setForm((f) => ({ ...f, message: v }))}
//           placeholder="Tell us how we can help…"
//           rows={6}
//           error={serverState?.errors?.message || errors.message}
//         />

//         <div className="sm:col-span-2 flex items-center justify-between">
//           <p className="text-xs text-neutral-500">
//             By submitting, you agree to be contacted regarding your enquiry.
//           </p>
//           <SubmitButton
//             disabled={!!(errors.name || errors.email || errors.message)}
//           />
//         </div>

//         {serverState ? (
//           <p
//             className={[
//               "sm:col-span-2 mt-4 text-sm",
//               serverState.ok ? "text-green-600" : "text-red-600",
//             ].join(" ")}
//           >
//             {serverState.ok
//               ? "Thanks! Your message has been sent."
//               : "Please fix the highlighted fields and try again."}
//           </p>
//         ) : null}
//       </form>
//     </section>
//   );
// }

// function SubmitButton({ disabled }: { disabled: boolean }) {
//   const { pending } = useFormStatus();
//   return (
//     <button
//       type="submit"
//       disabled={disabled || pending}
//       className="inline-flex items-center rounded-md bg-[#EC2227] px-5 py-2.5 text-white shadow hover:opacity-95 disabled:opacity-60"
//     >
//       {pending ? "Sending…" : "Send Message"}
//     </button>
//   );
// }

// /* ---------------------- Small UI helpers ---------------------- */

// function InfoCard({
//   title,
//   desc,
//   email,
//   cta,
// }: {
//   title: string;
//   desc: string;
//   email: string;
//   cta?: { href: string; label: string };
// }) {
//   return (
//     <div className="rounded-xl border border-neutral-200 p-5">
//       <h3 className="text-lg font-semibold">{title}</h3>
//       <p className="mt-2 text-neutral-700">{desc}</p>
//       <div className="mt-3 flex flex-wrap gap-3">
//         <a
//           className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-neutral-900 hover:bg-neutral-50"
//           href={`mailto:${email}`}
//         >
//           {email}
//         </a>
//         {cta ? (
//           <a
//             href={cta.href}
//             className="inline-flex items-center rounded-md bg-[#EC2227] px-4 py-2 text-white shadow hover:opacity-95"
//           >
//             {cta.label}
//           </a>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// function Card({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="rounded-xl border border-neutral-200 p-5">
//       <h3 className="text-lg font-semibold">{title}</h3>
//       <div className="mt-2 text-neutral-700">{children}</div>
//     </div>
//   );
// }

// function Field({
//   label,
//   name,
//   value,
//   onChange,
//   placeholder,
//   type = "text",
//   className = "",
//   error,
// }: {
//   label: string;
//   name: string;
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   type?: string;
//   className?: string;
//   error?: string;
// }) {
//   return (
//     <div className={className}>
//       <label htmlFor={name} className="block text-sm font-medium">
//         {label}
//       </label>
//       <input
//         id={name}
//         name={name}
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         placeholder={placeholder}
//         className={[
//           "mt-1 block w-full rounded-md border px-3 py-2",
//           error ? "border-red-500" : "border-neutral-300",
//           "focus:outline-none focus:ring-2 focus:ring-[#EC2227]/30",
//         ].join(" ")}
//       />
//       {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
//     </div>
//   );
// }

// function Textarea({
//   label,
//   name,
//   value,
//   onChange,
//   placeholder,
//   rows = 5,
//   className = "",
//   error,
// }: {
//   label: string;
//   name: string;
//   value: string;
//   onChange: (v: string) => void;
//   placeholder?: string;
//   rows?: number;
//   className?: string;
//   error?: string;
// }) {
//   return (
//     <div className={className}>
//       <label htmlFor={name} className="block text-sm font-medium">
//         {label}
//       </label>
//       <textarea
//         id={name}
//         name={name}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         placeholder={placeholder}
//         rows={rows}
//         className={[
//           "mt-1 block w-full rounded-md border px-3 py-2",
//           error ? "border-red-500" : "border-neutral-300",
//           "focus:outline-none focus:ring-2 focus:ring-[#EC2227]/30",
//         ].join(" ")}
//       />
//       {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
//     </div>
//   );
// }

// function Select({
//   label,
//   name,
//   value,
//   onChange,
//   options,
//   className = "",
// }: {
//   label: string;
//   name: string;
//   value: string;
//   onChange: (v: string) => void;
//   options: string[];
//   className?: string;
// }) {
//   return (
//     <div className={className}>
//       <label htmlFor={name} className="block text-sm font-medium">
//         {label}
//       </label>
//       <select
//         id={name}
//         name={name}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EC2227]/30"
//       >
//         {options.map((opt) => (
//           <option key={opt} value={opt}>
//             {opt}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// function validate(f: { name: string; email: string; message: string }) {
//   const e: Record<string, string> = {};
//   if (!f.name.trim()) e.name = "Please enter your full name.";
//   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
//     e.email = "Please enter a valid email.";
//   if (!f.message.trim()) e.message = "Please write a brief message.";
//   return e;
// }

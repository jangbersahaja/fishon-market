---
type: plan
status: phase-1c-complete-notification-service-api
updated: 2025-01-29
feature: Notification System Implementation
author: GitHub Copilot
tags:
  - notifications
  - real-time
  - pusher
  - websocket
  - email
impact: high
---

# Notification System Implementation Plan

## 🎯 Executive Summary

**Goal**: Implement a robust, real-time notification system for both fishon-captain and fishon-market applications.

**Current Status:**

- ✅ **Phase 0 Complete (Jan 29, 2025)**: Email system fully refactored
  - fishon-market: 8/8 routes using @fishon/email
  - fishon-captain: 4/4 routes using @fishon/email
  - TypeScript: 0 errors in both apps
- 🚧 **Phase 1 Ready to Start**: Notification infrastructure
  - Database schemas designed
  - Pusher architecture planned
  - API routes mapped
  - UI components specified

**Timeline**: 13 working days for Phase 1

**Strategy**: Build unified notification infrastructure with Pusher for real-time delivery, sync with existing email system

---

## 📋 Current State Analysis

### fishon-market

- ✅ **Database**: PostgreSQL with Prisma ORM
- ✅ **Auth**: NextAuth with session-based authentication
- ✅ **Rate Limiting**: In-memory rate limiter (`src/lib/rateLimit.ts`)
- ✅ **Email**: Existing `sendMail` utility in webhooks
- ✅ **Component Structure**: Feature-based organization (`components/booking/`, `components/account/`)
- ✅ **API Structure**: Route-based (`app/api/bookings/`, `app/api/account/`)
- ✅ **Shared UI**: `@fishon/ui` package for cross-app components

### fishon-captain

- ✅ **Database**: PostgreSQL with Prisma ORM (separate DB)
- ✅ **Auth**: NextAuth with OAuth support
- ✅ **UI Components**: shadcn/ui based
- ✅ **Portal Structure**: `app/(portal)/captain/*`

### What We Need to Build

**Phase 0: Email System Refactor (CRITICAL FOUNDATION)**

- ❌ **Shared Email Package**: Create `@fishon/email` with React Email templates
- ❌ **Template System**: Beautiful, responsive email templates for all event types
- ❌ **Email Service**: Unified email service for both apps
- ❌ **Testing Tools**: Email preview system for development

**Phase 1: Notification Infrastructure**

- ❌ **Notification Schema**: Database models for notifications
- ❌ **Pusher Integration**: Real-time delivery infrastructure
- ❌ **Notification API**: CRUD routes for notifications
- ❌ **UI Components**: Bell icon, dropdown, notification list
- ❌ **Shared Types**: Notification types in `@fishon/ui`
- ❌ **Integration**: Hook into booking flow

---

## � Why Refactor Email System First?

### Current Problems

1. **Scattered Implementation**
   - fishon-market: `src/lib/helpers/email.ts` (basic, no templates)
   - fishon-captain: `src/lib/email.ts` (better templates, but not reusable)
   - No consistency across apps

2. **Poor Design**
   - fishon-market: Plain text with minimal HTML
   - fishon-captain: Inline styles (hard to maintain)
   - No responsive design
   - No dark mode support
   - No brand consistency

3. **No Template System**
   - HTML strings scattered across codebase
   - Hard to preview changes
   - No component reusability
   - Difficult to test

4. **Duplicate Code**
   - Each app has its own email functions
   - Same templates written twice
   - Inconsistent messaging

### Benefits of React Email

1. **Component-Based Templates**

   ```tsx
   <EmailLayout>
     <EmailHeader>Booking Confirmed!</EmailHeader>
     <BookingDetails charter={charter} trip={trip} />
     <EmailButton href={actionUrl}>View Booking</EmailButton>
   </EmailLayout>
   ```

2. **Preview System**
   - Visit `/emails` route to see all templates
   - Live editing in development
   - No need to send real emails to test

3. **Type Safety**
   - TypeScript interfaces for all email props
   - Compile-time validation
   - Auto-completion in IDEs

4. **Responsive by Default**
   - Works on all email clients
   - Dark mode support
   - Mobile-optimized

5. **Shared Across Apps**
   - One package, two apps
   - Consistent branding
   - Single source of truth

---

## �🏗️ Architecture Design

### Technology Stack

**Email Templates**: React Email

- ✅ Component-based email templates
- ✅ Built-in preview system
- ✅ TypeScript support
- ✅ Used by Stripe, Vercel, Linear

**Real-time**: Pusher Channels

- ✅ Managed WebSocket service
- ✅ 200k messages/day free tier
- ✅ Built-in fallback mechanisms
- ✅ Private channel support
- ✅ Easy Next.js integration

**Database**: Extend existing Prisma schemas
**Frontend**: React hooks + shadcn/ui components
**Shared Packages**:

- `@fishon/ui` - Types and components
- `@fishon/email` (NEW) - Email templates

---

## 📧 Phase 0: Email System Refactor (Day 1-3)

### Step 1: Create @fishon/email Package (Day 1)

#### Initialize Package

```bash
cd /Users/jangbersahaja/Website
mkdir fishon-email
cd fishon-email

# Initialize package
npm init -y

# Install dependencies
npm install react react-dom @react-email/components
npm install -D typescript @types/react @types/react-dom

# Create package structure
mkdir -p src/emails src/components
touch src/index.ts
```

#### Package Configuration

```json
// package.json
{
  "name": "@fishon/email",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "react-email dev",
    "build": "tsc",
    "preview": "react-email dev"
  },
  "dependencies": {
    "@react-email/components": "^0.0.25",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.7.2"
  }
}
```

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 2: Create Shared Email Components (Day 1-2)

#### Base Layout Component

```tsx
// src/components/EmailLayout.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>{children}</Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  borderRadius: "8px",
  overflow: "hidden",
  maxWidth: "600px",
};
```

#### Header Component

```tsx
// src/components/EmailHeader.tsx
import { Heading, Img, Section } from "@react-email/components";
import * as React from "react";

interface EmailHeaderProps {
  title: string;
  subtitle?: string;
}

export function EmailHeader({ title, subtitle }: EmailHeaderProps) {
  return (
    <Section style={header}>
      <Img
        src="https://fishon.my/images/logo-white.png"
        alt="Fishon"
        width="120"
        height="40"
        style={logo}
      />
      <Heading style={heading}>{title}</Heading>
      {subtitle && <p style={subheading}>{subtitle}</p>}
    </Section>
  );
}

const header = {
  background: "linear-gradient(135deg, #ec2227 0%, #c81e23 100%)",
  padding: "40px 30px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto 20px",
};

const heading = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
  lineHeight: "1.2",
};

const subheading = {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "16px",
  margin: "8px 0 0",
};
```

#### Button Component

```tsx
// src/components/EmailButton.tsx
import { Button } from "@react-email/components";
import * as React from "react";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  );
}

const button = {
  backgroundColor: "#ec2227",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "24px 0",
};
```

#### Info Box Component

```tsx
// src/components/InfoBox.tsx
import { Section, Text } from "@react-email/components";
import * as React from "react";

interface InfoBoxProps {
  label: string;
  value: string;
}

export function InfoBox({ label, value }: InfoBoxProps) {
  return (
    <Section style={box}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </Section>
  );
}

const box = {
  backgroundColor: "#f9fafb",
  padding: "16px",
  borderRadius: "6px",
  marginBottom: "12px",
};

const labelStyle = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  fontWeight: "600",
};

const valueStyle = {
  fontSize: "16px",
  color: "#111827",
  margin: "0",
  fontWeight: "600",
};
```

### Step 3: Create Email Templates (Day 2)

#### Booking Created Email

```tsx
// src/emails/BookingCreated.tsx
import { Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailButton } from "../components/EmailButton";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";
import { InfoBox } from "../components/InfoBox";

interface BookingCreatedEmailProps {
  userName: string;
  charterName: string;
  tripDate: string;
  tripDuration: string;
  startTime?: string;
  totalPrice: string;
  confirmationUrl: string;
}

export function BookingCreatedEmail({
  userName,
  charterName,
  tripDate,
  tripDuration,
  startTime,
  totalPrice,
  confirmationUrl,
}: BookingCreatedEmailProps) {
  return (
    <EmailLayout
      preview={`Your booking request for ${charterName} was received`}
    >
      <EmailHeader
        title="Booking Request Received! 🎣"
        subtitle={`Charter: ${charterName}`}
      />

      <Section style={content}>
        <Text style={greeting}>Hi {userName},</Text>

        <Text style={paragraph}>
          Thank you for choosing Fishon! We&apos;ve received your booking
          request and the captain will review it shortly.
        </Text>

        <Section style={detailsSection}>
          <Text style={sectionTitle}>Booking Details</Text>

          <InfoBox label="Charter" value={charterName} />
          <InfoBox label="Date" value={tripDate} />
          <InfoBox label="Duration" value={tripDuration} />
          {startTime && <InfoBox label="Start Time" value={startTime} />}
          <InfoBox label="Total Price" value={totalPrice} />
        </Section>

        <EmailButton href={confirmationUrl}>View Booking Details</EmailButton>

        <Hr style={divider} />

        <Text style={footerText}>
          You&apos;ll receive another email once the captain approves your
          booking. If you have any questions, feel free to contact us.
        </Text>
      </Section>
    </EmailLayout>
  );
}

const content = {
  padding: "30px",
};

const greeting = {
  fontSize: "16px",
  color: "#111827",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const detailsSection = {
  margin: "24px 0",
};

const sectionTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 16px",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

// Default props for preview
BookingCreatedEmail.PreviewProps = {
  userName: "Ahmad",
  charterName: "Full Day Deep Sea Adventure",
  tripDate: "Saturday, November 15, 2025",
  tripDuration: "1 Day",
  startTime: "6:00 AM",
  totalPrice: "RM 800",
  confirmationUrl: "https://fishon.my/book/confirm?id=123",
} as BookingCreatedEmailProps;

export default BookingCreatedEmail;
```

#### Booking Approved Email

```tsx
// src/emails/BookingApproved.tsx
import { Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailButton } from "../components/EmailButton";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";
import { InfoBox } from "../components/InfoBox";

interface BookingApprovedEmailProps {
  userName: string;
  charterName: string;
  tripDate: string;
  paymentUrl: string;
  confirmationUrl: string;
}

export function BookingApprovedEmail({
  userName,
  charterName,
  tripDate,
  paymentUrl,
  confirmationUrl,
}: BookingApprovedEmailProps) {
  return (
    <EmailLayout preview={`Your booking for ${charterName} was approved!`}>
      <EmailHeader
        title="Booking Approved! 🎉"
        subtitle="Time to secure your spot"
      />

      <Section style={content}>
        <Text style={greeting}>Hi {userName},</Text>

        <Section style={successBox}>
          <Text style={successText}>
            ✅ Great news! Your booking has been approved by the captain.
          </Text>
        </Section>

        <Text style={paragraph}>
          Complete your payment to confirm your booking and secure your spot.
        </Text>

        <Section style={detailsSection}>
          <InfoBox label="Charter" value={charterName} />
          <InfoBox label="Date" value={tripDate} />
        </Section>

        <EmailButton href={paymentUrl}>Complete Payment</EmailButton>

        <Hr style={divider} />

        <Text style={footerText}>
          Questions? View your full booking details{" "}
          <a href={confirmationUrl} style={link}>
            here
          </a>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

const content = {
  padding: "30px",
};

const greeting = {
  fontSize: "16px",
  color: "#111827",
  margin: "0 0 16px",
};

const successBox = {
  backgroundColor: "#f0fdf4",
  borderLeft: "4px solid #22c55e",
  padding: "16px",
  borderRadius: "6px",
  margin: "0 0 24px",
};

const successText = {
  fontSize: "16px",
  color: "#166534",
  margin: "0",
  fontWeight: "600",
};

const paragraph = {
  fontSize: "16px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const detailsSection = {
  margin: "24px 0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const link = {
  color: "#ec2227",
  textDecoration: "underline",
};

BookingApprovedEmail.PreviewProps = {
  userName: "Ahmad",
  charterName: "Full Day Deep Sea Adventure",
  tripDate: "Saturday, November 15, 2025",
  paymentUrl: "https://fishon.my/book/payment?id=123",
  confirmationUrl: "https://fishon.my/book/confirm?id=123",
} as BookingApprovedEmailProps;

export default BookingApprovedEmail;
```

#### Booking Rejected Email

```tsx
// src/emails/BookingRejected.tsx
import { Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailButton } from "../components/EmailButton";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";

interface BookingRejectedEmailProps {
  userName: string;
  charterName: string;
  reason?: string;
  searchUrl: string;
}

export function BookingRejectedEmail({
  userName,
  charterName,
  reason,
  searchUrl,
}: BookingRejectedEmailProps) {
  return (
    <EmailLayout preview={`Booking update for ${charterName}`}>
      <EmailHeader title="Booking Update" subtitle="We're here to help" />

      <Section style={content}>
        <Text style={greeting}>Hi {userName},</Text>

        <Text style={paragraph}>
          We&apos;re sorry, but your booking request for{" "}
          <strong>{charterName}</strong> could not be accommodated at this time.
        </Text>

        {reason && (
          <Section style={reasonBox}>
            <Text style={reasonLabel}>Reason from Captain:</Text>
            <Text style={reasonText}>{reason}</Text>
          </Section>
        )}

        <Text style={paragraph}>
          Don&apos;t worry! We have many other amazing fishing charters
          available. Browse our selection to find your next adventure.
        </Text>

        <EmailButton href={searchUrl}>Find Other Charters</EmailButton>

        <Hr style={divider} />

        <Text style={footerText}>
          Need help finding the perfect charter? Contact our support team and
          we&apos;ll be happy to assist you.
        </Text>
      </Section>
    </EmailLayout>
  );
}

const content = {
  padding: "30px",
};

const greeting = {
  fontSize: "16px",
  color: "#111827",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const reasonBox = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #ef4444",
  padding: "16px",
  borderRadius: "6px",
  margin: "0 0 24px",
};

const reasonLabel = {
  fontSize: "12px",
  color: "#991b1b",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  fontWeight: "600",
};

const reasonText = {
  fontSize: "14px",
  color: "#7f1d1d",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

BookingRejectedEmail.PreviewProps = {
  userName: "Ahmad",
  charterName: "Full Day Deep Sea Adventure",
  reason:
    "Unfortunately, we are fully booked for this date. Please check our availability calendar for other dates.",
  searchUrl: "https://fishon.my/charters",
} as BookingRejectedEmailProps;

export default BookingRejectedEmail;
```

### Step 4: Create Email Rendering Service (Day 2)

```typescript
// src/index.ts
import { render } from "@react-email/components";
import * as React from "react";
import BookingApprovedEmail from "./emails/BookingApproved";
import BookingCreatedEmail from "./emails/BookingCreated";
import BookingRejectedEmail from "./emails/BookingRejected";

// Export all email templates
export { BookingApprovedEmail, BookingCreatedEmail, BookingRejectedEmail };

// Export components for custom emails
export { EmailButton } from "./components/EmailButton";
export { EmailHeader } from "./components/EmailHeader";
export { EmailLayout } from "./components/EmailLayout";
export { InfoBox } from "./components/InfoBox";

// Email rendering functions
export async function renderBookingCreatedEmail(
  props: React.ComponentProps<typeof BookingCreatedEmail>
): Promise<string> {
  return render(React.createElement(BookingCreatedEmail, props));
}

export async function renderBookingApprovedEmail(
  props: React.ComponentProps<typeof BookingApprovedEmail>
): Promise<string> {
  return render(React.createElement(BookingApprovedEmail, props));
}

export async function renderBookingRejectedEmail(
  props: React.ComponentProps<typeof BookingRejectedEmail>
): Promise<string> {
  return render(React.createElement(BookingRejectedEmail, props));
}
```

### Step 5: Set Up Git Repository (Day 2)

```bash
cd /Users/jangbersahaja/Website/fishon-email

# Initialize git
git init
git add .
git commit -m "feat: initial commit - React Email templates for Fishon"

# Create GitHub repository (via GitHub CLI or web)
gh repo create fishon-email --public --source=. --remote=origin
git push -u origin main
```

### Step 6: Install in Both Apps (Day 3)

```bash
# fishon-market
cd /Users/jangbersahaja/Website/fishon-market
npm install git+https://github.com/jangbersahaja/fishon-email#main

# fishon-captain
cd /Users/jangbersahaja/Website/fishon-captain
npm install git+https://github.com/jangbersahaja/fishon-email#main
```

### Step 7: Create Unified Email Service (Day 3)

#### fishon-market Email Service

```typescript
// src/lib/services/email-service.ts
import {
  renderBookingApprovedEmail,
  renderBookingCreatedEmail,
  renderBookingRejectedEmail,
} from "@fishon/email";
import { sendMail } from "@/lib/helpers/email";

interface SendBookingCreatedParams {
  to: string;
  userName: string;
  charterName: string;
  tripDate: string;
  tripDuration: string;
  startTime?: string;
  totalPrice: string;
  confirmationUrl: string;
}

export async function sendBookingCreatedEmail(
  params: SendBookingCreatedParams
) {
  const html = await renderBookingCreatedEmail({
    userName: params.userName,
    charterName: params.charterName,
    tripDate: params.tripDate,
    tripDuration: params.tripDuration,
    startTime: params.startTime,
    totalPrice: params.totalPrice,
    confirmationUrl: params.confirmationUrl,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Request Received - ${params.charterName}`,
    html,
  });
}

interface SendBookingApprovedParams {
  to: string;
  userName: string;
  charterName: string;
  tripDate: string;
  paymentUrl: string;
  confirmationUrl: string;
}

export async function sendBookingApprovedEmail(
  params: SendBookingApprovedParams
) {
  const html = await renderBookingApprovedEmail({
    userName: params.userName,
    charterName: params.charterName,
    tripDate: params.tripDate,
    paymentUrl: params.paymentUrl,
    confirmationUrl: params.confirmationUrl,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Approved - ${params.charterName}`,
    html,
  });
}

interface SendBookingRejectedParams {
  to: string;
  userName: string;
  charterName: string;
  reason?: string;
  searchUrl: string;
}

export async function sendBookingRejectedEmail(
  params: SendBookingRejectedParams
) {
  const html = await renderBookingRejectedEmail({
    userName: params.userName,
    charterName: params.charterName,
    reason: params.reason,
    searchUrl: params.searchUrl,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Update - ${params.charterName}`,
    html,
  });
}
```

### Step 8: Replace Old Email Functions (Day 3)

#### Update Booking APIs

```typescript
// src/app/api/bookings/create/route.ts
// Replace old email code with:
import { sendBookingCreatedEmail } from "@/lib/services/email-service";

// After creating booking
await sendBookingCreatedEmail({
  to: user.email,
  userName: user.name || "there",
  charterName: charter.name,
  tripDate: format(new Date(booking.tripDate), "EEEE, MMMM d, yyyy"),
  tripDuration: `${booking.days} Day${booking.days > 1 ? "s" : ""}`,
  startTime: booking.startTime || undefined,
  totalPrice: `RM ${booking.totalPrice}`,
  confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirm?id=${booking.id}`,
});
```

```typescript
// src/app/api/bookings/approve/route.ts
import { sendBookingApprovedEmail } from "@/lib/services/email-service";

await sendBookingApprovedEmail({
  to: user.email,
  userName: user.name || "there",
  charterName: charter.name,
  tripDate: format(new Date(booking.tripDate), "EEEE, MMMM d, yyyy"),
  paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/payment?id=${booking.id}`,
  confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirm?id=${booking.id}`,
});
```

```typescript
// src/app/api/bookings/reject/route.ts
import { sendBookingRejectedEmail } from "@/lib/services/email-service";

await sendBookingRejectedEmail({
  to: user.email,
  userName: user.name || "there",
  charterName: charter.name,
  reason: rejectionReason,
  searchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/charters`,
});
```

### Step 9: Add Email Preview Route (Day 3)

```typescript
// src/app/dev/emails/page.tsx
import {
  BookingApprovedEmail,
  BookingCreatedEmail,
  BookingRejectedEmail,
} from "@fishon/email";

export default function EmailPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Email Templates Preview</h1>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Booking Created</h2>
          <div className="bg-white rounded-lg shadow">
            <BookingCreatedEmail {...BookingCreatedEmail.PreviewProps} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Booking Approved</h2>
          <div className="bg-white rounded-lg shadow">
            <BookingApprovedEmail {...BookingApprovedEmail.PreviewProps} />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Booking Rejected</h2>
          <div className="bg-white rounded-lg shadow">
            <BookingRejectedEmail {...BookingRejectedEmail.PreviewProps} />
          </div>
        </section>
      </div>
    </div>
  );
}
```

---

## 📊 Phase 1: Database Schema (Day 4-5)

### Notification Model (Both Apps)

```prisma
// Add to both fishon-market and fishon-captain schemas

enum NotificationType {
  // Booking lifecycle
  BOOKING_CREATED       // Captain: New booking request
  BOOKING_APPROVED      // Angler: Booking approved by captain
  BOOKING_REJECTED      // Angler: Booking rejected by captain
  BOOKING_CANCELLED     // Captain: Angler cancelled booking
  BOOKING_EXPIRED       // Both: Booking expired

  // Payment
  PAYMENT_RECEIVED      // Captain: Payment confirmed
  PAYMENT_DUE           // Angler: Payment reminder

  // Trip
  TRIP_REMINDER         // Angler: Trip starting soon (24h before)
  TRIP_COMPLETED        // Angler: Trip finished, leave review

  // Reviews
  REVIEW_RECEIVED       // Captain: New review posted

  // System
  SYSTEM_ANNOUNCEMENT   // Both: Platform updates
}

enum NotificationChannel {
  IN_APP    // Show in notification center
  EMAIL     // Send email notification
  PUSH      // Push notification (future Phase C)
}

model Notification {
  id        String   @id @default(cuid())
  userId    String   // Recipient user ID
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Content
  type      NotificationType
  title     String              // "Booking Approved!"
  message   String              // "Captain John approved your booking for..."

  // Context (for deep linking)
  bookingId String?
  charterId String?
  metadata  Json?               // Additional flexible data

  // Delivery
  channels  NotificationChannel[]
  readAt    DateTime?
  sentAt    DateTime            @default(now())

  // Actions
  actionUrl    String?          // "/book/confirm?id=xxx"
  actionLabel  String?          // "View Booking"

  // Lifecycle
  createdAt DateTime  @default(now())
  expiresAt DateTime? // Auto-delete after 30 days

  @@index([userId, readAt])
  @@index([userId, sentAt])
  @@index([type])
  @@index([createdAt])
  @@map("notifications")
}
```

### Update User Model

```prisma
// Add to User model in both apps

model User {
  // ... existing fields

  // Notification preferences
  notificationPreferences Json? @default("{\"inApp\":true,\"email\":true}")

  // Relationships
  notifications Notification[]

  // ... existing relations
}
```

### Migration Commands

```bash
# fishon-market
cd /Users/jangbersahaja/Website/fishon-market
npx prisma migrate dev --name add-notification-system

# fishon-captain
cd /Users/jangbersahaja/Website/fishon-captain
npx prisma migrate dev --name add-notification-system
```

---

## 🎨 Phase 2: Shared Types (@fishon/ui) (Day 2)

### Create Notification Types

```typescript
// @fishon/ui/src/types/notification.ts

export enum NotificationType {
  // Booking lifecycle
  BOOKING_CREATED = "BOOKING_CREATED",
  BOOKING_APPROVED = "BOOKING_APPROVED",
  BOOKING_REJECTED = "BOOKING_REJECTED",
  BOOKING_CANCELLED = "BOOKING_CANCELLED",
  BOOKING_EXPIRED = "BOOKING_EXPIRED",

  // Payment
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_DUE = "PAYMENT_DUE",

  // Trip
  TRIP_REMINDER = "TRIP_REMINDER",
  TRIP_COMPLETED = "TRIP_COMPLETED",

  // Reviews
  REVIEW_RECEIVED = "REVIEW_RECEIVED",

  // System
  SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  PUSH = "PUSH",
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string | null;
  charterId?: string | null;
  metadata?: Record<string, any> | null;
  channels: NotificationChannel[];
  readAt?: Date | null;
  sentAt: Date;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdAt: Date;
  expiresAt?: Date | null;
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  push?: boolean;
}
```

### Export from Index

```typescript
// @fishon/ui/src/types/index.ts
export * from "./notification";
```

### Update Package

```bash
cd /Users/jangbersahaja/Website/fishon-ui
git add .
git commit -m "feat: add notification types"
git push origin main

# Update in both apps
cd /Users/jangbersahaja/Website/fishon-market
npm install git+https://github.com/jangbersahaja/fishon-ui#main

cd /Users/jangbersahaja/Website/fishon-captain
npm install git+https://github.com/jangbersahaja/fishon-ui#main
```

---

## ⚙️ Phase 3: Pusher Setup (Day 2-3)

### Environment Variables

```env
# Add to both apps' .env files

# Pusher Configuration
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1  # Asia Pacific (Singapore)

# Public keys (client-side)
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

### Server Utilities (fishon-market)

```typescript
// src/lib/pusher/server.ts
import Pusher from "pusher";

if (
  !process.env.PUSHER_APP_ID ||
  !process.env.PUSHER_KEY ||
  !process.env.PUSHER_SECRET ||
  !process.env.PUSHER_CLUSTER
) {
  throw new Error("Missing Pusher environment variables");
}

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

/**
 * Trigger a notification to a specific user
 */
export async function triggerNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  }
) {
  try {
    await pusherServer.trigger(
      `private-user-${userId}`,
      "notification",
      notification
    );

    console.log(
      `[Pusher] Notification sent to user ${userId}:`,
      notification.type
    );
    return { success: true };
  } catch (error) {
    console.error(`[Pusher] Failed to send notification:`, error);
    return { success: false, error };
  }
}
```

### Client Hook (fishon-market)

```typescript
// src/hooks/useNotifications.ts
"use client";

import { useEffect, useState } from "react";
import PusherClient from "pusher-js";

const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  authEndpoint: "/api/pusher/auth",
});

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    []
  );

  useEffect(() => {
    if (!userId) return;

    const channel = pusherClient.subscribe(`private-user-${userId}`);

    channel.bind("notification", (data: RealtimeNotification) => {
      console.log("[Pusher] Received notification:", data);
      setNotifications((prev) => [data, ...prev]);

      // Show browser notification if permitted
      if (
        typeof window !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(data.title, {
          body: data.message,
          icon: "/icon-192.png",
          tag: data.id, // Prevent duplicates
        });
      }
    });

    return () => {
      channel.unbind("notification");
      pusherClient.unsubscribe(`private-user-${userId}`);
    };
  }, [userId]);

  return { realtimeNotifications: notifications };
}
```

### Auth Endpoint (fishon-market)

```typescript
// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const userId = session.user.id;

  // Verify user can access this channel
  if (channelName === `private-user-${userId}`) {
    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## 🔌 Phase 4: Notification API Routes (Day 3-4)

### Create Notification Service

```typescript
// src/lib/services/notification-service.ts
import { prisma } from "@/lib/database/prisma";
import { triggerNotification } from "@/lib/pusher/server";
import { sendMail } from "@/lib/webhooks/mail";
import type { NotificationType, NotificationChannel } from "@fishon/ui";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
  charterId?: string;
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
  actionUrl?: string;
  actionLabel?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    message,
    bookingId,
    charterId,
    metadata,
    channels = ["IN_APP", "EMAIL"],
    actionUrl,
    actionLabel,
  } = params;

  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      bookingId,
      charterId,
      metadata,
      channels,
      actionUrl,
      actionLabel,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Send via enabled channels
  const results = await Promise.allSettled([
    // In-app (Pusher)
    channels.includes("IN_APP")
      ? triggerNotification(userId, {
          id: notification.id,
          type,
          title,
          message,
          actionUrl,
          actionLabel,
        })
      : Promise.resolve({ success: true }),

    // Email
    channels.includes("EMAIL")
      ? sendNotificationEmail(userId, notification)
      : Promise.resolve({ success: true }),
  ]);

  console.log(`[Notification] Created for user ${userId}:`, type, results);

  return notification;
}

async function sendNotificationEmail(userId: string, notification: any) {
  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    console.warn(`[Notification] User ${userId} has no email`);
    return { success: false };
  }

  // Send email (using existing sendMail utility)
  await sendMail({
    to: user.email,
    subject: notification.title,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${
          notification.actionUrl
            ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}${
                notification.actionUrl
              }" 
                 style="background: #ec2227; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                 ${notification.actionLabel || "View Details"}
              </a></p>`
            : ""
        }
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          You can manage your notification preferences in your account settings.
        </p>
      </div>
    `,
  });

  return { success: true };
}

export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    cursor?: string;
  } = {}
) {
  const { unreadOnly = false, limit = 20, cursor } = options;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = unreadOnly
    ? notifications.length
    : await prisma.notification.count({
        where: { userId, readAt: null },
      });

  return {
    notifications,
    unreadCount,
    nextCursor:
      notifications.length === limit
        ? notifications[notifications.length - 1].id
        : null,
  };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function deleteNotification(
  notificationId: string,
  userId: string
) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}
```

### API Routes

```typescript
// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getUserNotifications } from "@/lib/services/notification-service";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = parseInt(searchParams.get("limit") || "20");
  const cursor = searchParams.get("cursor") || undefined;

  const result = await getUserNotifications(session.user.id, {
    unreadOnly,
    limit,
    cursor,
  });

  return NextResponse.json(result);
}
```

```typescript
// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { markNotificationRead } from "@/lib/services/notification-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markNotificationRead(id, session.user.id);

  return NextResponse.json({ success: true });
}
```

```typescript
// src/app/api/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { markAllNotificationsRead } from "@/lib/services/notification-service";

export async function PATCH(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await markAllNotificationsRead(session.user.id);

  return NextResponse.json({ success: true, count: result.count });
}
```

```typescript
// src/app/api/notifications/unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getUserNotifications } from "@/lib/services/notification-service";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { unreadCount } = await getUserNotifications(session.user.id, {
    unreadOnly: true,
    limit: 1,
  });

  return NextResponse.json({ count: unreadCount });
}
```

---

## 🎨 Phase 5: UI Components (Day 5-7)

### Notification Bell Component

```typescript
// src/components/notifications/NotificationBell.tsx
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { realtimeNotifications } = useNotifications(userId);

  // Fetch initial unread count
  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((res) => res.json())
      .then((data) => setUnreadCount(data.count))
      .catch(console.error);
  }, []);

  // Update count when new notifications arrive
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      setUnreadCount((prev) => prev + realtimeNotifications.length);
    }
  }, [realtimeNotifications]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-white hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationDropdown
          userId={userId}
          onClose={() => setIsOpen(false)}
          onMarkAllRead={() => {
            fetch("/api/notifications/read-all", { method: "PATCH" });
            setUnreadCount(0);
          }}
        />
      )}
    </div>
  );
}
```

### Notification Dropdown

```typescript
// src/components/notifications/NotificationDropdown.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  userId,
  onClose,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch notifications
    fetch("/api/notifications?limit=10")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch notifications:", error);
        setLoading(false);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleMarkRead = (id: string) => {
    fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 z-50 w-96 max-h-[500px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {notifications.some((n) => !n.readAt) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Check className="mr-1 h-3 w-3" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onClick={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-gray-600 hover:text-gray-900"
            asChild
          >
            <a href="/account/notifications">View All Notifications</a>
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Notification Item

```typescript
// src/components/notifications/NotificationItem.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Check } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClick: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}: NotificationItemProps) {
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) {
      onMarkRead(notification.id);
    }
    onClick();
  };

  const content = (
    <div
      className={`relative px-4 py-3 transition-colors hover:bg-gray-50 ${
        isUnread ? "bg-blue-50/50" : ""
      }`}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
      )}

      <div className="ml-4">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm ${
              isUnread ? "font-semibold" : "font-medium"
            } text-gray-900`}
          >
            {notification.title}
          </p>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Mark as read button (for unread items) */}
      {isUnread && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Mark as read"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return <div onClick={handleClick}>{content}</div>;
}
```

### Integrate into Navbar

```typescript
// src/components/layout/Navbar.tsx
// Add NotificationBell after CheckYourBookings

import { NotificationBell } from "@/components/notifications/NotificationBell";

// Inside Navbar component, after the CheckYourBookings component:
{
  isAuthed && <NotificationBell userId={session.user.id} />;
}
```

---

## 🔗 Phase 6: Booking Integration (Day 8-9)

### Update Booking APIs

```typescript
// src/app/api/bookings/create/route.ts
// After creating booking

import { createNotification } from "@/lib/services/notification-service";

// ... existing booking creation code

// Send notification to captain (via webhook to fishon-captain)
await fetch(
  `${process.env.FISHON_CAPTAIN_API_URL}/api/webhooks/booking-created`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId: booking.id }),
  }
);
```

```typescript
// src/app/api/bookings/approve/route.ts
// After approving booking

// Notify angler
if (updated.userId) {
  await createNotification({
    userId: updated.userId,
    type: "BOOKING_APPROVED",
    title: "Booking Approved!",
    message: `Captain ${captainName} has approved your booking for ${tripName}.`,
    bookingId: updated.id,
    channels: ["IN_APP", "EMAIL"],
    actionUrl: `/book/confirm?id=${updated.id}`,
    actionLabel: "View Booking",
  });
}
```

```typescript
// src/app/api/bookings/reject/route.ts
// After rejecting booking

// Notify angler
if (updated.userId) {
  await createNotification({
    userId: updated.userId,
    type: "BOOKING_REJECTED",
    title: "Booking Update",
    message: `Your booking has been declined. ${rejectionReason || ""}`,
    bookingId: updated.id,
    channels: ["IN_APP", "EMAIL"],
    actionUrl: `/book/confirm?id=${updated.id}`,
    actionLabel: "View Details",
  });
}
```

```typescript
// src/app/api/bookings/cancel/route.ts
// After cancelling booking

// Notify captain (via webhook)
await fetch(
  `${process.env.FISHON_CAPTAIN_API_URL}/api/webhooks/booking-cancelled`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId: updated.id }),
  }
);
```

---

## 📱 Phase 7: fishon-captain Integration (Day 9-10)

### Mirror Implementation

1. **Copy schema additions** to fishon-captain
2. **Copy Pusher setup** (server.ts, hooks, auth endpoint)
3. **Copy notification service** (adapted for captain context)
4. **Create webhook handlers** for angler actions
5. **Add NotificationBell** to captain portal navbar

### Captain-Specific Webhooks

```typescript
// fishon-captain/src/app/api/webhooks/booking-created/route.ts
import { createNotification } from "@/lib/services/notification-service";

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json();

  // Fetch booking details
  const booking = await prismaCaptain.booking.findUnique({
    where: { id: bookingId },
    include: { charter: { include: { captain: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Notify captain
  await createNotification({
    userId: booking.charter.captain.userId,
    type: "BOOKING_CREATED",
    title: "New Booking Request!",
    message: `You have a new booking request for ${booking.charter.name}.`,
    bookingId,
    charterId: booking.charterId,
    channels: ["IN_APP", "EMAIL"],
    actionUrl: `/captain/bookings/${bookingId}`,
    actionLabel: "Review Booking",
  });

  return NextResponse.json({ success: true });
}
```

---

## ✅ Testing Plan (Day 10-12)

### Unit Tests

```typescript
// __tests__/notification-service.test.ts
describe("Notification Service", () => {
  it("creates notification in database");
  it("triggers Pusher event");
  it("sends email notification");
  it("handles user preferences");
  it("marks notification as read");
  it("deletes old notifications");
});
```

### Integration Tests

- [ ] Create booking → Captain receives notification
- [ ] Approve booking → Angler receives notification
- [ ] Reject booking → Angler receives notification
- [ ] Cancel booking → Captain receives notification
- [ ] Real-time delivery via Pusher
- [ ] Email fallback when Pusher fails

### Manual Testing Checklist

- [ ] Bell icon shows unread count
- [ ] Clicking bell opens dropdown
- [ ] Notifications load correctly
- [ ] Mark single as read works
- [ ] Mark all as read works
- [ ] Clicking notification navigates correctly
- [ ] Real-time notifications appear instantly
- [ ] Browser notifications show (with permission)
- [ ] Email notifications arrive
- [ ] Dropdown closes on outside click
- [ ] Mobile responsive design

---

## 📝 Documentation

### API Documentation

Create `/docs/api-notification-routes.md`:

````markdown
# Notification API Routes

## GET /api/notifications

List user's notifications (paginated)

**Query Parameters:**

- `unread` (boolean): Show only unread notifications
- `limit` (number): Max results (default: 20)
- `cursor` (string): Pagination cursor

**Response:**

```json
{
  "notifications": [...],
  "unreadCount": 5,
  "nextCursor": "clxxx..."
}
```
````

## PATCH /api/notifications/[id]/read

Mark specific notification as read

## PATCH /api/notifications/read-all

Mark all user's notifications as read

## GET /api/notifications/unread-count

Get unread notification count

```

---

## 🚀 Deployment Checklist

### Environment Setup

- [ ] Create Pusher account (https://pusher.com)
- [ ] Add Pusher credentials to Vercel
- [ ] Update both app .env files
- [ ] Test Pusher connection in development
- [ ] Run migrations on production databases

### Monitoring

- [ ] Set up Pusher dashboard monitoring
- [ ] Track notification delivery rates
- [ ] Monitor email sending logs
- [ ] Set up error alerting

---

## 📊 Success Metrics

### Week 1 Goals

- [ ] Database schema deployed
- [ ] Pusher integrated and working
- [ ] API routes functional
- [ ] Basic UI components built

### Week 2 Goals

- [ ] Notification bell in navbar
- [ ] Real-time delivery working
- [ ] Email fallback functional
- [ ] All booking events triggering notifications

### KPIs to Track

- **Notification delivery rate**: >99%
- **Email open rate**: >40%
- **Real-time delivery latency**: <2 seconds
- **User engagement**: >60% click-through rate

---

## 🔄 Future Enhancements (Phase B+)

**Post-MVP Features:**

- [ ] Notification preferences page
- [ ] Push notifications (Web Push API)
- [ ] SMS notifications (Twilio)
- [ ] Notification sounds
- [ ] Desktop notifications
- [ ] Notification categories/filtering
- [ ] Batch digest emails
- [ ] Notification templates system

---

## 📋 Task Breakdown

### Day 1-2: Email System Foundation
- [ ] Create @fishon/email package
- [ ] Set up React Email infrastructure
- [ ] Build shared email components (Layout, Header, Button, InfoBox)
- [ ] Initialize git repository

### Day 2-3: Email Templates
- [ ] Create booking email templates (Created, Approved, Rejected)
- [ ] Create notification email templates
- [ ] Set up email preview system
- [ ] Test email rendering

### Day 3: Integration
- [ ] Install @fishon/email in both apps
- [ ] Create email service wrappers
- [ ] Replace old email functions
- [ ] Test email sending

### Day 4-5: Notification Schema
- [ ] Add Notification model to both apps
- [ ] Run migrations
- [ ] Create types in @fishon/ui
- [ ] Update shared package

### Day 5-6: Pusher Setup
- [ ] Create Pusher account
- [ ] Add server utilities
- [ ] Create client hooks
- [ ] Create auth endpoint
- [ ] Test connection

### Day 7-8: Backend APIs
- [ ] Create notification service
- [ ] Build API routes (GET, PATCH)
- [ ] Integrate email templates
- [ ] Test with Postman

### Day 9-11: UI Components
- [ ] Build NotificationBell
- [ ] Build NotificationDropdown
- [ ] Build NotificationItem
- [ ] Integrate into Navbar
- [ ] Test responsive design

### Day 12: Integration & Testing
- [ ] Update booking create API
- [ ] Update booking approve API
- [ ] Update booking reject API
- [ ] Update booking cancel API
- [ ] Test end-to-end flow

### Day 13-14: Captain App & Final Polish
- [ ] Mirror schema changes
- [ ] Copy Pusher setup
- [ ] Create webhooks
- [ ] Add UI components
- [ ] Full QA testing
- [ ] Deploy to staging
- [ ] Production deployment

---

**Status**: Ready to begin - Email system refactor first
**Next Step**: Create @fishon/email package with React Email
**Owner**: Development Team
**Last Updated**: 2025-10-28

---

## 🎯 Key Benefits Summary

### Email System Benefits
✅ **Beautiful, Professional Design** - React Email components with responsive layouts
✅ **Dark Mode Support** - Works in all email clients
✅ **Live Preview** - See changes without sending real emails
✅ **Type Safety** - TypeScript interfaces for all templates
✅ **Reusable Components** - DRY principle across all emails
✅ **Consistent Branding** - Single source of truth
✅ **Easy Maintenance** - Component-based architecture

### Notification System Benefits
✅ **Real-time Delivery** - Instant notifications via Pusher
✅ **Multiple Channels** - In-app + Email + Push (future)
✅ **Unified Experience** - Same templates for web and email
✅ **Offline Support** - Email fallback when user offline
✅ **Preference Control** - Users can customize notification settings
✅ **Audit Trail** - All notifications stored in database

### Developer Experience
✅ **Single Package** - @fishon/email shared across apps
✅ **Preview System** - Visit /dev/emails to see all templates
✅ **Type Safety** - Compile-time validation
✅ **Git-based** - Version control for email templates
✅ **Easy Updates** - Change once, deploy everywhere
```

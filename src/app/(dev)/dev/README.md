# Development Tools

## Overview

This directory contains development and testing utilities for the Fishon.my application.

## Available Tools

### 🔔 Toast Preview (`/dev/toast-preview`)

**Purpose:** Preview and test all toast notification variants

**Features:**

- Basic toast types (default, success, error, warning, info, loading)
- Toasts with action buttons
- Toasts with cancel buttons
- Duration variations (short, long, infinite)
- Rich content examples
- Custom icons
- Promise-based toasts
- Multiple toasts
- Real app notification examples
- Sound control and testing

**Use Cases:**

- Testing toast appearance and behavior
- Verifying notification sound functionality
- Previewing different action button configurations
- Testing mobile responsiveness
- Debugging toast stacking and positioning

**Access:** Navigate to `/dev/toast-preview` or use the dev tools index at `/dev`

---

### 💾 Database Health (`/dev/db-health`)

**Purpose:** Check database connection and schema status

**Features:**

- Connection status verification
- Schema validation
- (Additional features TBD)

**Access:** Navigate to `/dev/db-health` or use the dev tools index at `/dev`

---

## Development Index

Access all dev tools from the central hub at `/dev`

## Adding New Tools

To add a new development tool:

1. Create a new page in `src/app/(dev)/dev/[tool-name]/page.tsx`
2. Add the tool to the index page in `src/app/(dev)/dev/page.tsx`
3. Document it in this README

Example:

```tsx
// src/app/(dev)/dev/my-tool/page.tsx
export default function MyToolPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">My Tool</h1>
      {/* Tool content */}
    </div>
  );
}
```

Then update the `tools` array in `/dev/page.tsx`:

```tsx
{
  title: "My Tool",
  description: "Description of what this tool does",
  icon: YourIcon,
  href: "/dev/my-tool",
  badge: "New",
}
```

## Security Note

⚠️ **Important:** These tools are for development only and should not be accessible in production. Consider adding authentication or environment checks before deploying.

Recommended approach:

```tsx
// In dev tool pages
if (process.env.NODE_ENV === "production") {
  return <div>Not available in production</div>;
}
```

## Usage

1. Start the development server: `npm run dev`
2. Navigate to `/dev` in your browser
3. Select the tool you want to use
4. Test and debug as needed

## Toast Preview Examples

The toast preview page includes examples for:

- **Booking Created**: New booking request notification
- **Booking Approved**: Booking approval with "Pay Now" action
- **Booking Rejected**: Booking rejection with details
- **System Announcement**: General announcements with "Learn More" action
- **Notification with Settings**: Quick access to notification preferences

All examples include:

- Emoji icons for visual distinction
- Descriptive messages
- Action buttons (View, Pay Now, Settings, etc.)
- Notification sound (when enabled)
- 5-second auto-dismiss duration (configurable)

## Technical Details

### Toast Library

- **Library:** Sonner (from shadcn/ui)
- **Position:** Bottom-right (desktop), bottom-center (mobile)
- **Stacking:** Automatic with smooth animations
- **Accessibility:** ARIA labels, keyboard navigation, screen reader support

### Notification Sound

- **Technology:** Web Audio API
- **Frequency:** 784 Hz sine wave
- **Duration:** ~200ms beep
- **Fallback:** HTML5 Audio with data URI
- **Storage:** localStorage (`notification-sound-enabled`)

### Deduplication

- **Method:** Global singleton Set at module level
- **TTL:** 10 seconds auto-cleanup
- **Scope:** Per notification ID across all components

# Phase 1 Testing - Step-by-Step Interactive Guide

This guide will walk you through testing all Phase 1 messaging endpoints step by step.

## ✅ Prerequisites Check

- [x] fishon-market running on http://localhost:3001
- [x] fishon-captain running on http://localhost:3000
- [ ] You are signed in to fishon-market as an angler
- [ ] You are signed in to fishon-captain as a captain
- [ ] You have at least one booking created

## Step 1: Verify Database Setup

Run this to check if messaging tables exist:

```bash
cd /Users/jangbersahaja/Website/fishon-market
npx prisma studio
```

In Prisma Studio:

1. Check if `Conversation` table exists ✅ / ❌
2. Check if `Message` table exists ✅ / ❌
3. Check if you have any bookings ✅ / ❌

## Step 2: Create Test Data

### Option A: Via Browser (Recommended)

1. **Sign in to fishon-market** (http://localhost:3001)
   - Sign in as an angler
   - Browse charters
   - Create a booking (any charter, any date)
   - Note the booking ID from the URL or confirmation page

2. **Create a conversation manually** (using Prisma Studio):
   - Open Prisma Studio: `npx prisma studio`
   - Go to `Conversation` table
   - Click "Add Record"
   - Fill in:
     - `bookingId`: (your booking ID)
     - `anglerId`: (your angler user ID)
     - `charterId`: (the charter ID from booking)
     - `ownerId`: (the captain/owner ID)
     - `status`: LOCKED
     - `anglerUnreadCount`: 0
     - `captainUnreadCount`: 0
   - Save

### Option B: Via API (if you prefer)

Use Postman or curl to call the endpoints directly.

## Step 3: Test Angler Endpoints (fishon-market)

Open your browser to http://localhost:3001 and sign in as an angler.

### Test 3.1: List Conversations

**Browser DevTools Console:**

```javascript
fetch("/api/conversations?role=angler&limit=10")
  .then((r) => r.json())
  .then((data) => {
    console.log("✅ Conversations:", data);
    // Save conversation ID for next tests
    window.testConvId = data.conversations[0]?.id;
    console.log("📝 Conversation ID:", window.testConvId);
  })
  .catch((e) => console.error("❌ Error:", e));
```

**Expected Result:**

```json
{
  "conversations": [...],
  "nextCursor": null,
  "hasMore": false,
  "totalUnread": 0
}
```

✅ PASS / ❌ FAIL

### Test 3.2: Get Single Conversation

**Browser DevTools Console:**

```javascript
// Use the conversation ID from previous test
fetch(`/api/conversations/${window.testConvId}`)
  .then((r) => r.json())
  .then((data) => console.log("✅ Conversation:", data))
  .catch((e) => console.error("❌ Error:", e));
```

**Expected:** Full conversation object with angler, captain, and booking details

✅ PASS / ❌ FAIL

### Test 3.3: List Messages

**Browser DevTools Console:**

```javascript
fetch(`/api/conversations/${window.testConvId}/messages?limit=50`)
  .then((r) => r.json())
  .then((data) => console.log("✅ Messages:", data))
  .catch((e) => console.error("❌ Error:", e));
```

**Expected:** List of messages (may be empty initially)

✅ PASS / ❌ FAIL

### Test 3.4: Send Message

**Browser DevTools Console:**

```javascript
fetch(`/api/conversations/${window.testConvId}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: "Hi Captain! Looking forward to the trip!",
    contentType: "text",
  }),
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Message sent:", data))
  .catch((e) => console.error("❌ Error:", e));
```

**Expected:**

```json
{
  "success": true,
  "message": { "id": "...", "content": "Hi Captain!...", ... }
}
```

✅ PASS / ❌ FAIL

**Note:** If conversation status is LOCKED, angler may not be able to send. This is expected behavior.

### Test 3.5: Mark as Read

**Browser DevTools Console:**

```javascript
fetch(`/api/conversations/${window.testConvId}/read`, {
  method: "PATCH",
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Marked as read:", data))
  .catch((e) => console.error("❌ Error:", e));
```

**Expected:**

```json
{
  "success": true,
  "message": "Conversation marked as read"
}
```

✅ PASS / ❌ FAIL

### Test 3.6: Close Conversation (Optional)

**Browser DevTools Console:**

```javascript
fetch(`/api/conversations/${window.testConvId}/close`, {
  method: "PATCH",
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Closed:", data))
  .catch((e) => console.error("❌ Error:", e));
```

✅ PASS / ❌ FAIL / ⏭️ SKIP

## Step 4: Test Captain Endpoints (fishon-captain)

Open http://localhost:3000 and sign in as the captain who owns the charter.

### Test 4.1: List Captain Conversations

**Browser DevTools Console:**

```javascript
fetch("/api/messages/conversations?limit=10")
  .then((r) => r.json())
  .then((data) => {
    console.log("✅ Captain conversations:", data);
    // Save conversation ID
    window.testConvId = data.conversations[0]?.id;
  })
  .catch((e) => console.error("❌ Error:", e));
```

**Expected:** List of conversations for captain's charters

✅ PASS / ❌ FAIL

### Test 4.2: Send Message as Captain

**Browser DevTools Console:**

```javascript
fetch("/api/messages/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    conversationId: window.testConvId,
    content: "Thanks for booking! See you at 6 AM at the dock.",
  }),
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Captain message sent:", data))
  .catch((e) => console.error("❌ Error:", e));
```

**Expected:**

```json
{
  "success": true,
  "message": { "id": "...", "content": "Thanks for booking!...", ... }
}
```

✅ PASS / ❌ FAIL

## Step 5: Verify Cross-App Synchronization

### Test 5.1: Captain Message Visible to Angler

1. Go back to fishon-market (angler view)
2. Run in console:

```javascript
fetch(`/api/conversations/${window.testConvId}/messages`)
  .then((r) => r.json())
  .then((data) => {
    console.log("✅ Messages:", data);
    const captainMsg = data.messages.find((m) => m.senderType === "CAPTAIN");
    if (captainMsg) {
      console.log("✅ PASS: Captain message visible to angler");
    } else {
      console.log("❌ FAIL: Captain message not found");
    }
  });
```

✅ PASS / ❌ FAIL

## Step 6: Test Error Cases

### Test 6.1: Invalid Role Parameter

**fishon-market console:**

```javascript
fetch("/api/conversations?role=invalid")
  .then((r) => r.json())
  .then((data) => {
    if (data.error) {
      console.log("✅ PASS: Error handling works");
    }
  });
```

Expected status: 400 ✅ / ❌

### Test 6.2: Empty Message Content

**fishon-market console:**

```javascript
fetch(`/api/conversations/${window.testConvId}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: "" }),
})
  .then((r) => r.json())
  .then((data) => {
    if (data.error) {
      console.log("✅ PASS: Validation works");
    }
  });
```

Expected status: 400 ✅ / ❌

### Test 6.3: Access Other User's Conversation

1. Sign in as a different angler
2. Try to access the conversation ID from previous tests
3. Should get 403 Forbidden

Expected status: 403 ✅ / ❌

## 📊 Test Results Summary

Fill in your results:

### fishon-market Endpoints (6 total)

- [ ] GET /api/conversations - List
- [ ] GET /api/conversations/:id - Single
- [ ] GET /api/conversations/:id/messages - List messages
- [ ] POST /api/conversations/:id/messages - Send message
- [ ] PATCH /api/conversations/:id/read - Mark as read
- [ ] PATCH /api/conversations/:id/close - Close

### fishon-captain Endpoints (2 total)

- [ ] GET /api/messages/conversations - List
- [ ] POST /api/messages/send - Send message

### Cross-App Features

- [ ] Messages sync between apps
- [ ] Unread counts work
- [ ] Permission checks work
- [ ] Validation works

### Total Score: \_\_\_/11

## ✅ Phase 1 Complete When:

- ✅ All 8 endpoints return expected responses
- ✅ Messages sync between fishon-market and fishon-captain
- ✅ Permission checks prevent unauthorized access
- ✅ Validation prevents invalid data
- ✅ Error handling returns appropriate status codes

## 🎯 Next Steps

Once all tests pass:

- [ ] Mark Phase 1.6 as complete in todo list
- [ ] Proceed to Phase 2: Booking Integration
- [ ] Implement auto-create conversations on booking
- [ ] Add system messages for booking status changes

## 🆘 Troubleshooting

**401 Unauthorized:**

- Make sure you're signed in
- Try signing out and back in
- Check that session cookies are being sent

**403 Forbidden:**

- Verify you're the owner of the conversation
- Check user role (angler vs captain)
- Verify charter ownership for captain

**500 Internal Error:**

- Check server console for error messages
- Verify database connection
- Check Prisma schema is up to date

**Messages not syncing:**

- Verify `CAPTAIN_DATABASE_URL` in fishon-captain .env
- Run `npx prisma generate --schema=prisma/schema-market.prisma` in fishon-captain
- Restart both servers

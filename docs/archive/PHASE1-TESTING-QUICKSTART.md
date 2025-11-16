# 🧪 Phase 1 Testing - Quick Start

## Current Status

✅ Both servers are running:

- fishon-market: http://localhost:3001
- fishon-captain: http://localhost:3000
  ✅ Database schema is up to date (26 migrations)
  ✅ All API routes created and type-checked

## 🎯 Recommended Testing Approach

### Option 1: Browser DevTools (EASIEST) ⭐

This is the **easiest and recommended** way to test:

1. **Open fishon-market in browser**: http://localhost:3001
2. **Sign in as an angler**
3. **Open Browser DevTools** (F12 or Cmd+Option+I)
4. **Go to Console tab**
5. **Follow the interactive guide**: `docs/PHASE1-TESTING-INTERACTIVE.md`

The guide has copy-paste JavaScript commands you can run directly in the console!

### Option 2: Postman Collection

Create a Postman collection with the endpoints from `docs/PHASE1-API-TESTING-GUIDE.md`

### Option 3: Curl Script

Use the bash script (requires auth cookie setup):

```bash
# Edit the script first to add your auth cookie
nano scripts/test-phase1-manual.sh

# Then run it
./scripts/test-phase1-manual.sh
```

## 📋 Before You Start Testing

You need:

1. ✅ **Signed in as angler** in fishon-market
2. ✅ **Signed in as captain** in fishon-captain
3. ⚠️ **At least one booking created**
4. ⚠️ **At least one conversation** (can create manually or via API)

## 🚀 Quick Test Checklist

### Step 1: Create Test Booking

1. Go to http://localhost:3001
2. Sign in as angler
3. Browse charters
4. Create a booking
5. Note the booking ID

### Step 2: Create Conversation (Manual via Prisma Studio)

Since Phase 2 (auto-create on booking) isn't implemented yet, create manually:

```bash
npx prisma studio
```

In Prisma Studio:

1. Go to `Conversation` table
2. Click "Add Record"
3. Fill in fields from your booking
4. Set `status` to "LOCKED"
5. Set unread counts to 0
6. Save

### Step 3: Test Angler Endpoints

Open fishon-market, go to DevTools Console, paste:

```javascript
// Test 1: List conversations
fetch("/api/conversations?role=angler")
  .then((r) => r.json())
  .then((data) => {
    console.log("✅ Conversations:", data);
    window.convId = data.conversations[0]?.id;
    console.log("📝 Saved conversation ID:", window.convId);
  });
```

```javascript
// Test 2: Get messages
fetch(`/api/conversations/${window.convId}/messages`)
  .then((r) => r.json())
  .then((data) => console.log("✅ Messages:", data));
```

```javascript
// Test 3: Send message (may fail if LOCKED)
fetch(`/api/conversations/${window.convId}/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: "Hi Captain!" }),
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Sent:", data));
```

### Step 4: Test Captain Endpoints

Open fishon-captain, go to DevTools Console, paste:

```javascript
// Test 1: List captain conversations
fetch("/api/messages/conversations")
  .then((r) => r.json())
  .then((data) => {
    console.log("✅ Captain conversations:", data);
    window.convId = data.conversations[0]?.id;
  });
```

```javascript
// Test 2: Send message as captain
fetch("/api/messages/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    conversationId: window.convId,
    content: "Thanks for booking!",
  }),
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Captain sent:", data));
```

### Step 5: Verify Cross-App Sync

Go back to fishon-market console:

```javascript
// Should see captain's message
fetch(`/api/conversations/${window.convId}/messages`)
  .then((r) => r.json())
  .then((data) => {
    const captainMsg = data.messages.find((m) => m.senderType === "CAPTAIN");
    console.log(captainMsg ? "✅ PASS: Captain message synced!" : "❌ FAIL");
  });
```

## 📊 Success Criteria

Phase 1 is complete when:

- [x] All code implemented and type-checked ✅
- [ ] GET /api/conversations works (fishon-market)
- [ ] GET /api/conversations/:id works
- [ ] GET /api/conversations/:id/messages works
- [ ] POST /api/conversations/:id/messages works
- [ ] PATCH /api/conversations/:id/read works
- [ ] PATCH /api/conversations/:id/close works
- [ ] GET /api/messages/conversations works (fishon-captain)
- [ ] POST /api/messages/send works (fishon-captain)
- [ ] Messages sync between apps
- [ ] Permission checks work (403 on unauthorized)
- [ ] Validation works (400 on invalid data)

## 🆘 Need Help?

See the detailed guides:

- **Interactive Guide**: `docs/PHASE1-TESTING-INTERACTIVE.md`
- **API Reference**: `docs/PHASE1-API-TESTING-GUIDE.md`
- **Implementation Summary**: `docs/PHASE1-IMPLEMENTATION-SUMMARY.md`

## ⏭️ After Phase 1 Testing

Once all tests pass, proceed to **Phase 2: Booking Integration**:

1. Auto-create conversations on booking
2. Send system messages on status changes
3. Unlock conversation on payment
4. Auto-closure cron job

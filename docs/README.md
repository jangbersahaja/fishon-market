# Fishon.my Documentation

This directory contains the **living documentation** for all Fishon.my features and systems.

## Configuration Documents

All feature documentation is consolidated in `/docs/config/`:

| Document | Feature | Description |
|----------|---------|-------------|
| [BOOKING_FLOW.md](./config/BOOKING_FLOW.md) | Booking System | Dual flow (MANUAL/AUTO), guest checkout, payment integration |
| [PAYMENT_SYSTEM.md](./config/PAYMENT_SYSTEM.md) | Payment | SenangPay integration, TOKENIZED/DIRECT flows, refunds |
| [CHAT_SYSTEM_CONFIGURATION.md](./config/CHAT_SYSTEM_CONFIGURATION.md) | Chat/Messaging | Angler-captain communication, Pusher real-time |
| [EMAIL_NOTIFICATION_SYSTEM.md](./config/EMAIL_NOTIFICATION_SYSTEM.md) | Email & Notifications | Zoho SMTP, Pusher notifications, webhooks |
| [SMS_SYSTEM.md](./config/SMS_SYSTEM.md) | SMS Notifications | Exabytes SMS integration |
| [I18N_SYSTEM.md](./config/I18N_SYSTEM.md) | Internationalization | next-intl, Malay/English support |
| [ANALYTICS_SYSTEM.md](./config/ANALYTICS_SYSTEM.md) | Analytics | Event tracking, captain dashboard |
| [TIME_BASED_SCHEDULING.md](./config/TIME_BASED_SCHEDULING.md) | Scheduling | Partial availability, advance notice |
| [PROMOTIONAL_BANNER_SYSTEM.md](./config/PROMOTIONAL_BANNER_SYSTEM.md) | Promotions | Campaign banners, tracking |

## Documentation Principles

1. **One document per feature** - Each feature has a single living document
2. **No phase/implementation docs** - All legacy planning docs have been removed
3. **Keep current** - Update docs when features change
4. **Configuration focus** - Documents describe how systems work, not how they were built

## Updating Documentation

When making changes to a feature:

1. Update the corresponding config document
2. Update the "Last Updated" date
3. Update the implementation status if needed
4. Add migration notes for breaking changes

## Related Documentation

- `/CONTRIBUTING.md` - How to contribute to the project
- `/README.md` - Project overview and setup
- Component-level READMEs in `/src/` directories

---

**Last Updated**: 25 November 2025

# Changelog

## 2026-11-15 — Telegram integration

- Replaced Twilio WhatsApp task reminders with Telegram bot messages.
- Added authenticated Telegram account linking, a Telegram webhook for task chat,
  and Telegram reminder delivery from the existing five-minute scheduler.
- Added the Telegram connection controls to TODO Settings.
- Removed the Twilio Functions dependency.
- Protected Siri API keys and Telegram connection fields from client-side writes;
  only a signed-in user can disconnect their own Telegram account.
- Kept Siri task chat and its server-side OpenAI secret integration intact.

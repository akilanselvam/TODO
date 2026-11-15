# Firebase Functions

## Telegram bot and task reminders

The `telegramGenerateLink` endpoint creates an authenticated, one-time link code
for the signed-in user. The app opens the AssistAk bot deep link; when the user
taps **Start**, Telegram calls `telegramWebhook`, which links the chat to the
Firestore account. Link codes expire after 15 minutes. The webhook then handles task chat using the same OpenAI
agent and Firestore task tools as Siri.

The `sendTaskReminders` scheduled function checks incomplete tasks every five
minutes and sends a Telegram message when a timed task is due in the next 15
minutes or was due up to five minutes ago. A Firestore delivery marker prevents
duplicate reminders. Telegram is now the reminder channel; the Twilio WhatsApp
function and dependency have been removed.

### Configure and deploy

The bot token comes from BotFather. Store it as the `TELEGRAM_BOT_TOKEN` Firebase
secret. `OPENAI_API_KEY` is also required by the existing Siri and Telegram chat
functions.

The webhook validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header. Create
a random 64-character hexadecimal value, store it as the `TELEGRAM_WEBHOOK_SECRET`
Firebase secret, and retain the same value for webhook registration. Keep both
secret values out of source control and the app's `.env` file.

Generate a webhook secret locally with:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

```sh
firebase functions:secrets:set TELEGRAM_BOT_TOKEN --project my-todo-app-akil
firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET --project my-todo-app-akil
firebase deploy --only functions --project my-todo-app-akil
```

Register the Telegram webhook once after deployment. Use the deployed
`telegramWebhook` URL printed by Firebase and the exact webhook secret you
stored above. For example, from PowerShell (the secure prompts keep values out
of command history):

```powershell
function Read-HiddenValue($prompt) {
  $secure = Read-Host -AsSecureString $prompt
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
$botToken = Read-HiddenValue 'Telegram bot token'
$webhookSecret = Read-HiddenValue 'Telegram webhook secret'
$body = @{ url = 'https://us-central1-my-todo-app-akil.cloudfunctions.net/telegramWebhook'; secret_token = $webhookSecret } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$botToken/setWebhook" -ContentType 'application/json' -Body $body
Remove-Variable botToken, webhookSecret, body
```

The web app reads `VITE_TELEGRAM_BOT_USERNAME` (defaults to `Akssist_bot`). Set
it in the frontend build environment, then build and deploy Hosting:

```sh
npm run build
firebase deploy --only hosting --project my-todo-app-akil
```

In the app, sign in, open **Settings → Telegram Reminders**, and tap
**Connect Telegram**. Tap **Start** in Telegram to link the account. The bot can
then manage tasks and deliver due-task reminders.

Cloud Functions scheduling requires the Firebase project to use the Blaze plan.

## Siri task assistant

`siriGenerateKey` verifies a Firebase ID token and returns the user's stable
Siri API key. `siriChat` accepts that key and a spoken message, runs the OpenAI
tool loop on the server, and stores conversation history under
`users/{uid}/siriSessions/{sessionId}`. OpenAI calls use Node 22's built-in
`fetch`; there is no `node-fetch` dependency.

The iOS Shortcut is built and shared from Apple's Shortcuts app. Its iCloud link
is configured in the frontend build as `VITE_SIRI_SHORTCUT_URL`. The Shortcut
posts `siriApiKey`, `message`, and an optional `sessionId` to:

```text
https://us-central1-my-todo-app-akil.cloudfunctions.net/siriChat
```

The user document's owner-only Firestore access protects the Siri key. Server
functions use the Admin SDK for task operations and Siri/Telegram session
history.

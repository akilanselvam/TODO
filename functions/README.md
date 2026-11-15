# WhatsApp task reminders

The scheduled `sendTaskReminders` function checks each signed-in user's
`users/{uid}/tasks` collection every 5 minutes. It sends one WhatsApp message
for each incomplete task due in the next 15 minutes or up to 5 minutes ago,
which catches tasks created shortly before their due time. Due dates and times
are interpreted in `Asia/Kolkata` by default. Change `TASK_TIME_ZONE` in the
function environment if the app's users use a different timezone.

## Prerequisites

- Firebase CLI installed and logged in.
- The `my-todo-app-akil` project on the Blaze plan, with Cloud Functions,
  Cloud Build, Artifact Registry, Secret Manager, and Cloud Scheduler enabled.
- For the current test setup, the Twilio Sandbox sender. Recipients must have
  joined the Sandbox and have an open 24-hour WhatsApp session for free-form
  reminder bodies. The app itself does not collect or request a join code.
  Outside the session window, use a registered production sender and approved
  template instead.
- A WhatsApp number saved under Settings in the app, in E.164 format such as
  `+919876543210`.

## Configure and deploy

From the repository root, set the three Twilio secrets. Firebase CLI prompts
for each value without requiring credentials to be written into source files:

```sh
firebase functions:secrets:set TWILIO_ACCOUNT_SID --project my-todo-app-akil
firebase functions:secrets:set TWILIO_AUTH_TOKEN --project my-todo-app-akil
firebase functions:secrets:set TWILIO_WHATSAPP_FROM --project my-todo-app-akil
```

For the current Sandbox test, use `whatsapp:+14155238886` for
`TWILIO_WHATSAPP_FROM`. The function sends a free-form body containing the task
title, due date, and due time. Only recipients already joined to this Sandbox
with an open 24-hour session will receive these body messages. For reminders
outside that window, register a production sender, create and approve a
task-reminder template, then update the function to use its Content SID.

The app asks users only for their international-format number. Saving the
number records their reminder opt-in; clearing it disables WhatsApp reminders.
Then deploy:

```sh
firebase deploy --only functions --project my-todo-app-akil
```

Scheduled functions require the Firebase project's Blaze plan. The deployment
creates the Cloud Scheduler job; no browser-side Twilio credentials are used.
View runtime logs with:

```sh
firebase functions:log --only sendTaskReminders --project my-todo-app-akil
```

## Siri task assistant

The HTTP functions `siriGenerateKey` and `siriChat` let an iOS Shortcut access a
user's cloud tasks. `siriGenerateKey` verifies the signed-in Firebase ID token
and returns that user's stable Siri API key. `siriChat` accepts that key and a
spoken message, runs the OpenAI tool loop on the server, and stores per-shortcut
conversation history under `users/{uid}/siriSessions/{sessionId}`. OpenAI calls
use Node 22's built-in `fetch`; no `node-fetch` dependency is needed.

Before deploying the Siri functions, configure the server-side OpenAI secret:

```sh
firebase functions:secrets:set OPENAI_API_KEY --project my-todo-app-akil
firebase deploy --only functions:siriGenerateKey,functions:siriChat --project my-todo-app-akil
```

The Settings screen derives the `siriGenerateKey` URL from
`VITE_FIREBASE_PROJECT_ID`. Once the one-time iOS Shortcut has been built and
shared, set `VITE_SIRI_SHORTCUT_URL` to its iCloud link in the environment used
to build the web app, then rebuild and deploy Hosting. Without that value, users
can still generate and copy their Siri API key, but the setup button cannot open
the Shortcut.

Configure the Shortcut to POST JSON to
`https://us-central1-my-todo-app-akil.cloudfunctions.net/siriChat` with
`siriApiKey`, `message`, and an optional `sessionId`. Its import question should
populate `siriApiKey` from the key shown in TODO Settings. The user document's
existing owner-only Firestore access protects the key; task operations and Siri
session history use the Admin SDK and do not need broader client rules.

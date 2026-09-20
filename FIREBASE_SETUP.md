# Firebase Setup — Cross-Device Sync

The app already contains all the code for Firebase Auth + Firestore sync. It is
**off by default**: with no Firebase config, the app runs in **local mode**
(data in `localStorage`, single device). Fill in the config below on a machine
that can reach Firebase, and it switches on automatically.

> Do this on a network/device that can reach Google/Firebase (not the locked-down
> work machine). Nothing here needs to run on the machine where it was built.

---

## How it behaves 

| State | Data store | Sync |
|---|---|---|
| No Firebase config | `localStorage` | none (this device only) |
| Config present, signed **out** | `localStorage` | none yet |
| Config present, signed **in** | Firestore `users/{uid}` | real-time across devices |

- On your **first sign-in**, whatever is currently in `localStorage` is copied up
  to your cloud document (so you don't lose local tasks).
- After that, the cloud collections are the source of truth and every device with
  the same Google account stays in sync live (via Firestore `onSnapshot` listeners).
- Sign out → back to local mode.

Data model: tasks and categories are separate documents, so editing one task
does not rewrite the user's entire task list:

- `users/{uid}/tasks/{taskId}` — task fields and inline subtasks
- `users/{uid}/categories/{encodedCategoryName}` — `{ name, createdAt, updatedAt }`

Firestore owns cloud audit timestamps. The app automatically migrates the older
`users/{uid}` document (`{ todos: [...], categories: [...] }`) the first time a
signed-in user opens the update, retaining that document as a rollback copy.

---

## 1. Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. Name it (e.g. `my-todo-app`). Google Analytics is optional (can disable).

## 2. Register a Web app
1. In the project, click the **Web** icon (`</>`) → register app (nickname e.g. `todo-web`).
2. **Do NOT** enable Firebase Hosting in this dialog yet (we do it via CLI later).
3. Copy the `firebaseConfig` values shown — you'll paste them into `.env` next.

## 3. Fill in `.env`
Open `.env` in the project root and set (values from step 2):

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=my-todo-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-todo-app
VITE_FIREBASE_STORAGE_BUCKET=my-todo-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

Then **restart the dev server** (`npm run dev`) — Vite only reads `.env` at startup.
`.env` is gitignored, so these values won't be committed.

## 4. Enable Google sign-in
Firebase console → **Build → Authentication → Get started** →
**Sign-in method** tab → enable **Google** → save.
(Later, when hosted, add your hosting domain under Authentication →
**Settings → Authorized domains**. `localhost` is authorized by default.)

## 5. Create Firestore
Firebase console → **Build → Firestore Database → Create database** →
start in **Production mode** → pick a region.

## 6. Publish security rules
The repo has [`firestore.rules`](firestore.rules) locking each user to their own
data. Apply it either way:

- **Console:** Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.
- **CLI:** `npm i -g firebase-tools` → `firebase login` → `firebase deploy --only firestore:rules`
  (run `firebase use --add` once to pick the project; creates `.firebaserc`).

## 7. Try it locally
`npm run dev` → open the app → click **Sign in** (top-right) → pick your Google
account. The header shows your avatar + "● Synced to cloud". Add a task, then open
the app in another browser/device signed into the same account — it appears live.

---

## Deploy (Firebase Hosting) — optional
```
npm i -g firebase-tools      # once
firebase login               # once
firebase use --add           # pick your project (once)
npm run build                # outputs to dist/
firebase deploy              # hosting + firestore rules (see firebase.json)
```
Then add the resulting `*.web.app` / `*.firebaseapp.com` domain to
Authentication → Settings → **Authorized domains**.

---

## ⚠️ Security notes before going public
- **OpenAI key** (Assistant) and Firebase web config are both shipped to the
  browser. Firebase web config is *designed* to be public — your Firestore
  **rules** are what protect data (already scoped per-user).
- The **OpenAI key is different** — a browser-exposed key can be stolen and abused.
  Before a public deploy, move OpenAI calls behind a proxy (e.g. a Cloud Function)
  and stop shipping the key. See `src/services/openai.js`.
- Keep `.env` out of git (already in `.gitignore`).

## Where the code lives
- `src/services/firebase.js` — reads env, initialises Firebase only if configured.
- `src/context/AuthContext.jsx` — Google sign-in/out, current user.
- `src/context/TodoContext.jsx` — picks backend (`local` vs `firestore`),
  per-task/category listeners and writes, plus first-sign-in seeding/migration.
- `firestore.rules`, `firebase.json` — security rules + hosting config.

## Troubleshooting
- **"Sign in" does nothing / popup blocked** → allow popups; ensure the domain is
  in Authentication → Authorized domains.
- **Red "Sync error" banner** → usually rules not published, or wrong `projectId`.
- **`auth/unauthorized-domain`** → add the domain under Authorized domains.
- **Still in local mode after filling `.env`** → you didn't restart `npm run dev`,
  or one of API key / project ID / app ID is blank.

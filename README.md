# 🏠 מטלות משפחתיות — Family Chores App

A Hebrew-first family chores & rewards app. Kids complete tasks, earn virtual coins, and parents approve everything with photo proof — all synced in real-time via Firebase.

---

## 🔗 Links

| | URL |
|---|---|
| **Production** | https://vercel.com/danielrojansky-8273s-projects/family_app |
| **GitHub** | https://github.com/danielrojansky/family-chores-app |
| **Firebase Console** | https://console.firebase.google.com/project/family-chores-app-d3bf2 |

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend / DB | Firebase Firestore (real-time) |
| Auth | Firebase Anonymous Auth |
| Icons | Lucide React |
| Deployment | Vercel |

---

## 📦 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env (see .env.example for keys)
cp .env.example .env

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

### Environment Variables (`.env`)

```env
VITE_FIREBASE_API_KEY=AIzaSyApIzUYCjdJdrCuZVBjkIS5-SW2Al-Rhzo
VITE_FIREBASE_AUTH_DOMAIN=family-chores-app-d3bf2.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=family-chores-app-d3bf2
VITE_FIREBASE_STORAGE_BUCKET=family-chores-app-d3bf2.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=767619080226
VITE_FIREBASE_APP_ID=1:767619080226:web:e387ca7625c3c519b56a7b
VITE_FIREBASE_MEASUREMENT_ID=G-RGW1R1WQH3
```

> ⚠️ Never commit the `.env` file — it's in `.gitignore`.

---

## 🌐 Deploy to Vercel

### First deploy
```bash
npm install -g vercel
vercel
```

### Subsequent deploys
```bash
vercel --prod
```

> Add all `VITE_*` environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

---

## 🗂 Project Structure

```
family-chores-app/
├── public/
│   └── manifest.json          # PWA manifest (Add to Home Screen)
├── src/
│   ├── App.jsx                # Entire app (all views + logic)
│   ├── main.jsx               # React entry point
│   └── index.css              # Tailwind base styles
├── index.html                 # Root HTML + PWA meta tags
├── vercel.json                # Vercel SPA routing config
├── vite.config.js             # Vite build config
├── tailwind.config.js
├── postcss.config.js
├── .env                       # Firebase keys (gitignored)
├── .env.example               # Template for env vars
└── .vscode/
    └── settings.json          # Editor settings (format on save, Tailwind)
```

---

## 🔥 Firebase Structure

```
artifacts/
  family-chores-app/
    public/
      data/
        config/
          main          ← family config (parents, kids, PINs, activity log)
        chores/
          {choreId}     ← individual chore documents
```

### Config document fields
```js
{
  isSetup: true,
  parentPin: "1234",          // 4-digit PIN for parent access
  parents: [{ id, name }],
  kids: [{
    id, name, avatar,         // emoji avatar e.g. "🦁"
    balance,                  // current coin balance
    pin,                      // optional 4-digit child PIN
    streak,                   // consecutive days with approved chores
    lastStreakDate,            // "YYYY-MM-DD"
    wishlist: [{ id, text }]  // kid's wish list items
  }],
  activityLog: [{ type, choreTitle, kidName, at, reward, note }]
}
```

### Chore document fields
```js
{
  title, reward,
  assignedTo,           // "all" | kidId
  status,               // "open" | "pending_approval" | "approved"
  completedBy,          // kidId
  isRecurring,          // boolean
  proofImage,           // base64 JPEG (compressed to 500px wide)
  rejectionNote,        // string — shown to child after rejection
  createdAt,            // Date.now()
  approvedAt            // Date.now() — set when approved
}
```

---

## ✨ Features by Phase

### Phase 1 — Security
- 🔐 **Parent PIN** — 4-digit numpad, always required
- 🔐 **Child PIN** — optional per child
- PIN management from parent Settings

### Phase 2 — Child UX
- 🎨 **Emoji avatars** — set per child (12 options)
- 🔥 **Streak counter** — consecutive days with approvals
- 📋 **Rejection notes** — parent's feedback shown to child
- 📜 **Completion history** — collapsible list of past approved chores
- 🎁 **Wishlist** — kids add items they want to save for

### Phase 3 — Parent Power
- ⭐ **Bonus coins** — add coins manually with a note (birthday, effort, etc.)
- ✍️ **Reject with note** — write feedback before sending back to child
- 📊 **Activity log** — live feed of all approvals, rejections, and bonuses

### Phase 4 — Polish
- 🎉 **Confetti animation** — fires on the child's screen when approved
- 📱 **PWA support** — Add to Home Screen on iOS & Android
- 🔄 **Real-time sync** — all changes instant via Firestore `onSnapshot`
- 🌐 **Vercel deploy** — `vercel.json` pre-configured for SPA routing
- 🧑‍💻 **VSCode config** — format-on-save, Tailwind IntelliSense

---

## 📱 Add to Home Screen (PWA)

**iOS:** Safari → Share → "Add to Home Screen"
**Android:** Chrome menu → "Add to Home Screen" or "Install app"

---

## 🛠 Planned / Future Ideas

- [ ] Push notifications when a chore is approved/rejected
- [ ] Weekly chore templates
- [ ] Parent dashboard mobile view / native app
- [ ] Photo proof stored in Firebase Storage (instead of inline base64)
- [ ] Multiple families / invite link
- [ ] Chore categories and difficulty levels
- [ ] Export history to PDF/CSV

---

## 👨‍💻 Author

Daniel Rojansky — [github.com/danielrojansky](https://github.com/danielrojansky)

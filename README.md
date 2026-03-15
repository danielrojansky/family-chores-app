# Family Chores App v3.0

A Hebrew-first (RTL) family chores and rewards application. Kids complete tasks, earn virtual coins, and parents approve everything with photo proof. Multi-family, multi-user, real-time synced.

## Links

| | URL |
|---|---|
| Production | https://family-app-danielrojanskys-projects.vercel.app |
| GitHub | https://github.com/danielrojansky/family-chores-app |
| Vercel Dashboard | https://vercel.com/danielrojansky-8273s-projects/family_app |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, SWR (3s polling) |
| Styling | Tailwind CSS, RTL-first |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Upstash Redis (`@upstash/redis`) |
| Auth | Google Identity Services (OAuth), email/password, WebAuthn/Passkeys |
| Security | `crypto.scrypt` password hashing, `@upstash/ratelimit`, server-side PIN validation |
| Icons | Lucide React |
| Routing | React Router DOM v7 |
| Deployment | Vercel (auto-deploy from `main` branch) |

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env from template
cp .env.example .env
# Fill in your Upstash Redis and Google OAuth credentials

# 3. Start dev server
npm run dev
# Opens at http://localhost:5173
```

## Environment Variables

### Required (local `.env` and Vercel)

| Variable | Description |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID (from Google Cloud Console) |

### Required (Vercel only, production)

| Variable | Description |
|---|---|
| `APP_ORIGIN` | Full origin URL, e.g. `https://your-app.vercel.app` (used for CORS) |
| `ADMIN_EMAIL` | Admin Google email, e.g. `daniel.rojansky@gmail.com` (locks admin to Google-only login) |
| `RP_ID` | WebAuthn relying party ID — just the hostname, e.g. `your-app.vercel.app` (no `https://`) |

### Optional

| Variable | Description |
|---|---|
| `ADMIN_SETUP_KEY` | One-time setup key for password-based admin bootstrap (not needed when `ADMIN_EMAIL` is set) |

> **Note:** Never commit `.env` — it is in `.gitignore`.

## Project Structure

```
family-chores-app/
├── api/                           # Vercel serverless functions
│   ├── _lib/
│   │   ├── auth.js                # Session validation, family access middleware
│   │   ├── rateLimit.js           # @upstash/ratelimit instances (login, PIN, API)
│   │   └── security.js            # crypto.scrypt hashing, CSPRNG tokens, invite codes
│   ├── admin.js                   # Admin panel API (families, users, invites, sessions)
│   ├── auth.js                    # User auth (Google login, email login, register, sessions)
│   ├── data.js                    # Family data CRUD (config, chores, PIN validation)
│   ├── invite.js                  # Public invite acceptance flow
│   ├── log.js                     # Activity logging
│   ├── migrate.js                 # Data migration utilities
│   └── webauthn.js                # WebAuthn/Passkey registration and authentication
├── src/
│   ├── App.jsx                    # Router: /, /family/:id, /invite/:code, /admin
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # Tailwind base + custom animations
│   ├── constants.js               # Version, storage keys, avatar list
│   ├── context/
│   │   ├── AuthContext.jsx         # User authentication state (Google, email, sessions)
│   │   └── FamilyContext.jsx       # Family data provider (SWR polling, profile state)
│   ├── lib/
│   │   ├── api.js                  # API helpers (fetcher, apiCall, adminCall, authCall)
│   │   ├── logger.js               # Client-side activity logging
│   │   ├── session.js              # localStorage family session (familyId, profileId)
│   │   ├── utils.js                # Shared utilities
│   │   └── webauthn.js             # Client-side WebAuthn helpers
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminDashboard.jsx  # Full admin panel (6 tabs)
│   │   ├── auth/
│   │   │   └── LoginPage.jsx       # Login/register with Google, email, passkeys
│   │   ├── family/
│   │   │   ├── Landing.jsx          # Family selector after login
│   │   │   ├── FamilyApp.jsx        # Family app shell (auth gate, PIN, routing)
│   │   │   ├── FamilySetup.jsx      # First-time family configuration wizard
│   │   │   ├── ProfilePicker.jsx    # Parent/kid profile selection
│   │   │   ├── ParentDashboard.jsx  # Parent view (chores, approvals, settings)
│   │   │   └── ChildDashboard.jsx   # Kid view (tasks, coins, wishlist, streaks)
│   │   ├── invite/
│   │   │   └── InviteAccept.jsx     # Public invite link handler
│   │   ├── modals/
│   │   │   ├── BonusModal.jsx       # Add bonus coins modal
│   │   │   └── RejectModal.jsx      # Reject chore with note modal
│   │   ├── settings/
│   │   │   ├── FamilySettingsForm.jsx  # Family name, members, invite links
│   │   │   └── PinSettingsForm.jsx     # PIN management
│   │   └── ui/
│   │       ├── Confetti.jsx         # Approval celebration animation
│   │       ├── Header.jsx           # Shared app header
│   │       ├── PinEntry.jsx         # Server-validated PIN pad with lockout
│   │       └── Toast.jsx            # RTL-aware toast notifications
│   └── ...
├── public/
│   └── manifest.json              # PWA manifest
├── index.html                     # Root HTML (includes Google GIS script)
├── vercel.json                    # Vercel routing (API + SPA fallback)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env.example
```

## Database Schema (Upstash Redis)

### User & Auth keys

| Key | Type | Description |
|---|---|---|
| `app:users` | SET | All registered user emails |
| `app:users:{email}` | JSON | User profile (email, name, picture, provider, families[], passwordHash) |
| `app:user:sessions:{token}` | JSON | User session (email, families, expiresAt) — 7-day TTL |
| `app:admin:passwordHash` | STRING | Hashed admin password (scrypt format) |
| `app:admin:sessions:{token}` | JSON | Admin session (ip, createdAt, expiresAt) — 24h TTL |
| `app:admin:sessions:all` | SET | All admin session tokens |

### Family data keys

| Key | Type | Description |
|---|---|---|
| `app:families` | SET | All family IDs |
| `family:{id}:config` | JSON | Family config (parents, kids, PINs, familyName, isSetup) |
| `family:{id}:chores` | JSON | Array of chore objects |
| `family:{id}:log` | LIST | Activity log entries |

### Invite keys

| Key | Type | Description |
|---|---|---|
| `app:invites:all` | SET | All invite codes |
| `app:invites:{code}` | JSON | Invite details (familyName, familyId, type, used) |

### Security keys

| Key | Type | Description |
|---|---|---|
| `pin:attempts:{familyId}:{profileId}` | INT | Failed PIN attempts counter |
| `pin:locked:{familyId}:{profileId}` | STRING | Lockout timestamp — 10min TTL |
| `webauthn:challenge:{email}` | STRING | WebAuthn challenge — 5min TTL |
| `webauthn:creds:{email}` | HASH | Stored WebAuthn credentials |
| `rl:login:{id}` | — | Rate limit: 5 per 15 min |
| `rl:pin:{id}` | — | Rate limit: 5 per 10 min |
| `rl:api:{id}` | — | Rate limit: 120 per min |

## Security Model

- **Authentication:** Google OAuth + email/password + WebAuthn passkeys. Sessions stored in Redis with TTL.
- **Family isolation:** Every data request passes through `requireFamilyAccess()` middleware that verifies the user's session includes the requested family ID.
- **Admin access:** Locked to a single Google account via `ADMIN_EMAIL` env var. Password login is disabled when this is set.
- **Password hashing:** Node.js `crypto.scrypt` (memory-hard). Legacy `simpleHash` values are transparently migrated on next login.
- **PIN validation:** Server-side only. PINs are never sent to the client. 5 attempts before 10-minute lockout.
- **Rate limiting:** `@upstash/ratelimit` sliding window on login, PIN, and general API endpoints.
- **CORS:** Restricted to `APP_ORIGIN` when set.
- **Tokens:** Generated with `crypto.randomBytes` (CSPRNG).

## Admin Panel

Accessible at `/admin`. When `ADMIN_EMAIL` is set, only that Google account can log in.

| Tab | Description |
|---|---|
| Families | List, rename, delete families. View members, reset PINs, delete media. |
| Users | List registered users. Assign/remove from families, link to family members, delete. |
| Invites | Create invite codes for new families. Copy invite links, revoke. |
| Sessions | View active admin sessions. Revoke individual or all. |
| Logs | View activity logs across all families or filtered by family ID. |
| Settings | Change admin password (when password login is enabled). |

## Features

### For Kids
- Emoji avatar selection (12 options)
- Task completion with optional photo proof
- Virtual coin balance and rewards
- Streak counter (consecutive days with approved chores)
- Personal wishlist
- Confetti animation on chore approval

### For Parents
- Approve/reject chores with notes
- Add bonus coins with custom notes
- Manage chores (create, edit, delete, recurring)
- Family settings (name, members, PINs)
- Generate invite links for other family members
- WebAuthn/passkey management
- Google-authenticated parents skip PIN entry

### Architecture
- Multi-family support — one user can belong to multiple families
- Real-time sync via SWR with 3-second polling
- PWA support (Add to Home Screen on iOS/Android)
- RTL Hebrew UI throughout
- Responsive design (320px to 1280px+)

## Deployment

The app auto-deploys to Vercel on every push to `main`.

```bash
# Manual deploy
vercel --prod
```

After deploying, set environment variables in Vercel Dashboard > Project > Settings > Environment Variables, then trigger a redeploy.

## Version History

| Version | Highlights |
|---|---|
| 3.0.0 | Enhanced chore management, Google PIN bypass, animations, family names |
| 2.3.0 | Security refactor: scrypt hashing, WebAuthn, rate limiting, family data isolation |
| 2.2.0 | Family join invites, family rename, user-member linking |
| 2.1.0 | Google & email authentication, user-family management |
| 2.0.0 | Multi-family architecture, admin panel, invite system, logging |
| 1.3.0 | Full responsive design pass |
| 1.2.0 | Migrated from Firebase to Upstash Redis |
| 1.0.0 | Initial release — single-family, Firebase backend |

## Author

Daniel Rojansky — [github.com/danielrojansky](https://github.com/danielrojansky)

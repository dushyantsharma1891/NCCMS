# NCCMS — National Citizen Complaint Management System

## What's new in this version

- **Passwords everywhere:** every form that creates or changes a password has a *Re-enter password* box with a live match check and strength meter; every password box has a Show/Hide eye.
- **Fixed, collapsible side menu:** the sidebar stays in place while you scroll. Use the ☰ button (or Ctrl/⌘ + B) to hide and show it; the choice is remembered. On phones it opens as a slide-over drawer.
- **Help chat box:** the floating "Need help?" button on the home page, department pages and all citizen pages chats with the visitor and drafts a complaint. "Create complaint with this suggestion" opens the normal form pre-filled (guests are asked to log in first). Nothing is ever submitted automatically.
- **Status updates fixed:** the Update Status dropdown now sends the status you actually pick and only offers what your role may do (Officer: Accept → In Progress → Resolved; Admin: forward moves plus Reject/Close; Super Admin: any). The public Track page now shows the progress steps.
- **Optional fields when creating accounts:** Super Admin / Admin can create admins, officers and citizens with only the essentials. Blank name, e-mail or password are auto-generated and shown once (a generated password must be changed at first login). Visibility scope stays optional.
- **Rank-based home pages:** Citizen, Officer, Admin and Super Admin each get their own colour banner, live stats and shortcuts.
- **Extras:** notification bell with unread count in the top bar, and a stricter rule that Officers can never Reject/Close.

## Deploying online (Render + MongoDB Atlas)

See **[DEPLOY.md](DEPLOY.md)** for the step-by-step guide. In short: create a free Atlas cluster, push the project to GitHub, then in Render choose *New → Blueprint* (it reads `render.yaml`) and enter your `MONGO_URI` and a Super Admin password. One service serves both the API and the website; uploaded images are kept in MongoDB; the first start seeds the departments and Super Admin automatically (no public demo accounts).

## Latest additions (About page, officer scope, false complaints)

- **About page — national leadership in rank order:** President (Rank 1) → Prime Minister (Rank 2) → **Cabinet Secretary, an IAS officer and head of the civil services (Rank 3)** → other senior officials such as the Home Secretary. Each card shows photo, designation, IAS batch/cadre, "in office since" and tenure. The Super Admin can edit all of it (and add more senior officials) in **Settings**. The page also explains the political vs permanent executive and how responsibility flows on NCCMS.
- **Officer visibility scope (dropdowns):** when an officer is created — and any time afterwards (Super Admin: Officers → edit; Admin: Officers → *Edit scope*) — pick a **state** and optionally a **district** from dropdowns. No scope = whole department; state only = state-wide; state + district = that district only.
- **Scope-aware assignment:** the "Assign to Officer" list shows only officers whose scope covers the complaint's location, and the server refuses any other assignment. A complaint from *New Delhi* is never offered to an officer scoped to *Central Delhi*; officers also only see complaints inside their scope (complaints already assigned to them always stay visible).
- **Fake / false complaints:** an assigned officer can **report a complaint as fake or false** with feedback, optionally closing it at once. Reports land in the admins' new **False Complaints** section (Admin and Super Admin). The admin can **dismiss** (a complaint the officer closed is reopened automatically) or **confirm** it and choose: record only, **warn** the citizen, or **deactivate the citizen's account**. Confirmed cases count as strikes on the citizen, and the officer is told the outcome. Officers see their own reports under *My False-Complaint Reports*.

## Latest additions (chat, helpline, auto-close)

- **Chat with the handling officer:** on a complaint, the citizen's right-hand panel has two options — *Chat with handling officer* and *Department helpline*. The assigned officer (and Admin / Super Admin, for oversight) see the same conversation and can reply. Chat is read-only once a complaint is Closed or Rejected.
- **Department Complaint Head:** an Admin (own department) or Super Admin can give ONE officer per department the *Complaint Head* rank (Officers page → "Make Complaint Head"). The department helpline sends citizens' questions straight to that officer, who answers from **Officer → Department Helpline**. If no head is set, the Admin team receives the question instead. The head is shown on the public department page.
- **Two helplines for citizens:** *Department helpline* (goes to the Complaint Head) and *NCCMS official helpline* (Admin team). Admins can filter by channel.
- **Auto-close:** a complaint that stays **Resolved for 42 hours** is closed automatically (checked every 10 minutes; change the number with `AUTO_CLOSE_HOURS` in `backend/.env`). Citizens, officers and admins see a live countdown, and the citizen is notified.
- **Better tracking:** progress bar, timestamp for every stage, "an officer is handling this" indicator, days open, auto-refresh every 30 s, copy-ID button, and a one-click jump to the full view and chat.

## Quick start on macOS

```bash
brew install node            # Node 20.19+ (22 recommended)
brew tap mongodb/brew && brew install mongodb-community
brew services start mongodb-community
chmod +x setup-mac.sh start-mac.sh
./setup-mac.sh               # installs deps, creates .env files, seeds data
./start-mac.sh               # API on :5001, site on http://localhost:5173
```

Notes for Mac: the API uses port **5001** because macOS Monterey+ reserves port
5000 for AirPlay Receiver. `node_modules` were removed from this package because
they contained Windows-only binaries — `npm install` rebuilds them for your Mac
(Intel or Apple Silicon). Super Admin login: `superadmin@nccms.gov.in` / `SuperAdmin@123`.

A full MERN-stack complaint management platform with JWT auth, role-based access
(Citizen / Officer / Admin / Super Admin), complaint CRUD with image uploads,
status timelines, notifications, and dashboards with charts.

This is a **real React project** (Vite + React Router + Tailwind + Chart.js), not
a single CDN-based HTML file — it builds and runs as a standard MERN app.

## Structure

```
nccms/
├── backend/     Express + MongoDB (Mongoose) REST API, JWT auth
└── frontend/    React (Vite) + Tailwind CSS + Chart.js
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

## 1. Backend setup

```bash
cd backend
cp .env.example .env      # then edit MONGO_URI / JWT_SECRET as needed
npm install
npm run seed               # creates departments, categories, a super admin & a demo officer
npm run dev                 # starts API on http://localhost:5001
```

Seeded demo accounts (change the passwords after first login):

| Role    | Email                        | Password    |
|---------|-------------------------------|-------------|
| Admin   | admin@nccms.gov.in            | Admin@123   |
| Officer (Police dept) | officer.police@nccms.gov.in | Officer@123 |
| Officer (Municipal Corporation dept) | officer.municipal@nccms.gov.in | Officer@123 |

Citizens self-register from the app. To test the officer assignment flow:
log in as admin → file a complaint as a citizen against Police or Municipal
Corporation → open that complaint's details page as admin → assign it to the
matching demo officer → log in as that officer to see it under "My Assigned
Complaints" and act on it.

## 2. Frontend setup

```bash
cd frontend
cp .env.example .env       # VITE_API_URL, defaults to /api (proxied to backend in dev)
npm install
npm run dev                 # starts app on http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5001`, so
no CORS configuration is needed in development.

## 3. Build for production

```bash
cd frontend
npm run build     # outputs static files to frontend/dist
```
Serve `frontend/dist` with any static host (Nginx, Vercel, Netlify) and point
`VITE_API_URL` at your deployed backend, or serve it directly from Express by
adding a static + catch-all route in `backend/server.js`.

## What's implemented

### Visual identity
- A self-contained SVG emblem (24-spoke wheel motif, echoing the flag) and a
  government-building watermark — both drawn as SVG so the whole app works
  **fully offline with zero external image dependencies** (no real photographs
  of government buildings are bundled — those are under photographer/agency
  copyright and can't legitimately be redistributed in generated code; the
  watermark/emblem are original vector art in the same spirit).
- Used in the navbar, the redesigned homepage hero, and the printable receipt.
- "Department of Public Grievances" header branding throughout.

### Home page (redesigned, not just re-skinned)
- Live impact numbers (total complaints, resolved, departments, citizens) —
  pulled from a public `/api/meta/public-stats` endpoint, no login needed.
- A quick "Track Complaint" box embedded directly in the hero — type a
  Complaint ID right from the homepage.
- A "Why NCCMS" feature strip explaining officer accountability, auto-archival
  privacy, printable receipts, and the language toggle.
- Government-building watermark behind the hero and the "How it works" section.

### Printable official receipt
- Every complaint has a "🖨️ Print Receipt" button → a dedicated, print-optimized
  page with a government-style header (emblem + department name), the full
  complaint record, and a "Digitally Verified" signature/stamp block with
  watermark. `window.print()` triggers the browser's print dialog; the
  navbar/sidebar are excluded from the printout.

### Admin — unlimited power
- **Permanently delete any user** (citizen or officer) — not just deactivate —
  via Admin → Citizens / Admin → Officers (`DELETE /api/admin/users/:id`).
  The only guard is that an admin can't delete their own account (avoids
  locking everyone out).
- **Full edit rights on any complaint at any status** (title, description,
  category, priority, department, location, state, district) via an inline
  "✏️ Edit Complaint" panel — not limited to the citizen's pending-only edit.
- **Permanently delete any complaint** ("🗑️ Delete Permanently" on the
  complaint page).
- **Create and permanently delete departments and complaint categories**
  (Admin → Manage Departments) — full CRUD, not just deactivate.
- Can view archived (auto-hidden) complaints via a toggle, assign/reassign
  officers, override any status including Reject/Close, and see an
  "Escalated to You" count of complaints officers have flagged for review.

### Government officer — real but bounded power
- Officer accounts get an **auto-generated Employee ID** the moment admin
  creates them (e.g. `POL-0001`, derived from the department name + a running
  count) — nothing for the admin to type or get wrong.
- Officers can only act on complaints an **admin has explicitly assigned** to
  them; the department queue is visible (so they know what's coming) but
  read-only until assigned.
- Officers can update status, add remarks, and **upload/view attached files
  and images** on their assigned complaints, and see the citizen's contact
  info for complaints assigned to them.
- Officers **cannot** reject, close, reassign, or delete a complaint, and
  **cannot** delete any user account — those stay admin-only.
- New: officers can **🚩 Escalate to Admin** — flag an assigned complaint with
  a note when it needs admin-level action (reassignment, rejection, etc.);
  every admin gets notified.

### Auto-archival (complaints "disappear" without being deleted)
- A complaint that reaches **Resolved, Closed, or Rejected** quietly drops out
  of active lists (citizen/officer/admin dashboards and complaint lists)
  **~4 days later**. Complaints that are Pending, Accepted, Assigned, or In
  Progress are **never** auto-hidden, however old.
- Nothing is actually deleted — the record is still reachable by direct link,
  by public tracking, and by admins via the "Show archived" toggle.

### Auth & core workflow
- **Auth**: JWT-based register/login for citizens, admin-created officer
  accounts, role-aware login (citizen / officer / admin), profile view & edit.
- **Complaints**: create with multi-image upload, auto-generated IDs
  (`CMP202600012` style), full status lifecycle (Pending → Accepted → Assigned →
  In Progress → Resolved / Closed / Rejected), officer remarks + resolution
  proof images, audit timeline/history, anonymous submission option.
- **Role-based access & visual identity**: citizens see only their own
  complaints; officers see their department queue but can only act on assigned
  ones; admins see and can do everything. Each role gets a distinct look
  (badge, accent color, sidebar highlight) — Citizen (blue), Officer (teal),
  Admin (purple/gold "super" theme).
- **Departments & categories**: seeded with the full department list from the
  spec (Central/State Government, Public/Private Sector) and complaint
  categories. Clicking any department card on the Departments page takes a
  logged-in citizen straight into the complaint form with that department
  already selected (logged-out users are sent to login first, then redirected
  back into the pre-filled form).
- **All India states & districts**: a real state → district dataset is served
  from `/api/meta/states-districts` and used everywhere a location is
  collected (citizen registration, officer registration, complaint form) as
  dependent dropdowns.
- **Working public complaint tracking**: `/track` requires no login — public
  `GET /api/complaints/track/:complaintId` endpoint, full status + history.
- **Dark mode**: toggle in the navbar, persisted to localStorage.
- **Hindi / English language toggle**: toggle in the navbar (EN / हिं),
  persisted, covers nav, sidebar, landing, login, register, departments,
  tracking. Dictionary at `frontend/src/i18n/translations.js`.
- **Dashboards**: Citizen, Officer (assigned-to-me + department queue), and
  Admin dashboards with stat cards and Chart.js charts.
- **Search & filters**: complaints by ID/status/category/department; citizens
  and officers by name, email, phone, Aadhar, state, district.
- **Notifications**: in-app, generated on submit/assign/resolve/reject/escalate.
- **Security**: bcrypt password hashing, JWT auth, helmet, rate limiting, mongo
  sanitization, protected routes, and server-side permission checks enforcing
  the officer/admin power hierarchy (not just hidden buttons in the UI).

## Role hierarchy at a glance

| Action | Citizen | Officer | Admin |
|---|---|---|---|
| Submit / track own complaints | ✅ | – | – |
| View department's complaint queue | – | ✅ (read-only until assigned) | ✅ (all departments) |
| Update status / add remarks / upload proof | – | ✅ only if assigned to them | ✅ always |
| View attached files/images on assigned complaints | – | ✅ | ✅ |
| Escalate a complaint to admin | – | ✅ | – |
| Reject or Close a complaint | – | ❌ | ✅ |
| Edit any complaint field at any status | – | ❌ | ✅ |
| Assign / reassign complaint to an officer | – | ❌ | ✅ |
| Register officer accounts (auto Employee ID) | – | ❌ | ✅ |
| Search/manage citizens | – | ❌ | ✅ |
| Activate/deactivate any account | – | ❌ | ✅ |
| **Permanently delete** any user | – | ❌ | ✅ |
| **Permanently delete** any complaint | – | ❌ | ✅ |
| Create/delete departments & categories | – | ❌ | ✅ |

## Not implemented (flagged as "Future AI Features" in the original spec)

AI-based auto-classification/spam detection/priority detection/sentiment
analysis, GIS heat maps, email/SMS notifications, and OTP verification are out
of scope for this build — they need external services (an LLM/ML pipeline,
SMS/email gateways) and API keys that only you can provision. The codebase is
structured so any of them can be added as a new controller/service without
touching the rest of the app.

**A note on the watermark/emblem**: real photographs of Rashtrapati Bhavan,
Parliament House, or India's official state emblem belong to photographers,
agencies, or are protected government symbols with restricted commercial/
redistribution use — they can't legitimately be bundled into generated code.
Instead, `frontend/src/assets/Logo.jsx` and `Watermark.jsx` are original SVG
illustrations in the same visual spirit (a wheel motif and a domed-building
silhouette) with zero external image dependencies, so the app works fully
offline. If you have the rights to specific official photography, drop the
files into `frontend/public/` and swap the `<Watermark />`/`<Logo />` usages
for an `<img>` tag pointing at them.

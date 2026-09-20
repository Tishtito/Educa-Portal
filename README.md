# Educa Staff

The staff portal for **Educa**, used by **examiners** and **class teachers**:

- **Examiners** enter marks for the subjects they are assigned.
- **Class teachers** look after their class: pupils, mark lists and report cards.

School administrators and platform superadmins use
[Educa Admin](../Educa_Admin) instead.

It is a React app that runs as an installable **PWA** and ships as **Android**
and **iOS** apps through Capacitor. All data comes from the Laravel API in
[`../Educa_Lara`](../Educa_Lara). The stack is the same as Educa Admin's. The
foundation (API client, UI kit, marksheet and report-card components) was copied
from there, not shared, so the two apps can be released separately.

| | |
|---|---|
| UI | React 19, TypeScript, Tailwind v4, shadcn/ui (Radix) |
| Data | TanStack Query, React Hook Form + Zod |
| Routing | React Router 8 (data router, lazy pages) |
| App shells | vite-plugin-pwa, Capacitor 8 |
| Checks | `tsc`, oxlint, Vitest |

## Getting started

```bash
npm install
cp .env.example .env.local     # VITE_API_URL=http://127.0.0.1:8000/api
npm run dev                    # http://localhost:5174
```

Run the API alongside it (`composer run dev` in `Educa_Lara`). The API's default
`CORS_ALLOWED_ORIGINS` already includes `localhost:5174` and the preview port
`4174`.

Three dev servers run side by side, each on a fixed port: **5173** Educa Admin,
**5174** Educa Staff, **5170** the API's own Vite (Laravel's welcome page).
A port clash now fails loudly instead of moving an app onto a neighbour's port.

Demo sign-in after seeding the API:

| Username or email | Password | |
|---|---|---|
| `teacher` | `password` | class teacher of Grade 5 Blue |
| `examiner` | `password` | examiner of Grade 5 Blue's subjects |

Sign-in takes a username **or** an email address (`teacher@gatimu.educa.test`),
and no school code: both are unique across every school.

**Continue with Google** signs in an existing account whose email matches the
Google account, and can also accept an invitation. It appears once
`VITE_GOOGLE_WEB_CLIENT_ID` is set (see `.env.example`) and the API has the same
client. Set-up, including the Android SHA-1 and the iOS URL scheme, is in
`Educa_Lara/docs/authentication.md`. Sessions end after 90 days, or 30 days
unused. The Account page lists signed-in devices and can sign them out.

**Subscription.** While the school's Educa subscription has lapsed, **Marking**,
**Mark list**, **Reports** and a class's **Marks** tab are blurred with a notice,
and the API refuses them with 402. Pupils and the account stay usable. Renewal
happens in Educa Admin.

A user who is only an administrator is refused and pointed to Educa Admin. An
administrator who is also a class teacher or examiner can sign in.

Staff invited by email set their password at `/invite/:token`. "Forgot your
password?" emails a link to `/reset-password/:token`. Both links come from the
API (`EDUCA_PORTAL_URL`, see `Educa_Lara/docs/email.md`). In development they
land in Mailpit at http://localhost:8025.

## What each role gets

| Tab | Who | |
|---|---|---|
| Home | everyone | The current exam and its status, "switch exam" (remembered on the account, so it follows you to other devices), and a summary of your own work. |
| Marking | examiners | Your marksheets for the current exam, grouped by class, with progress. Marks can be entered only while the exam is in *marking*; otherwise sheets are read-only. You can change marks-out-of for your class. |
| My class | class teachers | **Pupils:** search, admit a new pupil into your class, move a pupil to another class, and see a pupil's profile with class history and results. **Marks:** every subject's marksheet, read-only. |
| Mark list | class teachers | Ranked mark list with print and CSV; **compare** with an earlier exam (change in subject means, class mean and each pupil's mean); **rubric** view (each pupil's level per subject, plus pupils per level). |
| Reports | class teachers | Remarks and fee balances, card preview (this exam or the whole term), and single or whole-class PDFs. |
| Account | everyone | Your roles and assignments this year, theme, password, sign out. |

A person with both roles sees both sets of tabs. The API enforces all of this.
The app only hides what you cannot use:

- Examiners can enter marks only for class × subject pairs they are assigned in
  the exam's year.
- Class teachers can open mark lists, report cards and pupils only for their own
  classes. They can admit and move pupils, but cannot delete a pupil or change
  a pupil's status; the school office does that.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Vite dev server on port 5174, reachable on the LAN |
| `npm run typecheck` / `npm run lint` / `npm run test` | TypeScript, oxlint, Vitest |
| `npm run build` | Production build into `dist/` (with the service worker) |
| `npm run preview` | Serve `dist/` on port 4174 to test the PWA |
| `npm run cap:sync` | Build and copy into the native projects |
| `npm run android` / `npm run ios` | Build, sync and open Android Studio / Xcode |
| `npm run assets` | Regenerate app icons and splash screens from `assets/` |

## How it is put together

```
src/
  app/            router, providers, navigation, query client, service worker
  auth/           session state; guards RequireAuth, GuestOnly, RequireDuty
  lib/api/        fetch client, error type, TypeScript mirrors of API responses
  lib/            storage (Capacitor Preferences), downloads, CSV, formatting
  components/     shadcn/ui primitives, shared data components, the app shell
  features/
    me/           /me/assignments, /me/exams, the selected exam
    exams/        current-exam hook and switcher, exam API hooks, status text
    home/ account/
    marking/      marking overview and the marksheet editor
    class/        roster, admit/move dialogs, pupil profile, class picker
    marklist/     mark list, compare and rubric (analysis.ts is unit-tested)
    report-cards/ remarks editor, card preview, PDFs
```

API endpoints specific to this app (all in `Educa_Lara/routes/api.php`):

| Endpoint | |
|---|---|
| `GET /me/assignments` | Classes I teach and class subjects I mark this year |
| `GET /me/exams` | Exams involving my classes, with `my_progress` |
| `GET/POST /my/classes/{class}/students` | Roster; admit into my class |
| `POST /my/students/{student}/move` | Move a pupil out of my class |
| `GET /my/students/{student}` and `/results` | Profile and results of a pupil I teach or taught |

Educa Admin's conventions apply here too:

- API errors arrive as `ApiError`.
- Unsaved marks and remarks are protected from background refetches and from
  navigating away.
- `/api/*` is never cached offline.
- The Android app opts out of backup.
- `select.tsx` ignores `onValueChange("")`.

See `../Educa_Admin/README.md` for details, deployment of the PWA, and
building the native apps. The steps are identical, with this app's ids:
`ke.codepass.educa.portal`, "Educa Staff", dev port 5174.

# ShiftAssist – Projekt Memória

> Utoljára frissítve: 2026-03-29
> Ez a fájl a projekt teljes koncepciójáról, architektúrájáról és fejlesztési előzményeiről tartalmaz összefoglalót.

---

## 1. Projekt Koncepció

**ShiftAssist** (korábban ShiftSync) – B2B SaaS platform vendéglátóipari és hasonló munkáltatók számára, amellyel kezelhetik a dolgozói beosztásokat, jelenlétet, szabadságokat és feladatokat.

**Célközönség:** Étterem, kávézó, szálló és más shift-alapú munkahelyek (főleg KKV-k).

**Monetizáció:** Stripe-alapú seat-based előfizetés (Starter / Pro / Enterprise tervek), 14 napos trial.

**Fő értékajánlat:**
- Drag & drop heti/havi beosztástervező
- AI-alapú beosztásgenerálás (OpenAI)
- QR-kódos be/kiléptetés GPS-nyomkövetéssel
- GDPR-kompatibilis adatkezelés
- Többhelyszínes (multi-site) vállalat-kezelés

---

## 2. Tech Stack

| Réteg | Technológia |
|-------|-------------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth + TOTP 2FA (otplib) |
| AI | OpenAI API (gpt-4o-mini) – schedule + chat |
| Email | Resend + React Email |
| Payments | Stripe (checkout, webhooks, portal) |
| Push | Web Push / VAPID |
| UI | Tailwind CSS 3.4, Lucide React |
| Drag & Drop | dnd-kit v6 |
| Charts | Recharts |
| Dátum | date-fns v4 |
| PDF export | jsPDF + html2canvas |
| Excel export | xlsx |
| QR | qrcode |

---

## 3. Architektúra

### Adatbázis (22 tábla)

| Tábla | Leírás |
|-------|--------|
| `companies` | Multi-tenant szervezetek |
| `users` | Dolgozók + owner/admin/manager/employee role |
| `shifts` | Egyedi műszak-bejegyzések |
| `leave_requests` | Szabadság / betegszabadság kérelmek |
| `shift_swap_requests` | Csereigénylések |
| `positions` | Munkakörök (pl. Pincér, Szakács) |
| `stations` | Állomások / munkaterületek (color-coded) |
| `sites` | Telephelyek (több helyszín) |
| `availability` | Heti elérhetőségi sémák |
| `availability_dates` | Dátum-specifikus override-ok |
| `tasks` | Feladatok és checklista-elemek |
| `task_templates` | Ismétlődő feladatsablonok |
| `invitations` | Meghívó tokenek (7 napos érvényesség) |
| `audit_log` | Változásnapló (GDPR pseudonymizált) |
| `shift_templates` | Műszaksablonok |
| `chat_history` | AI chat előzmények |
| `clock_entries` | Érkezés/távozás időbélyegek + GPS |
| `overtime_config` | Heti óraszám-határok |
| `overtime_overrides` | Felhasználó/site specifikus határok |
| `push_subscriptions` | Web Push feliratkozások |
| `ai_schedule_requests` | AI generálás rate-limit naplója |
| `super_admins` | Platform admin jogosultságok |

### Biztonság
- **RLS** minden táblán
- **AES-256-GCM** titkosítás PII mezőkhöz (full_name, email, phone)
- **Email hash** gyors kereséshez (HMAC-SHA256)
- **Pseudonymizáció** audit logban
- **Service role** csak szerver oldali admin kliensben

### Adatmodell kulcsok
- `company_id` minden táblán – multi-tenant izoláció
- `role`: `owner | admin | manager | employee`
- Műszak státuszok: `draft | published | completed`
- Szabadság státuszok: `pending | approved | rejected`

---

## 4. Főbb Oldalak és Funkciók

### Dashboard oldalak (`/dashboard/...`)

| Útvonal | Funkció |
|---------|---------|
| `/schedule` | Heti/havi beosztástervező (drag & drop, AI wizard) |
| `/attendance` | QR-kódos be/kiléptetés + jelenléti napló |
| `/staff` | Dolgozók kezelése + meghívók |
| `/staff?view=positions` | Munkakörök (pozíciók) kezelése |
| `/staff?view=reliability` | Megbízhatósági statisztikák |
| `/staff?view=sites` | Telephelyek kezelése |
| `/staff?view=stations` | Állomások kezelése |
| `/tasks` | Feladatok és checklista |
| `/leave` | Szabadságkérelmek |
| `/open-shifts` | Szabad műszakok marketplace |
| `/activity` | Audit napló |
| `/logbook` | Napi műszaknapló |
| `/stats` | Statisztikák és trendek |
| `/swap-requests` | Csereigénylések kezelése |
| `/settings` | Beállítások hub |
| `/billing` | Előfizetés kezelése |

### Employee self-service (`/my/...`)
- Saját beosztás, szabadságkérelem, csere, elérhetőség

### Publikus oldalak
- `/clock` – QR-kódos be/kiléptetés (dolgozói mobil)
- `/invite/[token]` – Meghívó elfogadás + regisztráció

---

## 5. Szerver Akciók (`app/actions/`)

26 fájl, ~100+ exportált async függvény.

| Fájl | Fő funkciók |
|------|-------------|
| `ai-schedule.ts` | `generateSchedule()`, `getRateLimitStatus()` |
| `attendance.ts` | `clockIn()`, `clockOut()`, `getClockEntries()` |
| `auth.ts` | `register()`, `login()`, `logout()`, `updateMyProfile()` |
| `availability.ts` | `getMyAvailability()`, `saveAvailabilityDate()` |
| `leave.ts` | `createLeaveRequest()`, `resolveLeaveRequest()` |
| `positions.ts` | `getPositions()`, `createPosition()`, `deletePosition()` |
| `reliability.ts` | `getReliabilityStats()` |
| `schedule.ts` | `createShift()`, `updateShift()`, `deleteShift()`, `publishShifts()`, `copyWeekShifts()` |
| `sites.ts` | `getSites()`, `createSite()`, `deleteSite()` |
| `staff.ts` | `inviteStaff()`, `updateStaff()`, `deactivateStaff()` |
| `super-admin.ts` | Platform admin funkciók (impersonation, plan change stb.) |
| `tasks.ts` | `createTask()`, `toggleTask()`, `deleteTask()` |
| `two-factor.ts` | `setup2FA()`, `verify2FALogin()` |

---

## 6. Főbb Komponensek

### Schedule modul
- `ScheduleGrid.tsx` – Heti rácsos nézet, drag & drop, localStorage AI javaslat cache
- `ScheduleCell.tsx` – Egy nap/dolgozó cella, műszakokat + AI javaslatokat renderel
- `ShiftCard.tsx` – Műszakkártya (drag-able, edit/delete)
- `AiScheduleWizard.tsx` – AI beosztásgeneráló wizard (3 lépés)
- `ScheduleActionsBar.tsx` – Hét-navigáció, publish, tervezet törlés, AI wizard indítás
- `ShiftModal.tsx` – Műszak létrehozás/szerkesztés modal

### Layout
- `DashboardShell.tsx` – Fő layout wrapper (nav + sidebar)
- `Sidebar.tsx` – Navigációs sidebar (`mobileOnly` prop – desktop verzió elrejthető)
- `DashboardNav.tsx` – Top nav (role-based menük)

### Staff modul
- `StaffClient.tsx` – Dolgozók lista, szűrés, meghívás
- `PositionsClient.tsx` – Munkakörök CRUD (táblázatos nézet)
- `ReliabilityClient.tsx` – Megbízhatósági statisztikák táblázat

---

## 7. API Route-ok (`app/api/`)

| Endpoint | Cél |
|----------|-----|
| `POST /api/ai/chat` | AI chat válasz |
| `GET /api/export/payroll` | Bérszámfejtési export |
| `POST /api/invite/[token]/accept` | Meghívó elfogadás |
| `POST /api/stripe/checkout` | Stripe checkout session |
| `POST /api/stripe/webhook` | Stripe webhook |
| `POST /api/super-admin/impersonate` | Admin impersonation |
| `POST /api/cron/monthly-billing` | Havi számlázás (cron) |
| `POST /api/cron/data-retention` | GDPR adattisztítás (cron) |

---

## 8. Lib Utilities (`lib/`)

| Fájl | Tartalom |
|------|----------|
| `encryption.ts` | AES-256-GCM encrypt/decrypt, email hash, pseudonym |
| `billing.ts` | Stripe seat-based billing logika |
| `resend.ts` | Email küldés (Resend) |
| `push.ts` | Web Push értesítések |
| `openai.ts` | OpenAI kliens konfiguráció |
| `feature-flags.ts` | Feature toggle rendszer |
| `exportSchedulePDF.ts` | Beosztás PDF export |
| `i18n/translations.ts` | Magyar/angol szótár (1461 sor) |
| `data/users.ts` | `getCompanyUsers()` – dolgozó adatlekérés + dekriptálás |

---

## 9. Email Sablonok (`emails/`)

- `LeaveRequest.tsx` – Szabadságkérelem értesítő (managernek)
- `LeaveResult.tsx` – Jóváhagyás/elutasítás értesítő (dolgozónak)
- `ShiftSwapRequest.tsx` – Csereigény értesítő
- `ShiftSwapResult.tsx` – Csere eredménye
- `TrialReminder.tsx` – Trial lejárati figyelmeztetés

---

## 10. Környezeti Változók

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
OPENAI_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_ENTERPRISE=
NEXT_PUBLIC_APP_URL=
ENCRYPTION_KEY=          # AES-256-GCM kulcs (hex, 32 byte)
EMAIL_HASH_SECRET=       # HMAC-SHA256 kulcs emailhez
PSEUDONYM_SECRET=        # Audit pseudonym kulcs
```

---

## 11. Fejlesztési Előzmények (Változásnapló)

### 2026-03-29 – Legutóbbi módosítások

#### AI Beosztástervező (`app/actions/ai-schedule.ts`)
- **Rate limit:** 5 → 100 kérés/nap (B&A Solutions teszteléshez)
- **max_tokens:** 6000 → 16000 (JSON truncation hiba javítás)
- **Teljes újraírás – server-side slot pre-computation:**
  - DB lekérések párhuzamosítva `Promise.all`-lal (gyorsabb generálás)
  - Ha nincs `note`: OpenAI kihagyva, közvetlen shift-generálás `crypto.randomUUID()`-val
  - Ha van `note`: AI csak módosítja az előre kiszámított slotokat
  - Kiszámítja: `leaveByUser`, `existingByUser`, `unavailSet` lookup struktúrák
- **finish_reason === 'length'** ellenőrzés token-limit hibához

#### AI Wizard (`components/schedule/AiScheduleWizard.tsx`)
- `currentWeekStart` prop hozzáadva – alapértelmezett hét a jelenlegi (nem következő)
- Mezők hozzáadva: `shiftDurationHours`, `shiftsPerDay`, `workDaysPerEmployee`
- Note/utasítás textarea hozzáadva (üres = AI nélküli gyors generálás)

#### ScheduleActionsBar (`components/schedule/ScheduleActionsBar.tsx`)
- `currentWeekStart` átadása az AI wizardnak
- Pozíciók összefésülése: positions táblából + employees.position mezőkből
- **"Tervezetek törlése" gomb** hozzáadva (piros, csak ha van draft; confirm dialógus)

#### ScheduleGrid (`components/schedule/ScheduleGrid.tsx`)
- **localStorage SSR bug javítás:** `useState(() => localStorage...)` → `useState([]) + useEffect`
- AI javaslatok localStorage-ban tárolva (`suggestions_{companyId}_{weekStart}` kulcs)
- Javaslatok cellánként szétválasztva és átadva `ScheduleCell`-nek

#### ScheduleCell (`components/schedule/ScheduleCell.tsx`)
- `suggestions?: AiShiftSuggestion[]` prop hozzáadva
- AI javaslatok renderelve a cellán belül (ugyanolyan méretben mint a rendes műszakok)
- Fake `ShiftWithAssignee` objektum + `isSuggestion` prop a `ShiftCard`-hoz

#### Sidebar (`components/layout/Sidebar.tsx`)
- `mobileOnly?: boolean` prop hozzáadva
- Desktop verzió (`hidden md:flex`) elrejthető ezzel – megakadályozza a dupla sidebar-t

#### DashboardShell (`components/layout/DashboardShell.tsx`)
- `mobileOnly` prop átadva a `<Sidebar>`-nak (desktop sidebar nem jelenik meg a főlayoutban)

#### DashboardNav (`components/layout/DashboardNav.tsx`)
- **"Pozíciók"** menüpont hozzáadva a Személyzet legördülőbe → `/dashboard/staff?view=positions`

#### Pozíciók modul (ÚJ)
- `app/actions/positions.ts` – `getPositions()`, `createPosition()`, `deletePosition()`
- `components/staff/PositionsClient.tsx` – CRUD UI, táblázatos nézet (mint Megbízhatóság)
- `app/dashboard/staff/page.tsx` – `positions` view hozzáadva

### Korábban implementált funkciók
- Drag & drop beosztástervező (dnd-kit)
- QR-kódos jelenléti rendszer GPS nyomkövetéssel
- Shift swap request rendszer
- Szabadságkezelés (kérelem + jóváhagyás flow)
- Heti elérhetőség + dátum-specifikus override-ok
- Feladatkezelő (task + template rendszer)
- Multi-site kezelés (telephely hozzárendelés)
- PDF + Excel export
- 2FA (TOTP alapú)
- Web Push értesítések
- Audit log (pseudonymizált)
- Super-admin konzol (impersonation, plan management)
- AI chat asszisztens (knowledge base-sel)
- Megbízhatóság statisztika (clock-in pontosság)
- Logbook (napi műszaknapló AI összefoglalóval)
- Nyitott műszakok marketplace
- Beosztás másolás (hét másolása)
- Publish/draft workflow

---

## 12. Fontos Fejlesztési Megjegyzések

### Titkosítás
- Minden PII mező (full_name, email, phone) AES-256-GCM titkosított
- Formátum: `iv_hex:authTag_hex:encrypted_hex`
- `lib/encryption.ts` tartalmazza az encrypt/decrypt/hash/pseudonym függvényeket
- **SOHA** ne commitold a `.env.local`-t

### Szerver vs Kliens pattern
- Server Actions: `'use server'` direktíva, adatmutációk
- Client Components: `'use client'`, interaktív UI
- `localStorage` csak `useEffect`-ben (SSR safe)
- Admin Supabase kliens: `lib/supabase/admin.ts` – csak szerver oldalon

### Multi-tenant izoláció
- Minden DB lekérés tartalmaz `.eq('company_id', ...)` szűrőt
- RLS as backup (app-level enforcement is szükséges)
- `getCompanyUsers()` mindig az aktuális user company_id-ját használja

### AI Beosztástervező flow
1. User megnyomja az AI gombot → `AiScheduleWizard` megnyílik
2. Wizard 3 lépéses: hét/pozíciók/beállítások → megjegyzés → generálás
3. Ha nincs note → közvetlen generálás (gyors, OpenAI nélkül)
4. Ha van note → OpenAI módosítja az előre kiszámított slotokat
5. Javaslatok `localStorage`-ban tárolva (oldal elhagyásakor nem vesznek el)
6. Javaslatok `ScheduleCell`-ben jelennek meg, `isSuggestion` flag-gel
7. Közzétesz gomb az összes draftet publisheli

### Fontos design döntések
- Pozíciók táblázatos nézet (mint Megbízhatóság) – teljes szélesség, bal-rendezett
- Sidebar `mobileOnly` prop – desktop layout-ban nincs duplikált sidebar
- AI javaslat méret: ugyanolyan mint a rendes műszak (flex-1 min-h-0)
- Tervezet törlése piros gomb csak akkor látszik, ha van draft

---

## 13. Aktív Cégek / Tesztelés

| Cég | company_id | Megjegyzés |
|-----|-----------|------------|
| B&A Solutions | `520475c3-749b-40c8-b5de-34e389c73f98` | Fő tesztkörnyezet, 100/nap AI limit |
| Boldi falatozoja | `2f42259d-2e95-4e9a-bafe-fc4817f4a60c` | Kovács Boldizsár, 10 demo alkalmazott hozzáadva |

---

## 14. Deployment

- **Platform:** Vercel (automatikus deploy main branchről)
- **DB:** Supabase (hosted PostgreSQL)
- **Domain:** `shift-assist.vercel.app`
- **Email domain:** `shiftassist.hu` (Resend – DNS verification pending)

# Study & Presentation Packet 03 — Isabel Lopez

**Role:** Frontend & UI/UX Lead (`frontend/`)  
**Project:** UE Cloudlearn (`CCS_4301 / CS1G` — First Semester 2026–2027)  
**Presentation Date:** November 27, 2026  
**Also Study:** `team-docs/00-MASTER-STUDY-GUIDE.md` (mandatory for Part 4 Q&A)

---

## 1. Your Project Responsibilities

- Own the **React 18 + TypeScript + Vite + Tailwind CSS** Single-Page Application (`frontend/src/`), strictly following our minimalist, high-contrast responsive UI/UX design system (`frontend/src/styles/tokens.css` + institutional **UE Crimson** accent `#A61C1C` light / `#F27474` dark text / `#B82222` dark button fill).
- Own light/dark theme parity (`frontend/src/styles/tokens.css`, `ThemeContext.tsx`), responsive shell navigation (`AppShell.tsx` desktop `248px` sidebar + mobile frosted bottom tab bar), accessibility (`>= 44x44px` hit areas, `>= 4.5:1` WCAG AA contrast, sentence case, zero emojis using `lucide-react` `strokeWidth={1.75}` inline SVG icons), and universal states (`Skeleton`, `EmptyState`, `ErrorBanner`, `ConfirmSheet`, `ToastProvider`).
- Lead the **Part 1 Live Feature & CRUD Walkthrough** right after Zac's Auth & RBAC demonstration.

## 2. Your Assigned Formal Paper Sections (`docs/`)

- **Chapter 2.4–2.6 (`docs/02-chapter-2-analysis-design.md`):** UI Design & Token Table (`Table 2.5`, `Figures 2.5`–`2.8`), Use Case Diagram (`Figure 2.9`), Level 0 & Level 1 Data Flow Diagrams (`Figures 2.10`–`2.11`).
- **Chapter 3.2 & 3.4 (`docs/03-chapter-3-development.md`):** Frontend Architecture (`Table 3.2`) and System Functionalities across all 3 roles (`Figures 3.1`–`3.11`).
- **Appendix C (`docs/08-appendices.md`):** Master Web Application Screenshot Index (14 captured live screenshots `app-01` through `app-14`).

## 3. Your GitHub & Verification Checklist

- [x] `frontend/src/styles/tokens.css`, `tailwind.config.js`, `lib/{api,formatters}.ts`, `context/{Auth,Theme}Context.tsx`.
- [x] `frontend/src/components/layout/{AppShell,ProtectedRoute}.tsx` and all 13 UI primitives (`components/ui/*`).
- [x] All 8 pages (`LoginPage`, `RegisterPage`, `DashboardPage`, `CoursesPage`, `CourseDetailPage`, `SubmissionsPage`, `RecordsPage`, `UsersPage`).
- [x] `npx tsc --noEmit && npm run build` clean (`5.42s` on EC2; `15/15` PASS on static UI/emoji/uppercase/hex/hit-area accessibility audit).
- [x] All 14 live browser screenshots captured in `docs/screenshots/app-01-login.png` through `app-14-dark-mode-records.png`.

## 4. Your Live Presentation Script (Part 1 — Live App Walkthrough, 4–5 mins)

1. **Administrator Walkthrough (`admin@ue-cloudlearn.edu.ph`):**
   - Show **Overview** (`/`) KPI cards (`Total users`, `Total courses`, `Active enrollments`).
   - Open **Courses** (`/courses`) -> demonstrate search/filtering and **`Create course`** `ModalSheet` -> click **`Users`** (`/users`) showing role segmented filter (`All`, `Students`, `Instructors`, `Admins`) and **`Add user`** / edit sheets.
2. **Instructor Walkthrough (`instructor.santos@ue-cloudlearn.edu.ph`):**
   - Show Instructor **Overview** -> click into **CCS4301** (`/courses/1`).
   - Show the three segmented tabs: **`Materials`** (upload/edit/download/delete S3 handouts), **`Assignments`** (create/edit assignments with due dates & optional S3 attachment), and **`Students`** (enrolled roster).
   - Open **Submissions** (`/submissions`) -> filter by `Pending review` / course -> click **`Review`** -> download student file -> enter score (`0..maxScore`) and feedback in the `Review submission` `ModalSheet` -> click **`Save grade`** (green toast `"Grade saved."`).
3. **Student Walkthrough (`student.cruz@ue-cloudlearn.edu.ph`):**
   - Show Student **Overview** (`Enrolled courses`, `Pending assignments`, `Average grade` with UE Crimson progress track).
   - Open **Courses** (`/courses`) -> browse catalog & enroll/open a course -> open **Materials** -> download handout -> open **Assignments** -> demonstrate **`Submit work`** / **`Update submission`** (or **`Delete`** ungraded submission with `ConfirmSheet` warning that both RDS record and S3 file will be removed).
   - Open **Learning records** (`/records`) -> show grouped course scorecards, UE Crimson averages, and inline instructor feedback -> click **`Dark mode`** toggle in sidebar to showcase instant Light/Dark theme parity!

## 5. Role-Specific Q&A Practice

- **Q: How does the React frontend talk to the Express backend securely on EC2?**  
  *A:* All requests go through `frontend/src/lib/api.ts` using relative `/api/*` paths with `credentials: 'include'`. In production, Nginx serves `frontend/dist` and reverse-proxies `/api/*` to `http://127.0.0.1:5000` on the same origin, automatically transmitting the `HttpOnly` JWT cookie with zero CORS overhead.
- **Q: Why do we serve a static `vite build` output on EC2 instead of `npm run dev`?**  
  *A:* `vite dev` runs a heavy development server consuming extra RAM on a 1 GiB `t3.micro` EC2 instance. Compiling with `npm run build` produces minified static HTML/CSS/JS served directly by Nginx with near-zero memory usage and immutable caching on `/assets/`.
- **Q: How did you enforce accessibility and Apple-style visual clarity across every page?**  
  *A:* All components consume semantic tokens from `tokens.css` (verified WCAG AA `>= 4.5:1`), enforce `>= 44x44px` hit areas on every button/tab/row, use sentence case exclusively, replace all emojis with `lucide-react` `1.75px` SVG icons, and implement calm skeleton loaders, empty states, retryable `ErrorBanner`s, `ConfirmSheet` delete confirmations, and 4-second auto-dismissing toasts.

## 6. Live Project Evidence Index

- **Implemented Screens (`frontend/src/pages/`):** `LoginPage.tsx`, `RegisterPage.tsx`, `DashboardPage.tsx`, `CoursesPage.tsx`, `CourseDetailPage.tsx`, `SubmissionsPage.tsx`, `RecordsPage.tsx`, `UsersPage.tsx`
- **Build & UI Audit Results:** `tsc --noEmit && vite build` clean (`5.42s` on EC2); static audit `{"emoji":[],"uppercase":[],"strayHex":[]}`; **15/15 PASS** on 15-point UI/UX accessibility & theme compliance checklist
- **Live App Screenshots (`docs/screenshots/`):** `app-01-login.png` through `app-14-dark-mode-records.png` (14 files)

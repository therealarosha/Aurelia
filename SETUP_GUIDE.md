# Graduation 2026 Check-In System

A blue/silver glassmorphism graduation pass and event-day check-in system built with **Vite + React + Firebase** for deployment on **GitHub Pages**.

## Included features

### Student portal
- Retrieve a paid graduation pass using admission number + email + phone verification.
- QR contains only an opaque random token: `GRAD26|v1|<token>`.
- No admission number, name, email or phone is embedded in the QR.
- Download QR as PNG or print/save the pass.
- Pass shows whether it has already been used for entry.

### Administrator console
- Designed for exactly three administrator accounts, but supports more if needed.
- Every administrator is a **full super admin**.
- Live paid / checked-in / remaining dashboard.
- Camera QR scanner with success, duplicate and invalid states.
- Manual admission-number fallback.
- Add paid students one by one using the UI.
- Edit or delete paid student records.
- Import paid students from CSV.
- Reset an accidental check-in (with audit log entry).
- Export final attendance CSV.
- Check-in/reversal audit log records admin UID/email and method.

### Backend/security
- Firebase Authentication (Email/Password) for admins.
- Cloud Firestore on the Firebase Spark/free plan.
- No Cloud Functions required.
- Firestore transactions prevent two admins from approving the same QR simultaneously.
- Public student records cannot be listed/read.
- Public pass retrieval uses an exact SHA-256 claim document derived from admission + email + last 4 phone digits.
- QR-token lookup, student records and audit logs are admin-only.
- Optional Firebase App Check support via reCAPTCHA v3.

---

# 1. Requirements

Use Node.js **22.13+ or 24+**. Node 24 is used in the included GitHub Pages workflow.

```bash
npm install
```

Then:

```bash
npm run dev
```

Open the localhost URL shown by Vite.

---

# 2. Replace the logos

Replace these two files while keeping the same filenames:

- `public/assets/school-logo.png` — school logo
- `public/assets/grad-logo.png` — graduation logo

Placeholder files are included so the site runs immediately.

---

# 3. Create the Firebase project

1. Open Firebase Console and create a project.
2. The Spark/free plan is sufficient for this version.
3. Open **Project settings > General**.
4. Add a **Web app**.
5. Copy the Firebase web configuration values.

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows Command Prompt:

```cmd
copy .env.example .env
```

Fill in:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_EVENT_CODE=GRAD26
VITE_EVENT_NAME=Graduation 2026
VITE_SCHOOL_NAME=Your School Name
VITE_BASE_PATH=/
```

`VITE_EVENT_CODE` should be short and should not be changed after real QR passes have been issued.

---

# 4. Enable Firestore

In Firebase Console:

1. Open **Build > Firestore Database**.
2. Create the database.
3. Choose the region closest to your users.
4. You can start in production mode; the project contains its own security rules.

Deploy the supplied rules using Firebase CLI.

Install/login:

```bash
npx firebase-tools login
```

Connect the local folder to the Firebase project:

```bash
npx firebase-tools use --add
```

Deploy rules/indexes:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

The included rules intentionally allow public **exact document GETs** only on `passClaims`. Public listing is denied. `students`, `qrTokens`, `checkins`, and `admins` are admin-only.

---

# 5. Create the three super-admin accounts

In Firebase Console:

1. Open **Build > Authentication**.
2. Click **Get started**.
3. Enable **Email/Password** provider.
4. Open the **Users** tab.
5. Create three administrator accounts.

Example:

- `gradadmin1@school.lk`
- `gradadmin2@school.lk`
- `gradadmin3@school.lk`

Use strong, different passwords.

After creating each account, copy its Firebase **UID**.

Now open **Firestore Database** and create this collection manually:

```text
admins
```

Create one document for each administrator. The **document ID must exactly equal the Firebase Auth UID**.

Example:

```text
admins/<ADMIN_UID_1>
```

Suggested fields:

```text
email: "gradadmin1@school.lk"
name: "Gate Admin 1"
```

Repeat for all three administrators.

There are no role differences in this build. **Any UID inside `/admins` is a full super admin.**

The first admin documents must be created manually in Firebase Console because the security rules intentionally do not let an unapproved account promote itself.

---

# 6. Enter paid students

Admin URL:

```text
/#/admin
```

After logging in, open **Paid Students**.

## Manual entry

Click **Add paid student** and enter:

- Admission number
- Full name
- Email
- Phone number

Saving the form automatically:

1. marks the student as paid,
2. creates/reuses a random 256-bit QR token,
3. creates the public pass claim,
4. makes the pass retrievable immediately.

## CSV import

A sample is included at:

```text
samples/paid-students.csv
```

Recommended CSV:

```csv
admission,name,email,phone
LIS12345,Student One,student1@example.com,0771234567
LIS12346,Student Two,student2@example.com,0712345678
```

The importer also recognises common headings such as:

- Admission Number
- Student ID
- Student Name
- Full Name
- Email Address
- Phone Number
- Mobile Number

Duplicate admission numbers inside the same CSV are de-duplicated before import.

---

# 7. How students obtain a QR pass

Public URL:

```text
/#/
```

The student enters:

1. Admission number
2. Email used during registration
3. Last four digits of the phone number, or their full phone number

The browser calculates:

```text
SHA256(normalizedAdmission | normalizedEmail | last4PhoneDigits)
```

and retrieves only that exact `passClaims` document.

If all details match a paid record, the pass is displayed.

The QR payload looks similar to:

```text
GRAD26|v1|uF8u...random-token...
```

It does **not** contain the student's admission number or other personal data.

---

# 8. Event-day check-in

Admin opens:

```text
/#/admin/scan
```

Allow camera permission.

GitHub Pages uses HTTPS, so camera access is supported. Local development also works on `localhost`.

When a QR is scanned:

1. The app validates the event QR format.
2. Firebase resolves the random token to the student.
3. It verifies that the student is paid.
4. A Firestore transaction checks `checkedIn`.
5. If unused, the transaction atomically marks the student checked in and writes the audit log.
6. A simultaneous second scan cannot also approve the same student.

Result states:

- **Green:** Entry Approved
- **Amber:** Already Checked In
- **Red:** Invalid Pass / Payment Not Verified

If the camera/phone fails, use **Manual Admission Lookup** on the scanner page.

## Important internet rule

Do not intentionally use offline check-in across multiple admin devices. Two offline devices cannot reliably know what the other device has already admitted.

Have at least one mobile hotspot as an event-day backup.

---

# 9. Accidental check-in reset

Open **Paid Students**.

A student who has checked in has a **Reset entry** action.

Resetting:

- makes their QR valid for entry again,
- clears the current check-in status,
- creates a `reversal` entry in the audit log.

Use this only when an admin accidentally scanned/approved the wrong person.

---

# 10. Optional Firebase App Check

The app supports Firebase App Check with reCAPTCHA v3.

Recommended order:

1. Get the whole application working first without enforcement.
2. Configure App Check in Firebase Console for the web app.
3. Add the GitHub Pages/custom domain.
4. Put the reCAPTCHA v3 site key into:

```env
VITE_RECAPTCHA_SITE_KEY=...
```

5. Test again.
6. Only then enable Firestore App Check enforcement.

If you enforce App Check before configuring the deployed domain correctly, valid student/admin requests can be blocked.

---

# 11. GitHub Pages deployment

The project contains:

```text
.github/workflows/deploy.yml
```

## A. Push the project to GitHub

Create a repository and push the project to the `main` branch.

## B. GitHub Pages setting

Repository:

**Settings > Pages > Build and deployment > Source > GitHub Actions**

## C. Add Actions secrets

Repository:

**Settings > Secrets and variables > Actions > Secrets**

Create:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_RECAPTCHA_SITE_KEY` (optional)

Firebase web config values are not server secrets in the traditional sense, but storing deployment configuration here keeps the repository clean.

## D. Add Actions variables

Under **Variables**, create:

```text
VITE_EVENT_CODE = GRAD26
VITE_EVENT_NAME = Graduation 2026
VITE_SCHOOL_NAME = Your School Name
```

For a repository Pages URL such as:

```text
https://username.github.io/graduation-system/
```

set:

```text
VITE_BASE_PATH = /graduation-system/
```

For a custom domain or root user site:

```text
VITE_BASE_PATH = /
```

Push to `main`; the workflow builds and deploys automatically.

---

# 12. Firebase Authentication domain

If administrator login is blocked on the deployed site, open:

**Firebase Console > Authentication > Settings > Authorized domains**

Add your GitHub Pages hostname or custom domain if required.

Examples:

```text
username.github.io
graduation.yourschool.lk
```

---

# 13. Firestore collections

The application creates/uses:

```text
admins/{uid}
students/{normalizedAdmission}
passClaims/{sha256Claim}
qrTokens/{randomToken}
checkins/{autoId}
```

`students` contains the full private registration record.

`passClaims` contains only the minimum information needed to render a verified pass after the student supplies matching retrieval details.

`qrTokens` maps an opaque QR token to a student and is admin-only.

`checkins` is the audit trail.

---

# 14. Before the real event

Recommended test sequence:

1. Create all three admin accounts.
2. Add 5-10 fake paid students.
3. Retrieve every fake student's pass from a separate/incognito browser.
4. Scan a pass from Admin Phone 1 — it should approve.
5. Immediately scan the same pass from Admin Phone 2 — it should say already checked in.
6. Test manual admission check-in.
7. Test Reset Entry and re-scan.
8. Test CSV import.
9. Test attendance export.
10. Test on the exact phones and Wi-Fi/hotspot that will be used at the venue.
11. Replace/delete all fake records before importing real data.

Do not store admin passwords in the source code, repository, CSV, or Firestore documents.

---

## Project structure

```text
.
├── .github/workflows/deploy.yml
├── public/
│   ├── assets/
│   │   ├── school-logo.png
│   │   └── grad-logo.png
│   └── paid-students-sample.csv
├── samples/paid-students.csv
├── src/
│   ├── components/
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── index.html
├── package.json
└── vite.config.js
```


## Customizing the student portal examples and school logo

The student-facing placeholder examples are controlled from `.env`:

```env
VITE_ADMISSION_EXAMPLE=e.g. 12345
VITE_EMAIL_EXAMPLE=e.g. student@school.lk
VITE_PHONE_EXAMPLE=e.g. 4567
```

Change the text after `=` to whatever examples match your school's real admission-number, email, and phone format. These are display placeholders only; they do not change validation or saved Firebase data.

The school logo now uses PNG. Replace:

`public/assets/school-logo.png`

with your real transparent PNG school logo. Keep the filename exactly `school-logo.png`. The graduation logo remains `public/assets/grad-logo.png`.

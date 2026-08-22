# Graduation 2026 Check-In System


## Included features

### Student portal
- Retrieve a paid graduation pass using admission number + email + phone verification.
- QR contains only an opaque random token.
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

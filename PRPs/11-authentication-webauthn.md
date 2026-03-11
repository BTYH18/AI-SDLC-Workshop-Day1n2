# WebAuthn/Passkeys Authentication

## Feature Overview
Passwordless authentication using WebAuthn/Passkeys for secure, modern login.  Supports registration and login flows with biometric or security key and manages sessions via JWT stored in HTTP-only cookies.

## User Stories
- **New User**: As a first-time user I want to register with a username and my device’s biometric so I can access my todos without a password.
- **Returning User**: As a user I want to log in with my registered passkey quickly and securely.
- **Security-conscious**: As a user I want the system to protect my session and credentials.

## User Flow
1. On the login page, choose to register by entering a username.
2. Client calls `/api/auth/register-options` to get a WebAuthn challenge.
3. Use `@simplewebauthn/browser` to create credentials; send response to `/api/auth/register-verify`.
4. Server verifies and stores authenticator in `authenticators` table with fields including `counter` (use `?? 0`).
5. For login, similar flow with `/login-options` and `/login-verify`.
6. On successful login, create a JWT session via `lib/auth.ts` and set it as an HTTP-only cookie with 7-day expiry.
7. Middleware (`middleware.ts`) checks the cookie and redirects unauthenticated users to the login page if they try to access protected routes (`/`, `/calendar`).

## Technical Requirements
- `users` table and `authenticators` table: store credential ID, public key, counter, username, userId.
- Use helper functions from `@simplewebauthn/server` plus `isoBase64URL` for base64url conversions.
- Registration/login options endpoints should use `generateRegistrationOptions` / `generateAuthenticationOptions` with relying party ID and name.
- Verification endpoints must handle the WebAuthn response, update the `counter` with `authenticator.counter ?? 0` to guard against undefined.
- `lib/auth.ts` contains `getSession`, `createSession`, `invalidateSession` utilities that manage JWT and cookies.
- Middleware intercepts requests and returns `NextResponse.redirect` to `/login` for unauthorized users.
- Handle edge cases such as authenticator not found, counter mismatch (possible cloned device), user cancellation, and unsupported browsers.

## UI Components
- Registration form with username input and **Register** button.
- Login form with dropdown of registered usernames (if multiple) and **Login** button.
- Logout button in navbar.
- Error messages for failed attempts.

## Edge Cases
- User attempts to register with an existing username → show error.
- Authenticator attestation fails → prompt user to retry.
- Counter value undefined; always store `counter ?? 0`.
- Browser not supporting WebAuthn → show fallback message but block access (requirements state WebAuthn only).

## Acceptance Criteria
1. Users can register and log in using passkeys; no passwords exist in system.
2. Session persistence works across page reloads and expires after 7 days.
3. Middleware prevents unauthorized access to protected routes.
4. Failure modes handled gracefully with user-friendly messages.

## Testing Requirements
- E2E tests using Playwright virtual authenticators (configured in `playwright.config.ts`) for registration and login flows.
- Unit tests for `auth` utilities and middleware to ensure cookie parsing and session validation.
- Security review to ensure JWT cookies are HTTP-only and secure.

## Out of Scope
- Password fallback or social login.  Passkey-only.
- Multi-factor authentication beyond WebAuthn.

## Success Metrics
- 100% of registered users successfully authenticate with passkeys.
- Zero security incidents related to authentication.

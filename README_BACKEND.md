# Youth Collective Backend Setup

This version adds a real backend to the existing frontend.

## What was added

- Account registration and login
- Frontend and backend password validation
- Password confirmation during registration
- Secure password hashing with `bcryptjs`
- HTTP-only session cookies
- CSRF protection for POST/DELETE requests, with automatic token refresh
- Rate limiting for auth, comments, and contact messages
- Password recovery flow
- Optional Google login through OAuth
- Comments on every page
- Contact/join form saved to SQLite
- SQLite database stored in `data/youth_collective.sqlite`

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Then open:

```text
http://localhost:3000
```

## Password recovery

In development mode, if SMTP email is not configured, the reset request returns a development reset link and the frontend fills the reset token automatically. In production, add SMTP settings to `.env` so reset links are emailed instead.

## Google login

Google login code is included, but it needs credentials:

1. Go to Google Cloud Console.
2. Create OAuth 2.0 Client ID.
3. Add this callback URL:

```text
http://localhost:3000/api/auth/google/callback
```

4. Put these into `.env`:

```text
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

For deployment, replace the callback URL with your real backend URL.

## Important deployment note

GitHub Pages cannot run this backend because it only hosts static files. Use a Node host such as Render, Railway, Fly.io, or a VPS. You can still keep the frontend code on GitHub, but account creation/comments require the Node server to be running.

## Useful API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `POST /api/auth/password/request`
- `POST /api/auth/password/reset`
- `GET /api/auth/google`
- `GET /api/comments?page=index.html`
- `POST /api/comments`
- `DELETE /api/comments/:id`
- `POST /api/contact-messages`

## Security choices

This is a strong starter backend, not a finished production security audit. Before launching publicly, change `SESSION_SECRET`, use HTTPS, configure SMTP, review moderation rules, and make sure your deployment platform protects `.env`.

## Quick local test

1. Start the server with `npm.cmd start`.
2. Open `http://localhost:3000`.
3. Click **Login → Register** and create an account with a password that has letters and numbers.
4. Refresh the page. Your name should still appear in the navbar because the session cookie is working.
5. Click **Logout**, then log in again with the same email/password.
6. Try adding a comment at the bottom of a page.

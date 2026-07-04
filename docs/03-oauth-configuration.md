# OAuth Provider Configuration for Mobile Auth

Covers Google and GitHub OAuth setup for the mobile auth flow
(`/auth/mobile/google/*` and `/auth/mobile/github/*`).

**Applies to:** `feature/mobile-auth-support` branch, commit `a231539243`+.

---

## Quick start — environment variables

Set these in your Docker Compose `environment:` block or `.env` file:

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes (for Google auth) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes (for Google auth) | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | Yes (for GitHub auth) | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Yes (for GitHub auth) | GitHub OAuth client secret |
| `GITHUB_ORGANIZATION_ID` | No | Restrict GitHub login to members of this org slug |

These are read at runtime — no database migration needed. See
[Configuration resolution](#configuration-resolution) for how they interact with
the database-stored config.

---

## Redirect URIs to register with each provider

Register these callback URLs in your Google Cloud Console / GitHub OAuth App
settings. Use your instance's public HTTPS origin.

| Provider | Redirect URI |
|---|---|
| **Google** (mobile) | `https://<your-host>/auth/mobile/google/callback/` |
| **GitHub** (mobile) | `https://<your-host>/auth/mobile/github/callback/` |
| **Google** (desktop) | `https://<your-host>/auth/google/callback/` |
| **GitHub** (desktop) | `https://<your-host>/auth/github/callback/` |

> ⚠️ Before commit `a231539243`, the mobile OAuth views passed a `redirect_uri`
> kwarg to `GoogleOAuthProvider`/`GitHubOAuthProvider`, but those constructors
> did not accept it — causing a `TypeError` 500. The fix added an optional
> `redirect_uri=None` parameter; when provided, it overrides the hardcoded
> desktop redirect URI. Both mobile and desktop OAuth now work correctly.

---

## Endpoint reference

All mobile OAuth endpoints live under `https://<your-host>/auth/mobile/` and are
registered in `plane/authentication/urls.py` (mounted at `/auth/` via
`plane/urls.py:22`).

### Google

| Method & path | View | Behaviour |
|---|---|---|
| `GET /auth/mobile/google/` | `MobileGoogleOauthInitiateEndpoint` | Stashes `host`/`state`/`invitation_id` in session, redirects to Google consent screen |
| `GET /auth/mobile/google/callback/` | `MobileGoogleCallbackEndpoint` | Verifies state, exchanges code, creates user, redirects to `/m/auth/?token=<opaque>` |

### GitHub

| Method & path | View | Behaviour |
|---|---|---|
| `GET /auth/mobile/github/` | `MobileGitHubOauthInitiateEndpoint` | Same pattern as Google |
| `GET /auth/mobile/github/callback/` | `MobileGitHubCallbackEndpoint` | Same pattern as Google |

Both callbacks accept an optional `?invitation_id=` parameter (from a workspace
invite link) and auto-accept the invite on successful login.

---

## Configuration resolution

The function `get_configuration_value()` in
`plane/license/utils/instance_value.py` resolves keys in two layers:

```
SKIP_ENV_VAR=1  (default)
  ┌─ 1. Look up key in InstanceConfiguration database table
  └─ 2. Fall back to default value (the os.environ.get() call)

SKIP_ENV_VAR=0
  └─ Read directly from os.environ
```

The Django setting `SKIP_ENV_VAR` defaults to `"1"` (see
`plane/settings/common.py:369`). **In practice, environment variables always
work** — every caller passes `os.environ.get("KEY")` as the default, so the
fallback path resolves to the env var even when `SKIP_ENV_VAR=1`.

### Database-stored alternative

If you prefer to manage secrets in the database (e.g. for a multi-instance
deploy or to rotate keys without restarting):

```bash
# Set values via the management command
docker exec -it <api-container> python manage.py configure_instance \
    --key GOOGLE_CLIENT_ID --value "your-client-id"
docker exec -it <api-container> python manage.py configure_instance \
    --key GOOGLE_CLIENT_SECRET --value "your-client-secret"
```

The `InstanceConfiguration` model supports an `is_encrypted` flag; values marked
encrypted are transparently decrypted by `get_configuration_value`.

---

## Full mobile auth flow (with OAuth)

```
Native app                     /m/auth (web)                    Django API
-----------                   -------------                   ------------
open in-browser tab
  → GET /m/auth ──────────────> renders AuthRoot
                                (user clicks "Sign in with Google")
  window.location.assign(
    "/auth/mobile/google/") ───> redirects to Google consent
                                  screen
                                <─ user grants permission
                                Google redirects to
                                /auth/mobile/google/callback/
                                ──> verifies state + code
                                     creates/loads user
                                     sets ValidateAuthToken
                                <── 302 → /m/auth/?token=<opaque>
                                root.tsx useEffect fires
                                window.location.replace(
                                  "app.plane.so://?token=<opaque>")
<── app intercepts custom scheme
     extracts <opaque> token
POST /auth/mobile/token-check/ {token} ──> {access_token, refresh_token}
POST /auth/mobile/session-token/
  (Bearer <access_token>) ──> {session_name, session_id}
  app stores session cookie
GET /api/... with Cookie: <session_name>=<session_id> ──> normal API responses
```

For the **Plane.apk (WebAPK)** path, the OAuth flow is simpler: the WebAPK's
WebView navigates directly to the web app's login page, the user authenticates
via the standard desktop OAuth flow (`/auth/google/`, not `/auth/mobile/`),
and the resulting session cookie is automatically handled by the WebView — no
token hand-off is needed.

---

## Verification

Once configured, test the OAuth initiate endpoint:

```bash
# Should return a 302 redirect to the provider's consent page
curl -sI "https://<your-host>/auth/mobile/google/"
curl -sI "https://<your-host>/auth/mobile/github/"
```

A full smoke test of the token-exchange flow (after completing the OAuth dance
in a real browser):

```bash
BASE="https://<your-host>"

# 1. Exchange the opaque token from the ?token= redirect for a JWT pair
curl -sX POST "$BASE/auth/mobile/token-check/" \
  -H 'Content-Type: application/json' \
  -d '{"token":"<opaque token from /m/auth/?token=>"}'

# 2. Exchange the access_token for a real Django session cookie
curl -sX POST "$BASE/auth/mobile/session-token/" \
  -H "Authorization: Bearer <access_token from step 1>"

# 3. Use the returned session_id as a cookie against the real API
curl -s "$BASE/api/users/me/" \
  -H "Cookie: session-id=<session_id from step 2>"
```

---

## Known limitations

1. **No GitLab/Gitea mobile OAuth** — only Google and GitHub have mobile
   variants. The desktop-only `gitlab/` and `gitea/` routes exist but aren't
   mirrored under `/auth/mobile/`.

2. **OAuth errors surface as unhandled 500s for certain edge cases** — the
   `except AuthenticationException` blocks in the mobile callback views catch
   provider errors that raise that exception, but a raw `TypeError` or
   `requests.RequestException` outside those blocks will produce a 500. The
   error-code system in `EMobileAuthErrorCodes` covers `5115`/`5120` for
   provider errors, but those codes are only emitted when the provider code
   raises `AuthenticationException` — not for unexpected Python exceptions.

3. **Session hand-off requires a custom URL scheme handler** — the
   `app.plane.so://?token=` redirect is the intended bridge between the web
   login UI and a native HTTP client. The Plane.apk (WebAPK) does not register
   this scheme, so this hand-off goes nowhere for that artifact. For the WebAPK,
   use normal cookie-based web login instead.

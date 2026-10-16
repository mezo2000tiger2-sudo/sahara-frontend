# Backend findings for profile integration

These findings come from source inspection of the sibling `saharah_backend`
repository on 2026-10-16. They have not been reproduced through live requests.
The backend was left unchanged, as requested.

## All-device logout can fail after changing account state

In `src/DB/modules/user/user.service.js`, `logout()` calls `keys()` and
`deleteKey()` without importing either helper. Only `setValue` is imported from
the Redis service. The function persists `changeCredentialsAt` before reaching
this call, so it can return an error after already invalidating older tokens.

The frontend displays the returned error unchanged and does not claim success.
Its local cookie is cleared only after a successful logout response. If a later
profile request returns 401, the user can clear that local session with “Sign in
again.” Confirm the intended Redis cleanup behavior when fixing this endpoint.

## Password changes do not persist the invalidation timestamp

In the same service, `updatePassword()` sets `user.changeCredentialsAt` but sends
only `{ password: user.password }` to `findByIdAndUpdate()`. The timestamp is not
persisted, so changing the password does not reliably invalidate other devices.

The frontend separately revokes the current device token after a successful
password update and clears its Auth.js cookie. This does not revoke other devices.

## Private responses include fields the browser must not receive

`getProfile()` spreads `user._doc`, which includes the password hash for system
accounts. `updateProfile()` and `updatePassword()` return the full `updatedUser`.
The frontend's Zod response schemas discard unapproved fields before sending or
hydrating data, and mutation responses expose only the success message.

The direct Express endpoints still return those fields. Correct their response
projections in the backend separately. The public endpoint also returns additional
account metadata; the frontend exposes only the public fields requested by the user.

## Age validation disagrees with the database

`src/DB/modules/user/user.validation.js` accepts ages from 18 through 120.
`src/DB/models/user.model.js` sets the age maximum to 60. Database updates run
validators, so ages above 60 may fail despite passing Joi.

The frontend follows the requested 18–120 contract and displays database errors
unchanged. Choose one range and align the backend validation and model separately.

## Local avatars have no public serving route

The model stores local paths such as `uploads\\users\\...`, while
`src/app.bootstrap.js` has no static middleware exposing that upload directory.
These paths cannot currently be used directly as browser image URLs.

Avatar images are deferred. The frontend reserves their dimensions, comments out
the image element, and renders a letter circle. Define public image URLs and
upload/update endpoints when image integration is requested.

## Update responses contain an encrypted phone

`updateProfile()` encrypts the phone before updating the database and returns the
saved document without decrypting it. `getProfile()` decrypts the phone correctly.
The frontend therefore ignores `updatedUser` and refetches the profile after saving.

No backend fixes, migrations, or live verification were performed. Refresh-token
storage, renewal, and expiry handling remain outside this change.

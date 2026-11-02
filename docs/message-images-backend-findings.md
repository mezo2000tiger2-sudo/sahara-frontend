# Message image backend findings

Source review: 2026-11-02. Backend and Postman were not modified.

1. **Missing Cloudinary import: already resolved in current source.** `../saharah_backend/src/DB/modules/messages/messages.service.js:6` imports Cloudinary; lines 14–15 use it for cleanup. The planning finding no longer applies. Cleanup rejection can still mask the intended validation error; handle cleanup failure separately while preserving the original error.
2. **Error cleanup uses local deletion for cloud uploads.** `../saharah_backend/src/app.bootstrap.js:70–82` calls `unlink(file.path)`. Cloud upload paths are HTTPS URLs, so failed requests can leave assets behind. Delete cloud assets by `filename` (public ID) and resource type, and use `unlink` only for local uploads. Avoid duplicate cleanup between the service and error handler.
3. **No configured upload byte limit.** `../saharah_backend/src/DB/common/middleware/multer.js:37–85` streams to Cloudinary and returns `multer({ storage, fileFilter })` without `limits.fileSize`. Set an agreed byte limit and confirm oversized uploads abort and clean up partial assets. The three-file route limit is not a byte limit.
4. **Message routes bypass rate limiting.** `../saharah_backend/src/app.bootstrap.js:28` skips `/message` and every child route. Remove the exemption or add a suitable route limiter, including anonymous uploads.
5. **Public delivery is the selected behavior.** `../saharah_backend/src/DB/common/middleware/multer.js:42–53` uses ordinary cloud upload and stores `secure_url`; `messages.service.js:28–31` saves it as `url`. Anyone holding the URL can open it. HTTPS and `no-referrer` do not provide access control. Authenticated delivery would be separate work.
6. **Historical local paths require separate work.** The frontend substitutes `null` and “Image unavailable.” for local attachment paths. If such database records exist, migrate their files to cloud storage or implement authenticated delivery. No database inspection was performed.

## Postman discrepancies from planning

The inspected [collection](https://go.postman.co/collection/51167906-96fc6bac-264f-40b0-8b6b-ad9b868b0bdf) reportedly uses `userId` for creation and omits the ID in its saved detail URL. These are planning observations, not a fresh collection verification. Current source uses `recevierId` (`messages.service.js:11`) and `/get-message-by-id/:id` (`messages.controller.js`). Suggested correction: update those saved requests in a separate authorized Postman change. This implementation follows backend source and leaves Postman untouched.

Anonymous creation includes `senderId` only when `req.user` exists (`messages.service.js:39`); Sent filters by the authenticated sender (`messages.service.js:81–85`). The frontend continues stripping sender identity from anonymous message responses. This source evidence does not prove real upload or database behavior.

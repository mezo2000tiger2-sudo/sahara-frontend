# Centered loading UI

Previous image/upload/composer changes were committed as `d701fcb` on `feuture/images` before this UI change.

The shared `LoadingState` centers its spinner and text in a vertical stack. Existing message, identity-request, conversation, profile, profile-form and verification fallbacks now use it. Pagination and session-renewal indicators are centered; profile-image saving text is centered while busy. No request, authentication, validation or mutation behavior was changed.

Validation: lint, typecheck, build and diff whitespace checks passed. Browser checks used the real production app with a loopback fixture backend delayed by seven seconds to expose loading states. At 320px, message account loading, profile edit/password loading and conversation account loading had centered icons/text and no horizontal overflow. Message-detail loading was also centered at 1280px. Button indicators were inspected in source; every possible pending action was not browser-tested.

The fixture server logged an Auth.js `SignOutError: no matching decryption secret` while the preview reused cookies from earlier fixture sessions with process-random secrets. New fixture login successfully loaded the checked pages. No production authentication fix was attempted. This fixture warning does not establish a live authentication defect.

The temporary fixture server was stopped. The real-backend frontend on port 3001 was left running. These loading UI changes remain uncommitted for review.

# Phone navigation

The phone header keeps the brand and hamburger on one row. Below 768px, links and theme controls open in a full-width panel anchored immediately below the header. Each row slides from the left with staggered Motion transitions and reverses on close. Reduced motion disables transition duration and stagger delays.

The same server-derived links are used for desktop and phone, preserving existing signed-in/show-sign-in conditions. Closed links are inert and hidden from accessibility APIs. Escape returns focus to the trigger; outside clicks, link clicks and resizing to desktop close the panel.

Passed: lint, typecheck, production build and diff checks. Production browser fixtures verified signed-in links, matching menu/header width and position, no horizontal overflow at 320px and 390px, open/closed row transforms, inert closed content, Escape/focus restoration, and desktop navigation at 1280px. A 320px dark-mode screenshot was visually inspected. The frontend remains on port 3001 against the local backend; no real messages or uploads were sent during these checks.

Preview screenshots initially timed out twice. A fallback native-window check was rejected by automatic approval review because the available window showed unrelated YouTube content; it was not accessed. Local preview verification subsequently succeeded, including a screenshot. Historical preview console entries included connection failures from a previously stopped dev server and a fixture login on the wrong host; checks used a fresh login at 127.0.0.1. The deliberate broken-image fixture returned its expected 404. No authentication or backend code was changed.

Reduced-motion behavior was inspected in source, rather than tested with an OS setting change. Real-device touch behavior remains unverified. Changes are uncommitted.

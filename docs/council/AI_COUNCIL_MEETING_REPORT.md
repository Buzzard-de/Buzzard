# AI Council Meeting Engine

Code: `server/lib/buzzardNative/core/councilSession.js`.  
Does not mutate `platform/councilMeeting.js` or `pusat/council.js`.

Measured `openMeeting({ present: [pusat, sinan_bey, esat_bey, dogu_bey] })`:

- state STARTED (in-process text)
- liveVoice false
- attendance.amelia/adrian/mira/leon false (absent, not faked)
- written turns only for present members
- proto voice report only if Sinan present; official clone not used

Statuses available as labels: PLANNED, STARTED, IN_PROGRESS, COMPLETED, CANCELLED. No live audio conference.

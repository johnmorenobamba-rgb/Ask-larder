# What ships: station QR codes and forms (checked in code, 14 Oct 2026, branch video-v2)

Everything below was read from the code in `src/`, the migrations list, `src/data/features.ts` and the real screenshots in `public/features`. Only shipped behaviour is listed. Things you mentioned that are not built, or only partly built, are called out under "Not as described".

## Station QR codes

**Shipped**
- A station is a row with a `qr_code_slug`. The owner creates it (`CreateStationForm`, `/api/owner/stations`), can add a photo (`StationPhotoUpload`), link a primary training module (`StationModuleSelect`), and analyse a nameplate photo (`NameplateCapture`, owner onboarding equipment step).
- The owner prints a label from `/[venueSlug]/owner/stations/[stationId]/label`: "Larder", the station name, the venue name, a QR code made in the browser with the `qrcode` package, and the words "Scan for training". A Print label button uses the browser print dialog. Source: `.../stations/[stationId]/label/page.tsx`.
- The QR code encodes `stationScanUrl()` in `src/lib/site.ts`: `https://asklarder.com.au/<venueSlug>/station/<qrCodeSlug>`. It always uses the real site address, never the host the page was opened on.
- Scanning opens `/[venueSlug]/station/[qrCodeSlug]`, the station hub (`station/[qrCodeSlug]/page.tsx`). It shows the station name in mono, the heading "What do you need?", and three cards: Training ("Work through your training for this station."), FAQs ("N quick answers for this station.") and Troubleshooting ("N known issues and how to fix them."). Counts count owner approved items only.
- On every station screen the staff member also gets Ask Larder (a round button, bottom left) and "Something felt unsafe?" (a near miss report with optional photo, named or anonymous).
- Sub screens: Training (the linked module), FAQs (question and answer cards), Troubleshooting ("Try this", "Then", and "If this doesn't fix it, stop and ask your supervisor for help." where escalation is required).
- The owner dashboard has a station gallery with each station photo and its QR code (`StationsGallery`, `OwnerDashboardBoard`). Staff also see a stations gallery on the staff home screen.

**Not as described**
- The scan landing page has no station photo and no step by step content. It is a three way choice. The photo appears in the station galleries, not on the hub. I show the hub as it is.
- Scanning is not login free. `requireStationContext` sends a signed out staff member to the venue login with a return address, requires a role, and checks outstanding module re acknowledgements. After sign in they return to the station. So the video must not say "no login". It can show speed from scan to station page for a signed in staff member.
- Ask Larder at a station is not retrieval scoped to the station. The station id is checked, its name is added to the prompt ("Asked from station: ...") and stored on the chat log. Answers still come from the venue's approved content. So the video must not say "answers only about this machine".

## Forms

**Shipped**
- Compliance forms hub (`/forms`): forms grouped by Every shift, Daily, Weekly, Monthly and When it happens, each card marked Not started, In progress or Done, with "Due by" times. Overdue shows on screen only. The page says nothing is emailed or sent to the phone.
- Checklists (`GenericComplianceForm`): Pass, Fail or Not applicable per check, a "Mark the rest as pass" button, pass or fail shown in words as well as colour, a required note only when something fails (with quick note chips such as "Fixed it on the spot"), and a sticky Save record bar that says why Save is disabled. After saving the card shows "Pass. 11 of 11 checks passed", the time and who did it, with "Correct this record".
- Temperature log (`TemperatureLogForm`): one card per unit, typed reading, in range or out of range in words, quick notes on a failure, sticky Save.
- Measured tap count (claims ledger T1): an all pass checklist takes 3 taps and 0 keystrokes from the forms hub. A real recording of exactly this exists locally (`remotion/public-v2/clips/three-taps-s1.mp4`): hub, Mark the rest as pass, Save record, Record saved.
- Owners print records or download CSV (`/owner/forms`).

**Certificates (shipped, with one correction to the brief)**
- Staff open Your certificates (First aid, Food handler, Food Safety Supervisor, RSA, plus WWCC in the code). `CertUploadForm`: "Photo of certificate" (a file row that opens the camera on iPad, `capture="environment"`), an Issued date, then a line that fills in once the date is entered: "Expires" or "Refresher recommended by" with the date and "(3 year(s) from the issued date)". Save certificate is disabled until a photo and a date exist. After saving, the screen shows the Stamp with "RSA certificate uploaded".
- The expiry date is calculated from the issued date and the certificate type's validity (`computeCertDueDate`). It is **not read automatically from the photo**. There is an AI certificate parser (`parse-cert`), but it is on the owner onboarding side, not the staff upload. So "expiry auto captured" is accurate only as "enter the issued date and Larder works out the expiry date".
- In Victoria, RSA, food handling, FSS and first aid are "recommended refresher" (3 years), not hard expiry. WWCC is a hard 5 year expiry. The wording on screen follows this ("Refresher recommended by"). The marketing copy says "what is expiring".
- The owner certificate list shows each person, certificate and date (`public/features/certificates-signoff/owner-expiry.webp`). It is on screen only. Larder sends no reminders.

**Sign off**
- `SignatureForm`: "Sign to confirm", "Type your full name to confirm you've completed onboarding.", a Full name field, a mono line "Signed <date> at <time> on <device>", and a Confirm and sign button. It is a comprehension check, not a contract. The completion screen then shows the Stamp and "<module> completed".

**Not as described / not shipped**
- No form autofill, no photo capture inside checklist forms, no offline mode. Fast entry comes from one tap options, "Mark the rest as pass", quick note chips, and sticky save.
- No time saved claim. The only measured claim is "3 taps, 0 keystrokes" on an all pass checklist (T1). A quick temperature log is 3 taps when all readings are in range per the ledger (T2) but that clip is not used.
- The checklist form shows "About 4 minutes" / "About 6 minutes" per form. That is the form's own estimate, not a measured result, so the video does not turn it into a claim.

## What the video can use as a real capture, and what must be rebuilt

| Scene | Real capture available | Rebuilt in the app's own styling |
| --- | --- | --- |
| QR label | `public/features/stations/qr-label.webp` (its code points at a venue page that does not exist for the example venue) | The sticker is redrawn with a real, scannable QR that opens asklarder.com.au. |
| Scan | None | The camera view is a composite: a station photo from the demo venue with the sticker placed on it, plus a viewfinder overlay. |
| Station hub | `public/features/stations/station-page.webp` (cropped, no heading) | Whole hub redrawn from `page.tsx`, using the real counts shown in that screenshot (pizza oven: 2 answers, 1 issue). |
| Forms | `three-taps-s1.mp4`, a full recorded run | Nothing rebuilt. |
| Certificate upload | None (`staff-certificates.webp` shows the list only) | The upload screen and saved state redrawn from `CertUploadForm.tsx`, using its real strings. |
| Sign to confirm | `esign.webp` (name already typed) | Redrawn so the name can be typed on camera. |
| Module completed | `module-completed.webp` | Stamp redrawn with a word prop (app hardcodes APPROVED). |
| Owner dashboard and certificates | `owner-dashboard.webp`, `owner-expiry.webp` | None. |
| Ask Larder | Marketing screenshot of the answer | Re-created as in v2. |

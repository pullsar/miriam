# Download Counts and Memorial Brochure Link Design

## Goal

Track how often visitors download the full memorial brochure and the mobile Order of Mass, display each total as a discreet number-only bubble beside the corresponding links, and replace the hero's programme call-to-action with a direct memorial brochure download.

## Counting Model

The site will count deliberate activations of its PDF download links rather than attempting to identify unique people. No IP address, email address, browser fingerprint or other personal identifier will be stored. Explicit click tracking prevents health checks, crawlers and PDF metadata requests from inflating the totals.

Two durable counters will be stored in the existing SQLite database:

- `brochure` for the full memorial brochure;
- `order-of-mass` for the mobile readings and Order of Mass.

The two existing stable PDF URLs remain unchanged. When a visitor activates a tracked link, the browser sends a small anonymous POST to the matching counter endpoint while the PDF download proceeds independently.

## API and Data Flow

The server will create a `download_click_counts` table with a resource key and non-negative integer count. Prepared statements will increment a resource atomically and return both totals.

`GET /api/download-counts` will return:

```json
{
  "brochure": 0,
  "orderOfMass": 0
}
```

The browser will fetch this endpoint after the page loads. Every badge associated with a resource will receive the same total. Clicking a PDF link will optimistically increase all visible badges for that resource by one and POST the anonymous activation; the server remains authoritative.

If the API is unavailable, the links continue to work and their badges remain hidden. If a PDF is missing, the counter endpoint and download route return a normal 404 without incrementing the total.

## Interface

Both the entrance download controls and the in-page Digital Memorial Resources cards will include a compact circular or pill-shaped number badge. The badge contains only the localized integer and an accessible label such as `12 brochure downloads`; it has no visible title or description.

The badge will use restrained gold/navy styling, meet contrast requirements, and remain visually subordinate to the link title. A zero count may be shown once the API responds; before that, the badge is hidden to avoid a misleading flash.

The hero's secondary action will change from `View Programme` to `Memorial Brochure` and point to `/downloads/prof-miriam-ngozi-mgbakor-memorial-brochure.pdf` with the `download` attribute. The on-page programme section and navigation link remain intact.

## Verification

Automated tests will cover:

- durable, independent counter increments for both resources;
- unchanged stable download URLs and PDF responses;
- no increment for unknown or missing resources;
- the count API response shape;
- number-only badges on both appearances of each PDF link;
- synchronized client updates and graceful API failure;
- the hero's direct Memorial Brochure action;
- preservation of the programme section and navigation.

Deployment verification will request the live API, perform controlled anonymous counter POSTs, confirm the totals increase independently, and visually check the badges at desktop and mobile widths.

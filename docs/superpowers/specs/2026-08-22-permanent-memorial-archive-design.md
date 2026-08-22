# Permanent Memorial Archive Design

**Date:** 22 August 2026  
**Status:** Approved design awaiting written-spec review

## Purpose

Transform miriamngo.com from a funeral-planning and invitation site into a permanent digital memorial centred on Professor Miriam Ngozi Mgbakor’s life, the voices of those who knew her, and the photographs they shared.

The redesign must feel grand, ceremonial and personal without becoming visually crowded or theatrical. It must preserve the existing tribute and photograph submission workflows while placing the memorial content before the forms.

## Content Inventory

The production site currently holds:

- 149 tributes;
- 60 uploaded photographs;
- family, friend, student, colleague, church and community contributions;
- several tributes long enough to require dedicated editorial treatment;
- a full memorial brochure and a mobile Order of Mass PDF;
- two audio files, of which only `o-lord-my-god-how-great.mp3` will remain in use.

## Information Architecture

The permanent homepage will use this order:

1. Memorial hero
2. Brief personal biography
3. Tributes
4. Photograph gallery
5. Share a memory
6. Memorial archive
7. Closing prayer and family footer

The navigation will become:

- Her Life
- Tributes
- Gallery
- Share a Memory
- Memorial Archive

The concluded programme, dates, venues, attire and event-planning sections will be removed from the homepage. Their historical record remains available inside the downloadable memorial brochure and Order of Mass.

## Memorial Hero

The entrance overlay will be removed so visitors reach the memorial immediately.

The hero will feature Professor Miriam’s academic-regalia portrait with a controlled dark gradient for contrast. The principal copy will identify her as:

> Professor Miriam Ngozi Mgbakor  
> 1960–2026

The supporting line will describe a life of faith, learning, welcome, music and joy without event or invitation language.

Primary actions:

- Read Her Tributes
- View Her Gallery

A compact audio control will read “Play the Glory Song.” The only audio source will be `/audio/o-lord-my-god-how-great.mp3`. The former `soon-ah-will-be-done.mp3` source and playlist rotation will be removed from the interface and JavaScript.

## Visual Direction

The memorial will use a restrained ceremonial system:

- midnight navy for depth and authority;
- warm ivory for long-form reading surfaces;
- antique gold for rules, category markers and small ornamental details;
- restrained plum as an occasional accent connecting the site to the brochure;
- white only where maximum contrast is required.

Typography:

- Cormorant Garamond for display headings and large tribute titles;
- a highly readable book serif such as Source Serif 4 for biography and tribute text;
- Inter for navigation, filters, metadata and form controls;
- Great Vibes, if retained, only as a rare signature-like accent.

The design may use fine gold rules, small diamonds, generous margins and softly framed portraits. Ornament must support hierarchy, never compete with the words or photographs.

## Biography

The biography will be brief, personal and written in the established voice of a friend. It will avoid invented experiences and draw only from the verified biographical material already used in the brochure.

Its presentation will pair a younger portrait with a concise two-column editorial introduction on desktop and a single readable column on mobile.

## Tribute Experience

All public tributes will be displayed. They will be organised into:

- Family
- Friends
- Students
- Colleagues
- Church & Community
- Other Memories

Relationship values will be normalised for presentation without rewriting tribute content. “Guestbook tribute” and unspecified relationships will fall into Other Memories unless the author or text provides an unambiguous existing category.

### Tribute hierarchy

Each category opens with a ceremonial section heading and its contribution count.

Tributes will have three editorial formats:

1. **Feature tribute:** long or especially substantial contributions receive a full-width reading surface with a large contributor name and generous book typography.
2. **Standard tribute:** medium-length contributions appear as spacious two-column cards on desktop.
3. **Compact tribute:** short messages appear in a balanced card grid.

The interface initially renders a manageable number of tributes, then reveals more through a “Load More Tributes” control. This prevents 149 full texts from making initial page load and navigation unwieldy.

Visitors can:

- filter by category;
- search contributor names;
- open every tribute in full;
- copy a shareable link to an individual tribute;
- return to the same tribute through a stable `#tribute-{id}` anchor.

No tribute will be paraphrased, embellished or truncated permanently. Excerpts are presentation-only, and “Read in full” exposes the complete submitted text.

### Contributor names

Names displayed in all capitals or inconsistent casing will be converted to proper display capitalization. The formatter must preserve recognised titles and suffixes including:

- Prof.
- Dr.
- Rev.
- Fr.
- Mrs.
- Mr.
- Assoc. Prof.
- C.S.Sp.
- ESUT and other recognised acronyms

The underlying stored name remains unchanged.

## Gallery Experience

The gallery will combine the curated photographs already shipped with the site and all publicly returned photographs from `/api/photos`.

Presentation:

- an editorial lead photograph or small opening collage;
- a responsive masonry-style gallery;
- varied portrait and landscape spans based on image orientation;
- lazy loading and asynchronous decoding;
- uploader and caption shown only when meaningful;
- full-screen lightbox with previous/next controls, image count and keyboard navigation;
- image download retained as a secondary lightbox action rather than repeated over every thumbnail.

Duplicate URLs will be removed client-side before rendering. Broken images will collapse cleanly rather than leave empty frames.

## Share a Memory

New submissions remain open.

The existing tribute and photograph forms will move below the displayed tribute archive and gallery. They will appear as two elegant choices:

- Write a Tribute
- Share Photographs

Only the selected form is expanded at a time. Existing validation, image optimisation, submission confirmation and email notification behavior will be preserved.

The copy will speak in permanent memorial language, not funeral-planning language.

## Memorial Archive

The final resource section will retain:

- Full Memorial Brochure
- Mobile Readings & Order of Mass

The anonymous download-activation counters remain. The QR-code download card will be removed from the principal resource grid because it is no longer a meaningful visitor resource. The visible site QR section will also be removed.

## Public Data and Privacy

`GET /api/tributes` currently returns complete database rows, including contributor email addresses and phone numbers. The redesigned public endpoint must return only:

- `id`
- `name`
- `relationship`
- `message`
- `created_at`

Email addresses and phone numbers remain available only to the server-side submission and notification workflow.

All visitor-supplied tribute, caption and contributor text will be inserted with DOM `textContent`, not `innerHTML`.

## Client Architecture

The existing single JavaScript entry point will gain focused units for:

- tribute fetching and normalisation;
- name formatting;
- category filtering and search;
- progressive tribute rendering;
- individual tribute expansion and deep linking;
- gallery fetching, deduplication and rendering;
- contribution-panel switching;
- single-track audio control.

The existing upload, form validation, compression and lightbox behavior will be reused where it remains appropriate. Event-specific reveal selectors and code will be removed.

## Loading and Failure States

Tribute and gallery sections will show quiet ceremonial loading placeholders.

If tribute loading fails:

- the section displays a concise retry message;
- the submission forms and remaining memorial content continue to work.

If photo loading fails:

- curated photographs remain visible;
- the uploaded-photo region displays a retry control.

If music cannot play:

- the page remains silent;
- the control returns to its initial state without blocking navigation.

## Accessibility and Mobile Requirements

- Long tribute text must remain at a comfortable reading size with approximately 60–75 characters per line on desktop.
- Mobile tribute text must not require zooming.
- All text over images must sit on tested high-contrast gradients or opaque surfaces.
- Filters, expansion controls and lightbox buttons must be keyboard accessible.
- Category state and expanded tribute state must be communicated with appropriate ARIA attributes.
- Motion will respect `prefers-reduced-motion`.
- The site must remain usable when JavaScript partially fails: biography, curated imagery, forms and archive links remain present in HTML.

## Verification

Automated tests will verify:

- event-planning sections and the former entrance overlay are absent;
- the hero and navigation use permanent memorial language;
- only the glory-song source remains in client behavior;
- the public tribute API omits email and phone fields;
- tribute category mapping and name formatting;
- all fetched tribute text is rendered safely;
- gallery deduplication and progressive loading hooks;
- existing submissions and anonymous PDF counters remain functional.

Visual verification will cover desktop and mobile views of:

- the hero;
- biography typography;
- every tribute format;
- category filters and search;
- gallery masonry and lightbox;
- contribution panels;
- memorial archive.

The production deployment will be verified against the live tribute and photograph APIs without submitting test memories or exposing contributor contact details.

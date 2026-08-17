# Entrance Download Access Design

## Goal

Let visitors download the complete memorial brochure and the mobile-friendly readings and Order of Mass directly from the opening screen, without entering the main memorial site or starting its music.

## Approved Experience

The existing entrance overlay remains the first view. Beneath its memorial title and entrance action, it gains a compact **Memorial Resources** group with two distinct download links:

1. **Full Memorial Brochure** — PDF, approximately 11.9 MB.
2. **Mobile Readings & Order of Mass** — PDF, approximately 0.5 MB.

The links use stable public filenames and the browser's download behavior. Selecting either link must not trigger the entrance animation, dismiss the overlay, start music, or set the `memorialEntered` session flag.

## Visual Direction

- Preserve the site's royal blue, cream, white, and restrained gold palette.
- Use the existing Cormorant Garamond and Inter typography.
- Present the downloads as a quiet pair of bordered actions rather than oversized promotional cards.
- Maintain clear contrast against the entrance background and an obvious keyboard focus state.
- Stack the actions cleanly on narrow mobile screens.
- Avoid additional imagery, badges, gradients, animations, or explanatory copy that competes with the memorial title.

## Files and Routing

Publish static PDF copies under `public/downloads`:

- `prof-miriam-ngozi-mgbakor-memorial-brochure.pdf`
- `prof-miriam-ngozi-mgbakor-mobile-readings.pdf`

The entrance links and the existing in-site downloads section both point to these files. Static files are preferred to server-generated routes so downloads remain available through the existing Express static hosting and common static deployment environments.

## Interaction and Accessibility

- Links include the HTML `download` attribute and descriptive accessible labels.
- Click and keyboard events from the download group stop propagation before reaching the entrance overlay.
- The entrance overlay retains its current click, Enter, and Space behavior everywhere outside the download controls.
- Each link has a visible focus treatment and a minimum comfortable touch target.

## Verification

- Automated tests confirm both public PDF files exist and match the approved source artifacts.
- Markup tests confirm both download links appear on the entrance screen and in the in-site downloads section.
- Interaction tests confirm download clicks and keyboard activation do not enter the site or start music.
- Responsive browser review covers desktop and phone widths, checking contrast, spacing, wrapping, and touch-target size.

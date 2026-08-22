# Brochure Access and Gallery Curation Design

## Goal

Make the memorial brochure available from the opening screen, remove four reviewed uploads that do not show Miriam, and replace editorial resource copy with direct download language.

## Interface

The hero gains a third action, **Download Brochure**, linking directly to the existing brochure PDF with the standard `download` attribute and the existing download-count tracking hook. On phones, the button spans the full action row so its label remains readable and its touch target remains at least 50 pixels high.

The lower resource section uses the kicker **Memorial downloads**, the heading **Brochure & Readings**, and the sentence **Download the memorial brochure or the bilingual Order of Mass.** The two existing resource cards and their counters remain unchanged.

## Gallery curation

The existing non-destructive exclusion set adds IDs 51, 52 and 53, uploaded by Linda and Chris Nwakobi, and ID 69, uploaded by Dr. Onwura Sylvester Okonkwo. The uploaded files and database records remain intact; only public gallery rendering changes.

## Verification

Static regression tests confirm the hero download link, direct resource copy, mobile full-row treatment and the four new exclusion IDs. The complete Node test suite and a live production check verify the download, gallery count, responsive layout and absence of broken images.

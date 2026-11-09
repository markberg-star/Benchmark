# Benchmark 1.1.0 design review

Result: passed.

The accepted home and workout-saved mockup was compared with the working app at a 390 × 844 phone viewport. The two mockup panels were treated as separate screens; real content and phone height determine scrolling rather than stretching the mockup. The active workout and exercise picker use the previously accepted focused-set and muscle-group layouts.

## Verified

- Dark forest background, bright green primary actions, warm white text, local Manrope typography, and restrained borders follow the accepted visual direction.
- The home image uses the actual color Tom Platz coaching photo. Its framing excludes the squatter’s face and keeps Tom visible in his suspenders.
- The actual Sam Sulek car photo appears after a successfully saved workout, with review and return actions.
- Exercise choices show broad muscle-group illustrations, equipment, and distinct variation names.
- Current-set weight and actual reps have large separate fields; previous results and rep targets remain clearly labeled references.
- Complete set stays at the bottom of the screen. Primary actions and routine-edit targets are at least 44 CSS pixels. Finished sets can be revisited without becoming new results automatically.
- No horizontal page overflow at 320, 375, 390, or 430 pixels wide. At smaller heights, the set card scrolls above the fixed action area.
- Home, workout, picker, and completion screens were visually inspected. Independent review found no blocking layout or readability issues.

## Corrections

- Aligned component selectors with the final markup for routine actions, completion headings, next-exercise navigation, and the editor.
- Fixed the workout action dock to the phone viewport, including bottom safe-area padding.
- Expanded small routine-edit controls to 44 pixels.
- Cleared earlier input toasts when navigating or showing successful completion. The final browser check confirmed the old toast is hidden on the saved-workout screen.

## Intentional differences and limits

The working app uses the actual sourced photos rather than the generated likenesses in the mockup. Counts, routine names, progress, and results are derived from records. The home screen may scroll to the backup controls on a short phone. Native iPhone Safari keyboard behavior and Home Screen installation remain to be checked on Mark’s phone.

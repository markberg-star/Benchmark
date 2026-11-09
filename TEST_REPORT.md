# Benchmark 1.1.0 verification

## Completed checks

- All 24 model tests passed with Node’s built-in test runner.
- All application modules passed JavaScript syntax checks.
- Private starter: 3 routines, 15 exercise entries, 27 undated reference sets, and no invented completed history.
- Fresh installation starts without personal routines. The public app files contain no copied personal routine or workout records.
- Browser rendering at phone widths 320, 375, 390, and 430 pixels showed no horizontal overflow.
- Today’s inputs start blank. Copying the previous weight copies only weight; actual reps remain blank and the set remains incomplete.
- Entered values survived a reload. Marking a set complete advanced to a blank next set.
- Finishing a workout displayed the saved screen, linked to history, and supplied the next session’s previous result and actual-reps-plus-one target.
- Alias search found machine chest fly and rear delt fly through “pec deck”.
- Offline test: all 27 application resources were cached. Reloading while offline retained an unfinished set, allowed completion and saving, and loaded photos, muscle thumbnails, and fonts.
- Update test: applying a new service worker was disabled during an active workout. After finishing, applying an update replaced the old application cache and preserved the entire stored JSON state exactly.
- No browser JavaScript errors in the visual and offline test flows.

The tests ran against a local HTTP server in Chromium using phone-sized viewports and touch settings. They do not claim an iPhone hardware or Safari test, a public GitHub deployment, or guaranteed permanent browser storage. The setup guide includes the short real-phone check.

## Run model tests

From this package’s root, with Node installed:

```sh
node --test tests/model.test.mjs
```

## Additional browser checks

- Invalid import and canceled import preserved the current stored state exactly.
- Exported a completed workout through the real download button, replaced the data with the starter file, then restored the downloaded backup. The full stored JSON matched the pre-replacement state exactly.
- Adding a set with This workout only changed the session from 8 to 9 sets while the template stayed at 8. Choosing Update saved routine after another added set produced a 10-set template. Completed history was identical before and after both edits.
- A simulated GitHub Pages subfolder at /benchmark/ loaded correctly, installed its scoped service worker, and saved entries after an offline reload.
- Final 44-pixel routine-edit controls and the 127-pixel workout dock fit the 320-pixel viewport without horizontal overflow.

Browser screenshots and personal test backups were used for internal inspection and are not included in this package.


## Final restore and recovery checks

The final main.mjs passed syntax checking and all 24 model tests passed again after the restore fixes were applied.

In the actual browser app, with storage failures injected only through the test browser's network route:

- A rejected restore left the full stored state unchanged and displayed an inline role=alert message inside the native import dialog.
- The restore action became available after failure; retrying with storage restored committed the replacement, closed the dialog, and showed the replacement routine.
- A stale second tab was blocked from overwriting a newer active workout. The stored data remained identical to the first tab's saved state.
- Completing a workout after copying a prior weight hid the earlier toast and showed the saved-workout screen.
- A failed catalog expansion at startup preserved the stored records and kept the routines screen and Export now recovery control accessible.
- No browser JavaScript errors occurred in these final checks.

The prepared replacement logic also passed seven isolated regression tests, covering rejected and synchronous saves, previous save-promise recovery, retry behavior, safe inline error text, stale storage, duplicate requests, and unconfirmed imports. These isolated tests supplement the actual browser checks; they are not an iPhone test. Test fault injection is not present in the shipped app.

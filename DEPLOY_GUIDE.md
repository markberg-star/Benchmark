# Benchmark 1.1.0 setup and use

Benchmark is a static workout tracker for your iPhone. The public app contains code, icons, and a general exercise library. Your routines and workout records stay in the app's storage on your phone. There is no account, analytics, or cloud database.

## 1. Upload the app to GitHub

Use your computer for these steps. You do not need Terminal or a paid hosting plan.

1. Download and unzip the app package.
2. Open the **app** folder. The files inside it are the only files to publish.
3. Sign in to [GitHub](https://github.com). Choose **New repository**, name it **benchmark**, choose **Public**, turn on **Add README**, and create it. GitHub Pages on GitHub Free uses a public repository.
4. In the repository, choose **Add file → Upload files**.
5. Drag the **contents of the app folder** into the upload area. Include the `icons` and `assets` folders, plus every other file and folder inside `app`. Do not drag the enclosing app folder. You want `index.html` at the top level of your repository.
6. Check the uploaded filenames, enter a message such as `Add Benchmark`, and commit the files to `main`. If GitHub offers a branch choice, select the current `main` branch for this personal repository.

**Do not upload your private routine JSON, a backup, the original screenshots, or the ZIP itself.** Those files do not belong in the public repository. No API keys or credentials are needed.

## 2. Turn on GitHub Pages and find the link

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Select **main** and **/(root)**, then **Save**.
4. Allow a few minutes for publishing. Return to **Settings → Pages** and use **Visit site**. GitHub says publication can take up to 10 minutes.
5. The address will normally be `https://YOUR-USERNAME.github.io/benchmark/`. Copy the address GitHub actually shows and send it to your phone.

If you get a 404, check that `index.html` is at the repository's top level, Pages points to `main` and `/(root)`, and the deployment in the **Actions** tab succeeded. Opening the downloaded `index.html` directly on your computer is not the same as using the hosted app.

## 3. Add it to your iPhone Home Screen

1. Open the live link in **Safari**, using a normal tab rather than Private Browsing.
2. Tap Safari's **Share** button. Depending on your Safari layout, open the page menu first.
3. Choose **Add to Home Screen**. Enable **Open as Web App** if that option appears.
4. Keep the name **Benchmark**, then tap **Add**. The included fitness icon should appear.
5. Open Benchmark from that new icon while online. Use this Home Screen app consistently for your records.

Install first, then import your routine file into the Home Screen app. Browser and installed-app storage behavior can differ, so do not assume a Safari tab and your Home Screen app will always share the same data.

## 4. Load your routines privately

1. Save **Benchmark_Private_Routines.json** into Files on your iPhone. Choose **On My iPhone** if you want the file kept out of iCloud Drive.
2. Open Benchmark from the Home Screen and tap **Import**.
3. Select that JSON file, read the preview, and confirm the replacement. It contains three routines and 27 undated reference sets. Your completed workout history starts empty.

**Import replaces the app's current records. It does not merge them.** The preview lets you check what is coming in before anything changes. If you already have records, export them first. Canceling the import leaves your existing records in place. A malformed or unsupported file is rejected.

## 5. Log a workout

1. Tap **Start workout**, or **Resume workout** if you have an unfinished session.
2. The current set shows its previous result and rep target above two large fields. Today's weight and actual reps start blank. Enter what you actually used and completed.
3. **Use previous weight** copies only that set's prior weight. It does not copy reps or mark the set complete. If you have already entered a different weight, Benchmark asks before replacing it.
4. Tap **Complete set** after the set. The app moves to the next incomplete set. Completed sets remain available to review or correct. Use **All exercises** to jump elsewhere in the workout.
5. Watch the save status near the workout title. Wait for **Saved on this device** before closing. If saving fails, follow the visible error and export your entries before leaving.
6. Tap **Finish workout**, review the completed-set count, and confirm. The saved-workout screen confirms completion and lets you review the session or return to your routines. Unchecked sets remain marked not done and never supply future comparisons.

Previous results come from the most recent completed workout for the exact exercise, including other routines. A set's next target starts at its last completed rep count plus one. You can adjust today's target in the workout editor.

**Weight conventions**

- Dumbbells: pounds for **one dumbbell**.
- Machines and cables: the displayed resistance.
- Assisted pull-ups and dips: the displayed pounds of **assistance**. More assistance means more help, not more resistance.
- Smith machines: use the same total-weight convention consistently. Benchmark does not guess the bar's weight.
- Bodyweight exercises: enter reps without inventing an external weight.

Use **Edit** to add, replace, remove, or reorder exercises and sets. Choose **This workout only** or **Update saved routine**. Completed workout history is preserved. Replacing an exercise does not transfer its results to a different movement.

The searchable library includes common machines, cable movements, free weights, and bodyweight exercises, with muscle-group pictures. You can also create or rename exercises. Create a new exercise for a different variation or gym machine, such as `Chest Press (Gym B)`. Renaming an existing exercise keeps its previous results linked.

The library is a list of available movements, not a prescribed training program. Muscle pictures are broad group cues, not movement instructions.

## 6. Export and restore backups

**Export** downloads one JSON backup containing routines, exercise names, completed workout history, settings, and any unfinished workout. Export regularly and before importing or installing an update.

On iPhone, confirm the file appears in Files. If Safari shows a file preview instead of saving it immediately, use **Share → Save to Files**. Choose **On My iPhone** to avoid putting that export in iCloud Drive. The phone's system backup settings are separate from Benchmark.

To restore, tap **Import**, select the backup, check the preview, export your current data if needed, and explicitly confirm replacement. An old backup restores the records as they were when exported; it cannot recover workouts logged after that export.

A backup on the same phone can help after clearing app data. It cannot protect against losing that phone. If you choose, keep an additional private copy on a computer or external drive. Benchmark does not send backups anywhere automatically.

## 7. Install future updates without resetting records

1. Export a fresh backup and finish any active workout.
2. On your computer, unzip the new release. Upload the new **app** folder's contents to the **same repository**, replacing the files with matching names. Commit to `main`.
3. Wait for GitHub Pages to publish. Keep using the same live address and Home Screen icon.
4. Open Benchmark while online, check for an update, and apply it when offered. If an update is waiting during a workout, finish the workout first.

App updates replace the program files, not the local workout database. **Do not clear Safari website data, delete and reinstall the Home Screen app, change its address, or import the starter file again as part of an update.** Moving to a new URL or phone requires exporting and importing your records.

For anyone editing the source, release the whole app together and increment `VERSION` in `sw.js`. Future changes to the database format must include a migration, not a reset. The service worker only manages app-file caches and never deletes the workout database.

## 8. Check these on your actual phone

Before relying on the app for a real workout:

1. Check that the icon, text, numeric keyboard, and completion buttons feel right.
2. Enter a test set, wait for Saved on this device, close the app, reopen it, and confirm the unfinished session is intact.
3. Check that Use previous weight leaves actual reps blank. Complete a test workout and start another with the same exercise. Check the previous-result comparison and next target.
4. Export and confirm the JSON file exists. Import it through the preview and check that your routines and test history return.
5. After the app has loaded fully online, use Airplane Mode, reopen it, and check that you can log and save a set offline. Reconnect afterward.

Local browser storage is not guaranteed permanent. Storage pressure, clearing data, or losing the phone may remove records. It is also not a separate password-protected vault from someone who can use your unlocked phone. GitHub hosts the public app and records normal website access information, including visitor IP addresses, but Benchmark does not upload your workout entries. Projects hosted under the same `username.github.io` share a browser origin, so only publish code you trust on that hostname.

## Official setup references

- [Create a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Choose the Pages publishing branch and folder](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Upload files through GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Add a website as an iPhone app](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)

Checked November 9, 2026. Labels may differ slightly by GitHub or iOS version.

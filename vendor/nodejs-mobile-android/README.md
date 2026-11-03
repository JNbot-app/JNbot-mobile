# Android Node runtime

These compressed libraries replace the 4 KB-aligned Android 64-bit binaries in
`nodejs-mobile-react-native@18.20.4`. They retain Node 18.20.4 and the existing
React Native bridge API. The 32-bit Android and iOS runtimes use the package's
original binaries.

The user supplied the download posted by `ubaidimranofficial` in
[upstream issue 94](https://github.com/nodejs-mobile/nodejs-mobile-react-native/issues/94).
`manifest.json` records that download and the SHA-256 checksums of its uncompressed
libraries. The contributor did not publish a source revision or build flags.
These are community binaries, not an official upstream release. `LICENSE`
contains the Node 18.20.4 runtime and dependency licenses from upstream.

Both libraries pass the ELF 16 KB alignment check and export the same symbols as
the package's original binaries. The ARM64 runtime also passed startup, file I/O,
SHA-256, and worker-thread checks on an emulator with 16,384-byte memory pages.
These checks establish compatibility for the tested operations; they do not
establish the binaries' source provenance.

`npm install` installs these libraries through `scripts/patch-nodejs-mobile.mjs`.
The script verifies their checksums and ELF alignment, and adds the bridge's
16 KB linker flags. Keep these assets and their manifest in version control.
When upgrading Node.js Mobile, replace and reverify the binaries and manifest
together. The patch rejects a package version mismatch.

After building an Android release, check all its 64-bit native libraries:

```sh
npm run verify:android-page-size
node --test scripts/android-page-size.test.mjs
```

The release command also runs the ELF check automatically. Check the APK
generated from the AAB with Android's `zipalign -c -P 16 -v 4`, then exercise
local bots on a 16 KB Android device or emulator with compatibility mode disabled.

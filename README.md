# JNbot Mobile

JNbot Mobile brings JNbot to iOS and Android. Run and automate Minecraft bots directly on your phone with the embedded JNbot runtime, or connect to your JNbot desktop to control it from anywhere.

## Features

- Run bots locally on the device.
- Connect to a JNbot desktop instance through an authenticated peer-to-peer WebRTC channel.
- Manage profiles and Minecraft accounts.
- Join, monitor and control bots: chat, commands, live inventories and logs.
- Automate with scripts, chains and schedules.
- Install plugins from the marketplace, import them, record actions and share them.
- Home screen widgets for bots and cooldowns.

## Connecting to desktop

In JNbot desktop, open **Remote access**, start the host, then create or select a device access link. Scan its **JNbot Mobile** QR code or paste the generated `jnbot://connect` link into the app.

The device token is stored in the operating system's secure keychain. The selected mobile profile is local to the phone and never changes the desktop's selected profile.

## Development

WebRTC requires a native development build; Expo Go is not supported for the normal development command.

The app shares its local bot backend and native `jnbot-needle` module with
[JNbot desktop](https://github.com/JNbot-app/JNbot-desktop). Clone both repositories
side by side, with the desktop checkout named `app`:

```bash
git clone https://github.com/JNbot-app/JNbot-desktop.git app
git clone https://github.com/JNbot-app/JNbot-mobile.git jnbot-mobile
```

Build the backend from the desktop checkout. It is written to
`jnbot-mobile/nodejs-assets/nodejs-project`, which is not version controlled:

```bash
cd app
npm install
npm run prepare:needle-mobile
npm run build:mobile-backend
```

Then build and run the app:

```bash
cd ../jnbot-mobile
npm install
npm run verify:local-backend
npx expo prebuild --clean
npx expo run:ios       # or npx expo run:android
npm start              # use the installed native app; Expo Go is unsupported
```

To create a signed Android production AAB using the production EAS environment, run:

```bash
npm run release:android
```

The command increments `expo.android.versionCode`, rebuilds the generated native project,
and writes the AAB to `android/app/build/outputs/bundle/release/app-release.aab`.

Use Node 20.19.4 or later, matching Expo SDK 54 / React Native 0.81 requirements.

Run the static check with:

```bash
npm run typecheck
```

## Monetization

Free users may see one preloaded interstitial before a bot join or script start,
limited to one per cold app session and one per ten minutes across launches. Ads fail
open and are never loaded without the required consent. A RevenueCat-backed lifetime
purchase removes these ads.

Development builds use RevenueCat Test Store and Google's test ad units. Copy
`.env.example` to `.env.local` when configuring a local native build.

## Protocol

The app uses the same signaling server, WebRTC data-channel framing, `messenger:assigned` address allocation, and versioned Messenger envelopes as the desktop remote web client. Desktop JNbot remains responsible for device authentication and profile-scoped authorization.

## License

[MIT](LICENSE)

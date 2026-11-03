# JNbot Mobile Privacy Policy

Last updated: 2026-08-22

This draft applies to the JNbot Mobile iOS and Android companion app. Before
release, the publisher must replace the publisher/contact section with the
responsible legal name and a monitored privacy contact address.

## Publisher and contact

JNbot Mobile is published by the developer identified in the applicable app
store listing. Privacy questions, access requests, deletion requests, and
complaints should be sent to the monitored privacy contact published in that
listing. Do not post private information in a public issue or support forum.

## What the app does

JNbot Mobile connects to a JNbot desktop instance or runs a supported local
runtime. It can scan a pairing QR code, show bot and script state, and offer an
optional one-time purchase that removes advertising.

## Information processed

### Crash reports and diagnostics

The app uses Sentry to receive crash reports and diagnostic logs. These may
include stack traces, error messages, app version, device model, operating-system
version, locale, network information, and other technical context needed to
diagnose failures. The current Sentry configuration enables default personal
information, which can include IP address, cookies, and user context. Review the
Sentry project retention and data-deletion settings before release.

### Advertising

The app uses Google Mobile Ads. Depending on consent, Google may process
advertising or device identifiers, ad request information, approximate location
derived from network or device signals, and ad-performance or diagnostic data.
On Android, the app requests non-personalized ads and presents the applicable consent
and privacy-choices forms. Removing ads does not delete data already processed by
Google; requests concerning Google-held data must be made through Google’s privacy
controls. iOS does not load advertising services.

### Purchases

On Android, the app uses RevenueCat to manage the `remove_ads_lifetime` purchase and
the `ad_free` entitlement. RevenueCat may process an app user identifier, product
identifier, purchase history, entitlement state, store receipts, and technical
device/app information. Google processes payment details; the app does not receive
the full payment-card number. Purchase state is cached locally so the app can suppress
ads when temporarily offline. iOS has no ads or purchases and does not load RevenueCat.

### Camera and QR pairing

Camera access is used only while the QR-scanning screen is open. QR data is
decoded on the device. Camera frames are not intentionally uploaded or retained
by JNbot Mobile. The scanned pairing link is used to establish the connection
requested by the user, and the resulting device credential is stored in the
operating-system secure storage.

### Local and paired-device data

Profiles, app settings, cached entitlement state, and connection history may be
stored locally on the device. When the user pairs with a desktop, the app sends
the commands and receives the profile/runtime data needed for that connection.
The paired desktop remains responsible for data it stores outside the mobile
app.

## How information is used

Information is used to operate the app, establish the requested connection,
restore purchases, remove ads after entitlement verification, provide consent
controls, secure the service, and diagnose crashes and reliability problems.
JNbot Mobile does not sell personal information.

## Retention and deletion

Local data can be removed by disconnecting profiles, clearing app data, or
uninstalling the app, subject to operating-system backup behavior. Sentry,
Google, Apple, Google Play, and RevenueCat retain information under their own
policies and configured retention periods. Use the publisher privacy contact to
request deletion or to ask which third-party request path applies.

## Children

The app is not directed to children and should not be used to submit personal
information belonging to a child.

## Changes

This policy may be updated when the app, SDK configuration, or legal obligations
change. The effective date above will be updated with each revision.

## Third-party policies

- [Sentry Privacy Policy](https://sentry.io/privacy/)
- [Google Privacy Policy](https://policies.google.com/privacy)
- [RevenueCat Privacy Policy](https://www.revenuecat.com/privacy/)
- [Apple Privacy](https://www.apple.com/legal/privacy/)

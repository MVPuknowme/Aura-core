# Local certificate drop zone

Place Apple Wallet Pass Type ID signing material here for local development only:

- `pass.pem` — Apple-issued Pass Type ID certificate converted from `.cer` to PEM
- `pass.key` — private key used to create the Pass Type ID CSR
- `wwdr.pem` — Apple WWDR intermediate certificate converted to PEM

Do not commit real certificate files, `.p12` bundles, private keys, or `.env` files.

The Apple ALD encryption/signing certificate lane is not used for this Wallet pass.

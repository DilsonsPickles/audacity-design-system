// Ad-hoc sign the packaged macOS .app after electron-builder produces it.
//
// We don't have an Apple Developer ID yet, so we can't notarise — but
// without ANY signature macOS marks the bundle "damaged" the moment a
// downloaded copy is launched (it strips ad-hoc signatures applied by
// electron-builder's default build, then sees an unsigned app with the
// quarantine bit and refuses to open). Re-applying an ad-hoc signature
// via `codesign --sign -` keeps the bundle internally consistent so a
// `xattr -d com.apple.quarantine` (or right-click → Open → Open) is all
// the user needs, rather than the more invasive `xattr -cr` reset.
//
// This is a stop-gap until a real Developer ID + notarisation pipeline
// is set up.

const { execSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  // --force re-signs the bundle, --deep walks helper apps + frameworks,
  // and `-` is the ad-hoc identity (no Developer ID required).
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log(`[mac-adhoc-sign] ad-hoc signed ${appPath}`);
  } catch (err) {
    console.warn(`[mac-adhoc-sign] codesign failed:`, err.message);
  }
};

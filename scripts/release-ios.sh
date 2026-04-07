#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/release-ios.sh
#   bash scripts/release-ios.sh production
#
# This script:
# 1) Increments iOS build number (CFBundleVersion)
# 2) Creates a production EAS iOS build
# 3) Submits the latest build to TestFlight
#
# It uses EAS_NO_VCS=1 so your current local code is uploaded (not only last commit).

PROFILE="${1:-production}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [[ ! -d "ios" ]]; then
  echo "Error: ios directory not found. Run prebuild first."
  exit 1
fi

PLIST="$ROOT_DIR/ios/ambora/Info.plist"
if [[ ! -f "$PLIST" ]]; then
  echo "Error: Info.plist not found at $PLIST"
  exit 1
fi

CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PLIST")
NEW_BUILD=$((CURRENT_BUILD + 1))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD" "$PLIST"
echo "Incremented iOS build number: $CURRENT_BUILD -> $NEW_BUILD"

echo "Building iOS app with EAS (profile: $PROFILE)..."
EAS_NO_VCS=1 npx eas-cli build --platform ios --profile "$PROFILE" --non-interactive

echo "Submitting latest iOS build to TestFlight..."
EAS_NO_VCS=1 npx eas-cli submit --platform ios --profile "$PROFILE" --latest --non-interactive --wait

echo "Done. Check TestFlight processing status in App Store Connect."

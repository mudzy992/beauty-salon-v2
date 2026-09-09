#!/usr/bin/env bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_DIR="$ROOT/apk"
MOBILE_DIR="$ROOT/mobile"
MOBILE_CONFIG="$MOBILE_DIR/app.config.js"

read_mobile_meta() {
  MOBILE_CONFIG="$MOBILE_CONFIG" node -e "
    const c = require(process.env.MOBILE_CONFIG);
    const e = c.expo;
    process.stdout.write([e.slug, e.version, e.android.versionCode].join('|'));
  "
}

apk_filename() {
  local profile_label="$1"
  local slug version version_code
  IFS='|' read -r slug version version_code <<< "$(read_mobile_meta)"
  echo "${slug}-${version}(${version_code})-${profile_label}.apk"
}

rebuild_docker() {
  echo "==> Docker rebuild (no-cache) + up -d"
  (cd "$ROOT" && docker compose build --no-cache && docker compose up -d)
}

fix_packages() {
  for app in backend frontend mobile; do
    echo "==> Fix packages: $app"
    rm -rf "$ROOT/$app/node_modules"
    (cd "$ROOT/$app" && npm ci)
  done
  echo "==> Gotovo."
}

build_apk() {
  local eas_profile="$1"
  local profile_label="$2"
  local filename output

  filename="$(apk_filename "$profile_label")"
  mkdir -p "$APK_DIR"
  output="$APK_DIR/$filename"

  echo "==> EAS build: profile=$eas_profile"
  echo "==> Output: $output"

  (
    cd "$MOBILE_DIR" &&
      eas build \
        --profile "$eas_profile" \
        --platform android \
        --local \
        --output "$output" \
        --clear-cache
  )
}

run_expo_doctor() {
  echo "==> expo-doctor (mobile)"
  (cd "$MOBILE_DIR" && npx expo-doctor)
}

show_menu() {
  cat <<'EOF'

=== Beauty Salon v2 — Dev Menu ===
1) Rebuild Docker
2) Fix packages (npm ci)
3) Build APK (developer)
4) Build APK (production)
5) Expo Doctor (mobile)
0) Exit

EOF
}

main() {
  while true; do
    show_menu
    read -rp "Odabir: " choice
    echo ""

    case "$choice" in
      1) rebuild_docker || echo "Greška: Docker rebuild." ;;
      2) fix_packages || echo "Greška: Fix packages." ;;
      3) build_apk development dev || echo "Greška: APK build (dev)." ;;
      4) build_apk production prod || echo "Greška: APK build (prod)." ;;
      5) run_expo_doctor || echo "Greška: expo-doctor." ;;
      0|q|Q) exit 0 ;;
      *) echo "Neispravan odabir." ;;
    esac

    echo ""
    read -rp "Enter za nastavak..." _
  done
}

main "$@"

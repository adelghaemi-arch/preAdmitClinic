#!/usr/bin/env bash
# File: server/api/install-playwright-chromium.sh
# Description: نصب درایور لینوکس Playwright + Chromium برای PDF (UC-ADM-26)
# Parent Dependencies: publish/.playwright (package) ؛ در صورت publish ویندوز، درایور linux از NuGet گرفته می‌شود
set -euo pipefail

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}"
PW_VERSION="${PLAYWRIGHT_VERSION:-1.49.0}"
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"

if [[ ! -d /app/.playwright/package ]]; then
  echo "ERROR: /app/.playwright/package missing — dotnet publish must include Playwright assets" >&2
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) PLAT="linux-x64" ;;
  aarch64|arm64) PLAT="linux-arm64" ;;
  *)
    echo "ERROR: unsupported arch: $ARCH" >&2
    exit 1
    ;;
esac

NODE="/app/.playwright/node/${PLAT}/node"
CLI="/app/.playwright/package/cli.js"

ensure_linux_driver() {
  # فایل از ویندوز publish معمولاً بدون +x می‌آید؛ وجود فایل کافی است
  if [[ -f "$NODE" ]]; then
    chmod +x "$NODE"
    echo "OK: Linux Playwright driver present: $NODE"
    return 0
  fi

  echo "WARN: $NODE missing (publish was likely Windows-only). Fetching ${PLAT} driver from NuGet ${PW_VERSION}..."
  local tmp="/tmp/pw-nupkg-$$"
  mkdir -p "$tmp"
  curl -fsSL \
    "https://api.nuget.org/v3-flatcontainer/microsoft.playwright/${PW_VERSION}/microsoft.playwright.${PW_VERSION}.nupkg" \
    -o "$tmp/pw.nupkg"
  unzip -q "$tmp/pw.nupkg" -d "$tmp/ext"
  local src="$tmp/ext/.playwright/node/${PLAT}/node"
  if [[ ! -f "$src" ]]; then
    echo "ERROR: linux driver not found inside nupkg at $src" >&2
    find "$tmp/ext" -name 'node' -type f 2>/dev/null | head -n 20 >&2 || true
    exit 1
  fi
  mkdir -p "/app/.playwright/node/${PLAT}"
  cp -f "$src" "$NODE"
  chmod +x "$NODE"
  if [[ -f "$tmp/ext/.playwright/node/LICENSE" ]]; then
    cp -f "$tmp/ext/.playwright/node/LICENSE" /app/.playwright/node/LICENSE
  fi
  rm -rf "$tmp"
  echo "OK: installed Linux driver to $NODE"
}

ensure_linux_driver

if [[ ! -f "$CLI" ]]; then
  echo "ERROR: Playwright CLI missing at $CLI" >&2
  exit 1
fi

# اگر لایهٔ Docker از کش آمده یا browser از قبل هست، دوباره CDN را نکش
if find "${PLAYWRIGHT_BROWSERS_PATH}" -mindepth 1 -maxdepth 2 -type d 2>/dev/null | grep -qi chromium; then
  echo "OK: Chromium already under ${PLAYWRIGHT_BROWSERS_PATH} — skip download"
  ls -la "${PLAYWRIGHT_BROWSERS_PATH}"
  exit 0
fi

echo "Installing Chromium via $NODE $CLI ..."
"$NODE" "$CLI" install chromium

if ! find "${PLAYWRIGHT_BROWSERS_PATH}" -mindepth 1 -maxdepth 2 -type d 2>/dev/null | grep -qi chromium; then
  echo "ERROR: Chromium not found under ${PLAYWRIGHT_BROWSERS_PATH} after install" >&2
  ls -la "${PLAYWRIGHT_BROWSERS_PATH}" >&2 || true
  exit 1
fi

echo "OK: Chromium installed under ${PLAYWRIGHT_BROWSERS_PATH}"
ls -la "${PLAYWRIGHT_BROWSERS_PATH}"

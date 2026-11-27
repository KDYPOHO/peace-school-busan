#!/usr/bin/env bash
set -euo pipefail

api=${1:?Android API level required}
name="peace-school-api$api"
image="system-images;android-$api;google_apis;x86_64"
evidence="$RUNNER_TEMP/$name"
sdkmanager_bin=$(find "$ANDROID_HOME/cmdline-tools" -type f -name sdkmanager | sort -V | tail -1)
test -n "$sdkmanager_bin"
sudo chmod 666 /dev/kvm
"$sdkmanager_bin" --sdk_root="$ANDROID_HOME" emulator "$image"

export ANDROID_USER_HOME="$evidence/android-user"
export ANDROID_AVD_HOME="$ANDROID_USER_HOME/avd"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
mkdir -p "$ANDROID_AVD_HOME"
printf 'no\n' | "$(dirname "$sdkmanager_bin")/avdmanager" create avd --force -n "$name" -k "$image" -p "$ANDROID_AVD_HOME/$name.avd"
emulator -list-avds | grep -Fx "$name"
emulator -avd "$name" -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect >"$evidence/emulator.log" 2>&1 &
export emulator_pid=$!
cleanup() {
  adb emu kill >/dev/null 2>&1 || true
  kill "$emulator_pid" 2>/dev/null || true
  wait "$emulator_pid" 2>/dev/null || true
}
trap cleanup EXIT
timeout 240 bash -c 'until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")" = 1 ]; do kill -0 "$emulator_pid" || exit 1; sleep 2; done'
adb shell input keyevent 82
adb shell getprop ro.build.version.sdk | tr -d '\r' | grep -Fx "$api"
{
  adb shell dumpsys webviewupdate
  if [[ "$api" -eq 24 ]]; then
    adb shell dumpsys package com.google.android.webview | grep -E 'Package \[|versionName=' || true
    adb shell dumpsys package com.android.chrome | grep -E 'Package \[|versionName=' || true
  fi
} | tee "$evidence/webview.txt"
if [[ "$api" -ge 30 ]]; then
  adb shell cmd connectivity airplane-mode enable
fi
cd android
rm -rf app/build/outputs/androidTest-results/connected
status=0
timeout --kill-after=15s 240s ./gradlew :app:connectedDebugAndroidTest --no-daemon \
  -Pandroid.testInstrumentationRunnerArguments.class=kr.busan.peaceschool.AppLaunchTest || status=$?
if [[ "$status" -ne 0 ]]; then
  timeout 15s adb logcat -d -t 1000 >"$evidence/device-logcat.log" 2>&1 || true
  if [[ "$status" -eq 124 || "$status" -eq 137 ]]; then
    echo "::error::Android API $api instrumentation exceeded four minutes. See android-emulator-evidence."
  fi
fi
if [[ -d app/build/outputs/androidTest-results/connected ]]; then
  cp -R app/build/outputs/androidTest-results/connected "$evidence/"
fi
exit "$status"

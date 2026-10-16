#!/usr/bin/env bash
# Restart this checkout's development Desktop app.
#
# A build runs only when source inputs changed after the last build that this
# script completed, or when a required artifact is missing. The completed-build
# records live in apps/desktop/.desktop-build, so `pnpm run clean` forces a full
# build on the next run.
#
# Usage: ./restart-desktop.sh [--force] [--check]
#   --force  rebuild the repository and the Desktop shell regardless of the records
#   --check  print the rebuild decision without stopping or building anything

set -euo pipefail

root=$(cd "$(dirname "$0")" && pwd)
cd "$root"

force=0
check_only=0
for arg in "$@"; do
  case "$arg" in
    --force) force=1 ;;
    --check) check_only=1 ;;
    *) echo "restart-desktop: unknown argument: $arg" >&2; exit 2 ;;
  esac
done

state_dir="$root/apps/desktop/.desktop-build"
repo_record="$state_dir/restart-repo-build.stamp"
desktop_record="$state_dir/restart-desktop-build.stamp"

# Trees that feed the repository build. apps/desktop has its own shell build.
repo_roots=(packages vendor native scripts)
for dir in apps/*; do
  [[ "$dir" == apps/desktop ]] && continue
  repo_roots+=("$dir")
done

# Prints the first source file under the given paths that is newer than the record.
# Build outputs are pruned by name; no source directory in this repository is named lib.
first_changed_since() {
  local record=$1
  shift
  find "$@" \
    \( -name node_modules -o -name lib -o -name dist -o -name .desktop-build -o -name tests -o -name coverage \) -prune -o \
    -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.json' \
      -o -name '*.css' -o -name '*.html' -o -name '*.yaml' -o -name '*.yml' -o -name '*.rs' -o -name '*.c' \
      -o -name '*.cc' -o -name '*.h' -o -name '*.cpp' \) \
    -newer "$record" -print -quit 2>/dev/null || true
}

# Prints a changed root-level manifest or config file newer than the record.
root_file_changed_since() {
  find . -maxdepth 1 -type f \
    \( -name package.json -o -name 'pnpm-lock.yaml' -o -name 'pnpm-workspace.yaml' \
      -o -name 'tsconfig*.json' -o -name tsdown.config.ts \) \
    -newer "$1" -print -quit 2>/dev/null || true
}

repo_artifacts_present() {
  [[ -f apps/desktop/lib/main.js && -f apps/desktop-host/lib/index.js && -f apps/web/dist/index.html ]]
}

repo_reason=""
if (( force )); then
  repo_reason="--force"
elif [[ ! -f "$repo_record" ]]; then
  repo_reason="no completed build record"
elif ! repo_artifacts_present; then
  repo_reason="build artifacts are missing"
else
  changed=$(first_changed_since "$repo_record" "${repo_roots[@]}")
  [[ -z "$changed" ]] && changed=$(root_file_changed_since "$repo_record")
  [[ -n "$changed" ]] && repo_reason="changed since last build: ${changed#./}"
fi

desktop_reason=""
if [[ -n "$repo_reason" ]]; then
  desktop_reason="repository rebuilt"
elif (( force )); then
  desktop_reason="--force"
elif [[ ! -f "$desktop_record" ]]; then
  desktop_reason="no completed build record"
else
  changed=$(first_changed_since "$desktop_record" apps/desktop)
  [[ -n "$changed" ]] && desktop_reason="changed since last build: ${changed#./}"
fi

describe() {
  if [[ -n "$1" ]]; then echo "build needed ($1)"; else echo "up to date, skipped"; fi
}
echo "restart-desktop: repository build: $(describe "$repo_reason")"
echo "restart-desktop: desktop shell build: $(describe "$desktop_reason")"

if (( check_only )); then
  exit 0
fi

# Lists PIDs of this checkout's Harness Dev app processes (main, renderer, GPU, and host).
desktop_pids() {
  local pid
  for pid in $(pgrep -f 'Harness Dev\.app/Contents/' || true); do
    if ps -o command= -p "$pid" | grep -qF "$root/"; then
      echo "$pid"
    fi
  done
}

# Stops this checkout's Desktop app and its dev launcher, which runs from apps/desktop
# or the repository root and may be the only parent of the app.
stop_desktop() {
  local pid cwd i
  for pid in $(desktop_pids); do kill -TERM "$pid" 2>/dev/null || true; done
  for pid in $(pgrep -f 'scripts/dev(-web)?\.ts' || true); do
    cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' || true)
    case "$cwd" in
      "$root"|"$root/apps/desktop") kill -TERM "$pid" 2>/dev/null || true ;;
    esac
  done
  for i in $(seq 1 15); do
    if [[ -z "$(desktop_pids)" ]]; then return 0; fi
    sleep 1
  done
  for pid in $(desktop_pids); do kill -KILL "$pid" 2>/dev/null || true; done
}

echo "restart-desktop: stopping the running Desktop app"
stop_desktop

mkdir -p "$state_dir"

# The pending file's mtime marks the build start. A source edit made during the build is
# newer than the record, so the next run rebuilds it. The record replaces it only on success.
if [[ -n "$repo_reason" ]]; then
  echo "restart-desktop: building the repository"
  : > "$state_dir/restart-repo-build.pending"
  pnpm run build
  mv -f "$state_dir/restart-repo-build.pending" "$repo_record"
fi

if [[ -n "$repo_reason" || -n "$desktop_reason" ]]; then
  echo "restart-desktop: building the Desktop shell"
  : > "$state_dir/restart-desktop-build.pending"
  pnpm --filter @deepseek-ai/dsh-desktop run build
  mv -f "$state_dir/restart-desktop-build.pending" "$desktop_record"
fi

echo "restart-desktop: launching Desktop"
exec pnpm run start:desktop

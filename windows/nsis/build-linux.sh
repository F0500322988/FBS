#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 2 ]; then
  echo 'Usage: bash windows/nsis/build-linux.sh <verified-role-stage-root> <output-directory>' >&2
  exit 2
fi
fbs_builder_root="$(cd "$(dirname "$0")" && pwd)"
fbs_stage_root="$(realpath "$1")"
mkdir -p "$2"
fbs_output_root="$(realpath "$2")"
if [ -n "$(find "$fbs_output_root" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo 'Choose a fresh, empty output directory.' >&2
  exit 2
fi
fbs_release_stage="${FBS_RELEASE_STAGE:-M170}"
if [[ ! "$fbs_release_stage" =~ ^M[0-9]+$ ]]; then echo "Invalid release stage" >&2; exit 2; fi
fbs_ca_bundle="${FBS_BUILD_CA_BUNDLE:-/etc/ssl/certs/ca-certificates.crt}"
for fbs_role in Teacher Student; do
  if [ -e "$fbs_output_root/FBS-Classroom-$fbs_role-$fbs_release_stage-Setup-PREVIEW.exe" ]; then
    echo 'Choose a fresh output directory to avoid stale or overwritten installer files.' >&2
    exit 2
  fi
done
node "$fbs_builder_root/prepare-manifests.js" "$fbs_stage_root"
fbs_docker=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
"${fbs_docker[@]}" build --secret "id=proxy_ca,src=$fbs_ca_bundle" -t fbs-nsis-tools:local "$fbs_builder_root"
for fbs_role in Teacher Student; do
  "${fbs_docker[@]}" run --rm --network none --cap-drop ALL --security-opt no-new-privileges \
    --user "$(id -u):$(id -g)" \
    --mount "type=bind,src=$fbs_builder_root,dst=/builder,readonly" \
    --mount "type=bind,src=$fbs_stage_root,dst=/stage,readonly" \
    --mount "type=bind,src=$fbs_output_root,dst=/out" \
    fbs-nsis-tools:local makensis -V3 -DStageRoot=/stage -DOutputRoot=/out \
    "-DRole=$fbs_role" "-DReleaseStage=$fbs_release_stage" "-DDeleteManifest=/stage/delete-$fbs_role.nsh" /builder/Installer.nsi
done
for fbs_role in Teacher Student; do
  "${fbs_docker[@]}" run --rm --network none --cap-drop ALL --security-opt no-new-privileges \
    --user "$(id -u):$(id -g)" --mount "type=bind,src=$fbs_output_root,dst=/out" \
    fbs-nsis-tools:local 7z x "/out/FBS-Classroom-$fbs_role-$fbs_release_stage-Setup-PREVIEW.exe" \
    "-o/out/extracted-$fbs_role" -y
done
node "$fbs_builder_root/verify-payload.js" "$fbs_stage_root" "$fbs_output_root" "$fbs_release_stage"

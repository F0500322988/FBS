param([string]$OutputDirectory = ".\certs")
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) { throw "OpenSSL is required. Install OpenSSL and retry." }
& $openssl.Source req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 -keyout "$OutputDirectory\teacher-key.pem" -out "$OutputDirectory\teacher-cert.pem" -subj "/CN=FBS-Classroom-Teacher"
if ($LASTEXITCODE -ne 0) { throw "Certificate generation failed" }
Write-Host "Keep teacher-key.pem private; do not distribute it to students."

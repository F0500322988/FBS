param([string]$Profile)
$ErrorActionPreference='Stop'
try {
    if ([string]::IsNullOrWhiteSpace($Profile)) {
        Add-Type -AssemblyName System.Windows.Forms
        $dialog=New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Title='اختر lab-profile.json من حزمة المعلم الخاصة'
        $dialog.Filter='Lab profile (lab-profile.json)|lab-profile.json|JSON files (*.json)|*.json'
        $dialog.CheckFileExists=$true
        if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }
        $Profile=$dialog.FileName
        $dialog.Dispose()
    }
    & (Join-Path $PSScriptRoot 'FBS-LabSetup-Windows.exe') import $Profile
    if ($LASTEXITCODE -ne 0) { throw 'Student setup did not complete.' }
    exit 0
} catch {
    Write-Host 'تعذر الاستيراد. أغلق تطبيق الطالب وشغّل الأداة بحساب الطالب نفسه، وتحقق من ملف المعلم وإعدادات الطالب الموجودة.'
    Read-Host 'اضغط Enter للإغلاق' | Out-Null
    exit 1
}

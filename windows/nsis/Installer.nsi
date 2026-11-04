Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"

!ifndef StageRoot
  !error "StageRoot is required"
!endif
!ifndef OutputRoot
  !error "OutputRoot is required"
!endif
!ifndef Role
  !error "Role is required"
!endif
!ifndef DeleteManifest
  !error "DeleteManifest is required"
!endif

!if "${Role}" == "Teacher"
  !define AppTitle "FBS Classroom Teacher Preview"
  !define AppExe "FBS.Teacher.exe"
  !define RegistryRoot HKLM
  !define UninstallKey "Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Teacher.Preview"
  RequestExecutionLevel admin
  InstallDir "$PROGRAMFILES64\FBS Classroom Teacher"
!else if "${Role}" == "Student"
  !define AppTitle "FBS Classroom Student Preview"
  !define AppExe "FBS.Student.Native.exe"
  !define RegistryRoot HKCU
  !define UninstallKey "Software\Microsoft\Windows\CurrentVersion\Uninstall\FBSClassroom.Student.Preview"
  RequestExecutionLevel user
  InstallDir "$LOCALAPPDATA\Programs\FBS Classroom Student"
!else
  !error "Role must be Teacher or Student"
!endif

!ifndef ReleaseStage
  !define ReleaseStage "M170"
!endif

Name "${AppTitle}"
OutFile "${OutputRoot}/FBS-Classroom-${Role}-${ReleaseStage}-Setup-PREVIEW.exe"
InstallDirRegKey ${RegistryRoot} "${UninstallKey}" "InstallLocation"
SetCompressor /SOLID lzma
SetCompressorDictSize 32
CRCCheck force
ManifestDPIAware true
VIProductVersion "0.178.0.0"
VIAddVersionKey "ProductName" "${AppTitle}"
VIAddVersionKey "ProductVersion" "0.178.0-preview"
VIAddVersionKey "FileDescription" "FBS Classroom ${Role} installer"
VIAddVersionKey "FileVersion" "0.178.0.0"
VIAddVersionKey "LegalCopyright" "FBS Classroom contributors"
BrandingText "FBS Classroom - Windows Preview"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Arabic"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "يلزم Windows بمعمارية 64 بت."
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "يلزم Windows 10 أو Windows 11 لتشغيل هذه النسخة."
    Abort
  ${EndIf}
FunctionEnd

Function SetShellContext
  !if "${Role}" == "Teacher"
    SetShellVarContext all
  !else
    SetShellVarContext current
  !endif
  SetRegView 64
FunctionEnd

Function un.SetShellContext
  !if "${Role}" == "Teacher"
    SetShellVarContext all
  !else
    SetShellVarContext current
  !endif
  SetRegView 64
FunctionEnd

Section "Install"
  Call SetShellContext
  ; Never overwrite an existing application or an unrelated nonempty folder.
  ClearErrors
  FindFirst $0 $1 "$INSTDIR\*.*"
  IfErrors empty_target
  check_target:
    StrCmp $1 "" target_checked
    StrCmp $1 "." target_next
    StrCmp $1 ".." target_next
    FindClose $0
    MessageBox MB_ICONSTOP "مجلد التثبيت غير فارغ. أزل النسخة السابقة أولًا أو اختر مجلدًا فارغًا. بيانات المستخدم المحفوظة خارج مجلد البرنامج ستبقى محفوظة."
    SetErrorLevel 2
    Abort
  target_next:
    FindNext $0 $1
    Goto check_target
  target_checked:
    FindClose $0
  empty_target:
  ClearErrors
  SetOutPath "$INSTDIR\${Role}"
  File /r "${StageRoot}/${Role}/${Role}/*"
  SetOutPath "$INSTDIR\Runtime"
  File /r "${StageRoot}/${Role}/Runtime/*"
  !if "${Role}" == "Student"
    SetOutPath "$INSTDIR"
    File "${StageRoot}/Student/Configure-Student.ps1"
  !endif
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr ${RegistryRoot} "${UninstallKey}" "DisplayName" "${AppTitle}"
  WriteRegStr ${RegistryRoot} "${UninstallKey}" "DisplayVersion" "0.178.0-preview"
  WriteRegStr ${RegistryRoot} "${UninstallKey}" "Publisher" "FBS Classroom"
  WriteRegStr ${RegistryRoot} "${UninstallKey}" "InstallLocation" "$INSTDIR"
  WriteRegStr ${RegistryRoot} "${UninstallKey}" "DisplayIcon" "$INSTDIR\${Role}\${AppExe}"
  WriteRegStr ${RegistryRoot} "${UninstallKey}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegDWORD ${RegistryRoot} "${UninstallKey}" "NoModify" 1
  WriteRegDWORD ${RegistryRoot} "${UninstallKey}" "NoRepair" 1
  CreateDirectory "$SMPROGRAMS\${AppTitle}"
  CreateShortcut "$SMPROGRAMS\${AppTitle}\${AppTitle}.lnk" "$INSTDIR\${Role}\${AppExe}" "" "$INSTDIR\${Role}\${AppExe}"
  CreateShortcut "$SMPROGRAMS\${AppTitle}\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  ; No automatic launch, startup registration, firewall changes or enrollment.
SectionEnd

Section "Uninstall"
  Call un.SetShellContext
  ; Delete only files packaged by this build. Unknown files and LocalAppData stay.
  !include "${DeleteManifest}"
  Delete "$SMPROGRAMS\${AppTitle}\${AppTitle}.lnk"
  Delete "$SMPROGRAMS\${AppTitle}\Uninstall.lnk"
  RMDir "$SMPROGRAMS\${AppTitle}"
  DeleteRegKey ${RegistryRoot} "${UninstallKey}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  ClearErrors
  SetErrorLevel 0
SectionEnd

#define AppVersion "0.170.0-preview"
[Setup]
AppId={{07EBA831-935F-4C1E-93C4-FA5D18490B18}
AppName=FBS Classroom Student Preview
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\FBS Classroom Student
DefaultGroupName=FBS Classroom
OutputDir=..\..\release\installers
OutputBaseFilename=FBS-Classroom-Student-Setup-PREVIEW
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
UninstallDisplayIcon={app}\Student\FBS.Student.Native.exe
[Files]
Source: "..\..\release\Student\*"; DestDir: "{app}\Student"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\..\release\Runtime\*"; DestDir: "{app}\Runtime"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\Configure-Student.ps1"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{group}\FBS Classroom Student"; Filename: "{app}\Student\FBS.Student.Native.exe"
[Run]
; Start manually after completing the per-user connection setup.
; Run Configure-Student.ps1 once as the student Windows user, then relaunch.
; Screen capture still requires the student to opt in through the local browser.

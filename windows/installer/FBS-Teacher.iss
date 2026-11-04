#define AppVersion "0.170.0-preview"
[Setup]
AppId={{E10E4E53-53D5-4E9E-8D3A-8EDE6E180B91}
AppName=FBS Classroom Teacher Preview
AppVersion={#AppVersion}
DefaultDirName={autopf}\FBS Classroom Teacher
DefaultGroupName=FBS Classroom
OutputDir=..\..\release\installers
OutputBaseFilename=FBS-Classroom-Teacher-Setup-PREVIEW
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\Teacher\FBS.Teacher.exe
[Files]
Source: "..\..\release\Teacher\*"; DestDir: "{app}\Teacher"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\..\release\Runtime\*"; DestDir: "{app}\Runtime"; Flags: recursesubdirs createallsubdirs ignoreversion
[Icons]
Name: "{group}\FBS Classroom Teacher"; Filename: "{app}\Teacher\FBS.Teacher.exe"
Name: "{autodesktop}\FBS Classroom Teacher"; Filename: "{app}\Teacher\FBS.Teacher.exe"; Tasks: desktopicon
[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"
[Run]
; Teacher requires TLS certificate, pairing key and password to be configured before launch.

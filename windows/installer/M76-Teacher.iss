#ifndef StageRoot
  #error StageRoot must be provided with /DStageRoot=...
#endif
#define Stage AddBackslash(StageRoot) + "Teacher"
[Setup]
#ifdef BuildSetupX64
SetupArchitecture=x64
#endif
AppId={{E10E4E53-53D5-4E9E-8D3A-8EDE6E180B91}
AppName=FBS Classroom Teacher Preview
AppVersion=0.170.0-preview
DefaultDirName={autopf}\FBS Classroom Teacher
DefaultGroupName=FBS Classroom
OutputDir={#StageRoot}
OutputBaseFilename=FBS-Classroom-Teacher-M170-Setup-PREVIEW
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\Teacher\FBS.Teacher.exe
[Files]
Source: "{#Stage}\Teacher\*"; DestDir: "{app}\Teacher"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#Stage}\Runtime\*"; DestDir: "{app}\Runtime"; Flags: recursesubdirs createallsubdirs ignoreversion
[Icons]
Name: "{group}\FBS Classroom Teacher"; Filename: "{app}\Teacher\FBS.Teacher.exe"
[Run]
; No automatic launch: administrator must configure credentials and TLS securely.

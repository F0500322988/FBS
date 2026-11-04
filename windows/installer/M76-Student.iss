#ifndef StageRoot
  #error StageRoot must be provided with /DStageRoot=...
#endif
#define Stage AddBackslash(StageRoot) + "Student"
[Setup]
#ifdef BuildSetupX64
SetupArchitecture=x64
#endif
AppId={{07EBA831-935F-4C1E-93C4-FA5D18490B18}
AppName=FBS Classroom Student Preview
AppVersion=0.170.0-preview
DefaultDirName={localappdata}\Programs\FBS Classroom Student
DefaultGroupName=FBS Classroom
OutputDir={#StageRoot}
OutputBaseFilename=FBS-Classroom-Student-M170-Setup-PREVIEW
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
[Files]
Source: "{#Stage}\Student\*"; DestDir: "{app}\Student"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#Stage}\Runtime\*"; DestDir: "{app}\Runtime"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#Stage}\Configure-Student.ps1"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{group}\FBS Classroom Student"; Filename: "{app}\Student\FBS.Student.Native.exe"
[Run]
; No automatic startup until the user configures pairing and verifies consent UI.

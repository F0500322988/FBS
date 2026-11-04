# FBS Student Native (M10)
Windows Forms .NET 8 application; Arabic status window and tray icon.

Build on Windows with .NET 8 SDK:
`dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true`

Run the resulting executable on a test Windows 11 PC. This is a native UI **scaffold only**:
there is no network listener, no remote control, and no SendInput implementation.
The previous Node.js student agent is still needed for LAN discovery and screen previews.
The stop button is disabled until a future authenticated session is actually started.
No Windows installer is generated in this package.

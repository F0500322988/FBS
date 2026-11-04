# FBS Classroom M114 — Zoom & Focus Seat Map

## What's new
- Seat map zoom levels 75–150% with +/- buttons.
- Focus on a selected device, highlighting its seat and showing connection state.
- Horizontal scrolling for wide 40-device layouts.
- No change to student agents, approval, remote input, or network commands.

## Windows test
1. Back up M113, unpack M114 and update the teacher's public assets or rebuild the teacher package.
2. Start the teacher server and students, open **مراقبة الأجهزة**, enable **عرض مخطط المقاعد**.
3. Select 5 rows x 8 columns, try zoom in/out and device focus.
4. Disconnect/reconnect a test student; check its state remains correct.
5. Run `node --test` in project root.

Note: This is source code, not a rebuilt Windows EXE or macOS package. Physical Windows testing remains necessary.

# FBS Classroom M113 — Drag-and-drop seat assignment

## Windows 11 manual test
1. Back up the previous M112 project and local browser seat-map JSON.
2. Use this complete project source to update/rebuild the teacher UI (the ZIP is **not** a Windows EXE).
3. Start the teacher server and enrolled students as in M112.
4. Open **مراقبة الأجهزة**, enable **عرض مخطط المقاعد**.
5. Drag a device card to an empty seat; confirm its new position survives page refresh.
6. Drag a manually assigned device onto another manually assigned device's seat; verify the two assignments swap.
7. Use the seat dropdown to assign devices without drag-and-drop (keyboard-accessible fallback).
8. Export/import seat map to verify the M111 backup continues to work.

Assignments are local to this browser. Drag-and-drop is presentation-only and does not send commands to student computers. The target seat is validated against the layout and the source device against the current roster. If an unassigned device is dragged onto an occupied manually assigned seat, the prior occupant becomes unassigned. This is not automatic physical seat detection. Remote input remains disabled.

Run `node --test` from the project root.

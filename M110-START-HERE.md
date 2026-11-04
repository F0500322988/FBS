# FBS Classroom M110 — Visual Seat Map

This milestone adds a **read-only, local-browser seating diagram** to the Arabic teacher dashboard. It is not a physical device-location detector.

1. Back up your M109 source and installed teacher package.
2. Unzip M110 and rebuild/redeploy the teacher UI using this version's `public` folder. Existing EXE files are **not** automatically updated.
3. Start the teacher server and open **مراقبة الأجهزة**.
4. Enable **عرض مخطط المقاعد**, choose rows and columns (3 × 7 by default).
5. Use the dropdown under each student to manually assign a seat. Layout settings are stored only in the current browser's localStorage.
6. Test by disconnecting/reconnecting a test student. The server must detect the change before the map reflects it.

The map uses the existing roster, search, priority filters and online status. Filtering changes which devices are visible and may temporarily shift automatically assigned seats; manually assigned positions are stable when their device is visible. If the number of visible devices exceeds capacity, the remainder are counted as **خارج المخطط**. No remote mouse/keyboard control is enabled. No native Windows EXE or macOS DMG/PKG is built in this milestone.

Run tests from the project root: `node --test`.

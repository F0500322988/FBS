import AppKit
@main @MainActor struct DashboardTests {
 static func main() throws {
  _ = NSApplication.shared
  let view=StudentDashboardView(frame:NSRect(x:0,y:0,width:340,height:422)), window=NSWindow(contentRect:view.bounds,styleMask:[.borderless],backing:.buffered,defer:false);window.contentView=view
  view.update(["connected":true,"approved":true,"deviceId":"PC-07","labName":"معمل Mac"]);view.layoutSubtreeIfNeeded()
  guard let bitmap=view.bitmapImageRepForCachingDisplay(in:view.bounds) else { fatalError("Offscreen dashboard bitmap unavailable") };view.cacheDisplay(in:view.bounds,to:bitmap)
  guard let data=bitmap.representation(using:.png,properties:[:]),bitmap.pixelsWide>=340,bitmap.pixelsHigh>=422 else { fatalError("Invalid dashboard snapshot") }
  try data.write(to:URL(fileURLWithPath:CommandLine.arguments[1]));view.disconnect();print("{\"offscreenDashboardRendered\":true,\"fixtureDataOnly\":true,\"userDeviceGuiTested\":false}")
 }
}

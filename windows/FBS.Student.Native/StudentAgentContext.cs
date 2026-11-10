using System.Windows.Forms;

namespace FBS.Student.Native;

// A normal, named per-user agent. Session/permission indicators remain separate windows.
internal sealed class StudentAgentContext : ApplicationContext
{
    private static string StopName => @"Local\FBS.Classroom.StudentAgent.Stop." + System.Security.Principal.WindowsIdentity.GetCurrent().User!.Value;
    private readonly System.Threading.EventWaitHandle stop = new(false, System.Threading.EventResetMode.AutoReset, StopName);
    private System.Threading.RegisteredWaitHandle? stopWait;
    private bool disposed;
    internal static int RequestStop()
    {
        try { using var signal = System.Threading.EventWaitHandle.OpenExisting(StopName); signal.Set(); }
        catch (System.Threading.WaitHandleCannotBeOpenedException) { return 0; }
        try
        {
            using var instance = System.Threading.Mutex.OpenExisting(@"Local\FBS.Classroom.StudentAgent");
            try { if (!instance.WaitOne(10000)) return 2; }
            catch (System.Threading.AbandonedMutexException) { return 0; }
            instance.ReleaseMutex();
        }
        catch (System.Threading.WaitHandleCannotBeOpenedException) { }
        return 0;
    }
    private readonly StudentStatusForm controller = new(backgroundAgent: true);
    private readonly System.Windows.Forms.Timer retry = new() { Interval = 15000 };
    internal StudentAgentContext()
    {
        _ = controller.Handle;
        stopWait = System.Threading.ThreadPool.RegisterWaitForSingleObject(stop, (_, _) => {
            if (!disposed) try { controller.BeginInvoke((Action)ExitThread); } catch (InvalidOperationException) { }
        }, null, System.Threading.Timeout.Infinite, true);
        controller.BeginInvoke((Action)(async () => await controller.StartNetworkAgentAsync()));
        retry.Tick += async (_, _) => await controller.StartNetworkAgentAsync();
        retry.Start();
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing && !disposed) { disposed = true; stopWait?.Unregister(null); stop.Dispose(); retry.Stop(); retry.Dispose(); controller.Close(); controller.Dispose(); }
        base.Dispose(disposing);
    }
}

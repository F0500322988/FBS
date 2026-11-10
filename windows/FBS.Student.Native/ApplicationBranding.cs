using System.Drawing;

namespace FBS.Student.Native;

public static class ApplicationBranding
{
    public static Icon LoadIcon()
    {
        using var stream = typeof(ApplicationBranding).Assembly.GetManifestResourceStream("FBS.Classroom.Icon")
            ?? throw new InvalidDataException("FBS Classroom icon resource is missing.");
        using var icon = new Icon(stream);
        return (Icon)icon.Clone();
    }
}

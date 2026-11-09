namespace FBS.Student.Native;

public static class CredentialPolicy
{
    public static string NormalizeDigits(string value) => new(value.Select(c =>
        c >= '\u0660' && c <= '\u0669' ? (char)('0' + c - '\u0660') :
        c >= '\u06f0' && c <= '\u06f9' ? (char)('0' + c - '\u06f0') : c).ToArray());
    public static bool IsPin(string? value) => value is { Length: >= 3 and <= 8 } && value.All(c => c >= '0' && c <= '9');
    public static bool IsStoredKey(string? value) => IsPin(value) || (!string.IsNullOrWhiteSpace(value) && value.Length >= 16);
    public static bool IsStoredPassword(string? value) => IsPin(value) || (!string.IsNullOrWhiteSpace(value) && value.Length >= 12);
}

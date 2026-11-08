using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

// One bounded message per invocation. No network, note access or arbitrary command API.
internal static class Program {
    private const int MaxBytes = 8192;
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = MaxBytes, RecursionLimit = 8 };
    private static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);

    private static int Main(string[] args) {
        object reply;
        try {
            string directory = AppDomain.CurrentDomain.BaseDirectory;
            var config = ReadObject(Path.Combine(directory, "bridge-config.json"));
            Require(Text(config, "owner") == "heptafloat-native-config-v1", "Bridge configuration is invalid.");
            string origin = Text(config, "origin");
            Require(Regex.IsMatch(origin, @"\Achrome-extension://[a-p]{32}/\z"), "Bridge origin is invalid.");
            Require(args.Length >= 1 && args.Length <= 2 && args[0] == origin, "Caller is not allowed.");
            if (args.Length == 2) Require(Regex.IsMatch(args[1], @"\A--parent-window=\d+\z"), "Caller arguments are invalid.");
            var request = ReadFrame(Console.OpenStandardInput());
            foreach (string key in request.Keys) Require(key == "action" || key == "spaceId" || key == "cardId" || key == "requestId", "Unknown request field.");
            Require(Text(request, "action") == "openCard", "Unsupported action.");
            string space = Id(request, "spaceId"), card = Id(request, "cardId");
            if (request.ContainsKey("requestId")) Id(request, "requestId");
            string root = SafePath(Text(config, "appInstallRoot"));
            var receipt = ReadObject(Path.Combine(root, "install-state.json"));
            Require(Text(receipt, "owner") == "heptafloat-protocol-install-v1" && receipt.ContainsKey("installed") && receipt["installed"] is bool && (bool)receipt["installed"], "HeptaFloat is not installed. Repair the desktop installation.");
            var versions = receipt.ContainsKey("versions") ? receipt["versions"] as IList : null;
            Require(versions != null && versions.Count > 0, "Desktop version is missing.");
            string version = versions[versions.Count - 1] as string;
            Require(version != null && Regex.IsMatch(version, @"\A\d+\.\d+\.\d+-win\.\d+\z"), "Desktop version is invalid.");
            string executable = SafePath(Path.Combine(root, version, "HeptaFloat.exe"));
            Require(executable.StartsWith(root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) && File.Exists(executable), "Desktop executable is missing.");
            Require(String.Equals(Text(receipt, "command"), "\"" + executable + "\" \"%1\"", StringComparison.OrdinalIgnoreCase), "Desktop receipt does not match the executable.");
            Environment.SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", null); // Current process/child only.
            Launch(executable, "flowhepta://card/" + card + "?space=" + space);
            reply = new { accepted = true }; // Process creation, never a renderer/card acknowledgement.
        } catch (BridgeError error) { reply = new { accepted = false, error = error.Message }; }
        catch { reply = new { accepted = false, error = "Cannot open the card. Repair the local bridge installation." }; }
        try { WriteFrame(Console.OpenStandardOutput(), reply); return 0; } catch { return 1; }
    }

    private static void Require(bool condition, string error) { if (!condition) throw new BridgeError(error); }
    private sealed class BridgeError : Exception { public BridgeError(string text) : base(text) {} }
    private static string Text(Dictionary<string, object> value, string key) {
        object result; Require(value.TryGetValue(key, out result) && result is string, "Required field is missing or invalid.");
        return (string)result;
    }
    private static string Id(Dictionary<string, object> request, string key) {
        Guid value; Require(Guid.TryParseExact(Text(request, key), "D", out value), "Card identifiers are invalid.");
        return value.ToString("D");
    }
    private static string SafePath(string input) {
        Require(Path.IsPathRooted(input), "Installed path must be absolute.");
        string full = Path.GetFullPath(input).TrimEnd(Path.DirectorySeparatorChar);
        Require(!full.StartsWith(@"\\", StringComparison.Ordinal), "Network or device installation paths are not allowed.");
        Require(full.Length > Path.GetPathRoot(full).TrimEnd(Path.DirectorySeparatorChar).Length, "Installed path cannot be a drive root.");
        for (string current = full; !String.IsNullOrEmpty(current); current = Path.GetDirectoryName(current)) {
            if (File.Exists(current) || Directory.Exists(current)) Require((File.GetAttributes(current) & FileAttributes.ReparsePoint) == 0, "Linked installation paths are not allowed.");
        }
        return full;
    }
    private static Dictionary<string, object> ReadObject(string file) {
        SafePath(file); Require(File.Exists(file) && new FileInfo(file).Length <= MaxBytes, "Bridge or desktop configuration is missing or too large.");
        var result = Json.DeserializeObject(File.ReadAllText(file, Utf8)) as Dictionary<string, object>;
        Require(result != null, "Configuration is invalid."); return result;
    }
    private static byte[] ReadExact(Stream input, int length) {
        var result = new byte[length]; int offset = 0;
        while (offset < length) { int read = input.Read(result, offset, length - offset); Require(read > 0, "Message is incomplete."); offset += read; }
        return result;
    }
    private static Dictionary<string, object> ReadFrame(Stream input) {
        byte[] header = ReadExact(input, 4); uint size = BitConverter.ToUInt32(header, 0);
        Require(size > 0 && size <= MaxBytes, "Message size is invalid.");
        var result = Json.DeserializeObject(Utf8.GetString(ReadExact(input, (int)size))) as Dictionary<string, object>;
        Require(result != null, "Message must be a JSON object."); return result;
    }
    private static void WriteFrame(Stream output, object value) {
        byte[] bytes = Utf8.GetBytes(Json.Serialize(value)), header = BitConverter.GetBytes(bytes.Length);
        output.Write(header, 0, header.Length); output.Write(bytes, 0, bytes.Length); output.Flush();
    }

    [StructLayout(LayoutKind.Sequential)] private struct SecurityAttributes { public int length; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct StartupInfo {
        public int cb; public string reserved, desktop, title; public int x, y, width, height, xChars, yChars, fill, flags;
        public short show, reservedBytes; public IntPtr reservedData, stdin, stdout, stderr;
    }
    [StructLayout(LayoutKind.Sequential)] private struct ProcessInformation { public IntPtr process, thread; public int processId, threadId; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern IntPtr CreateFile(string name, uint access, uint share, ref SecurityAttributes attributes, uint creation, uint flags, IntPtr template);
    [DllImport("kernel32.dll")] private static extern IntPtr GetStdHandle(int id);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool CreateProcess(string application, StringBuilder command, IntPtr processAttributes, IntPtr threadAttributes, bool inherit, uint flags, IntPtr environment, string directory, ref StartupInfo startup, out ProcessInformation information);
    private static void Launch(string executable, string uri) {
        // Do not leak Chrome's message pipes into a long-lived Electron child.
        foreach (int id in new int[] {-10, -11, -12}) {
            IntPtr handle = GetStdHandle(id);
            if (handle != IntPtr.Zero && handle != new IntPtr(-1)) Require(SetHandleInformation(handle, 1, 0), "Cannot isolate desktop output.");
        }
        var attributes = new SecurityAttributes { length = Marshal.SizeOf(typeof(SecurityAttributes)), inherit = true };
        IntPtr nul = CreateFile("NUL", 0xC0000000, 3, ref attributes, 3, 0, IntPtr.Zero);
        Require(nul != new IntPtr(-1), "Cannot prepare desktop output.");
        try {
            var startup = new StartupInfo { cb = Marshal.SizeOf(typeof(StartupInfo)), flags = 0x100, stdin = nul, stdout = nul, stderr = nul };
            ProcessInformation information;
            Require(CreateProcess(executable, new StringBuilder("\"" + executable + "\" \"" + uri + "\""), IntPtr.Zero, IntPtr.Zero, true, 0x08000000, IntPtr.Zero, Path.GetDirectoryName(executable), ref startup, out information), "Windows could not start HeptaFloat.");
            CloseHandle(information.thread); CloseHandle(information.process);
        } finally { CloseHandle(nul); }
    }
}

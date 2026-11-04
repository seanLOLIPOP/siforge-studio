using System;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows;
namespace SIForge.Native;
public class App : Application
{
    [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool SetForegroundWindow(IntPtr window);
    [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool ShowWindow(IntPtr window,int command);
    [STAThread] public static void Main()
    {
        var root=System.Environment.GetEnvironmentVariable("SI_WORKSPACE_ROOT")??AppContext.BaseDirectory;
        var name="Local\\SIForgeNative-"+Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar).ToLowerInvariant())));
        using var single=new Mutex(false,name);bool owns;
        try{owns=single.WaitOne(0);}catch(AbandonedMutexException){owns=true;}
        if(!owns){foreach(var process in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(System.Environment.ProcessPath))){try{if(process.Id!=System.Environment.ProcessId&&process.MainModule?.FileName==System.Environment.ProcessPath&&process.MainWindowHandle!=IntPtr.Zero){ShowWindow(process.MainWindowHandle,9);SetForegroundWindow(process.MainWindowHandle);break;}}catch{}}return;}
        try{
            var app=new App();
            app.DispatcherUnhandledException+=(_,e)=>{MessageBox.Show(e.Exception.Message,"SI FORGE STUDIO");e.Handled=true;};
            app.Run(new StudioWindow());
        }finally{single.ReleaseMutex();}
    }
}

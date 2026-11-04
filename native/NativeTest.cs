using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
namespace SIForge.Native;
public sealed partial class StudioWindow
{
    // Disabled in normal runs. Same-user named pipe for exercising real WPF controls in integration tests.
    string? testImportPath,testExportPath;
    [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool PrintWindow(IntPtr hwnd,IntPtr hdc,uint flags);
    void StartTestPipe()
    {
        var name=System.Environment.GetEnvironmentVariable("SI_NATIVE_TEST_PIPE");if(name==null||!System.Text.RegularExpressions.Regex.IsMatch(name,"^SIForgeTest[-a-zA-Z0-9]{1,60}$"))return;
        _=Task.Run(async()=>{while(true){try{using var pipe=new NamedPipeServerStream(name,PipeDirection.InOut,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous|PipeOptions.CurrentUserOnly);await pipe.WaitForConnectionAsync();using var reader=new StreamReader(pipe);using var writer=new StreamWriter(pipe){AutoFlush=true};string? line;while((line=await reader.ReadLineAsync())!=null){try{var command=JsonNode.Parse(line)!;var result=await Dispatcher.InvokeAsync(()=>TestCommand(command));await writer.WriteLineAsync(JsonSerializer.Serialize(new{ok=true,result}));}catch(Exception ex){await writer.WriteLineAsync(JsonSerializer.Serialize(new{ok=false,error=ex.Message}));}}}catch{return;}}});
    }
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]struct Rect{public int Left,Top,Right,Bottom;}
    [System.Runtime.InteropServices.DllImport("user32.dll")]static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
    async Task CaptureOwnWindow(string path)
    {
        await Task.Delay(160);var dpi=VisualTreeHelper.GetDpi(this);var handle=new System.Windows.Interop.WindowInteropHelper(this).Handle;GetWindowRect(handle,out var bounds);
        using var image=new System.Drawing.Bitmap(bounds.Right-bounds.Left,bounds.Bottom-bounds.Top);using var graphics=System.Drawing.Graphics.FromImage(image);var hdc=graphics.GetHdc();try{if(!PrintWindow(handle,hdc,2))throw new Exception("Could not capture app window.");}finally{graphics.ReleaseHdc(hdc);}
        if(browser.ActualWidth>10&&browser.ActualHeight>10){using var stream=new MemoryStream();await browser.CoreWebView2.CapturePreviewAsync(Microsoft.Web.WebView2.Core.CoreWebView2CapturePreviewImageFormat.Png,stream);stream.Position=0;using var web=System.Drawing.Image.FromStream(stream);var p=browser.PointToScreen(new Point(0,0));graphics.DrawImage(web,(int)p.X-bounds.Left,(int)p.Y-bounds.Top,web.Width,web.Height);}
        image.Save(path,System.Drawing.Imaging.ImageFormat.Png);
    }
    object? TestCommand(JsonNode c)
    {
        string op=S(c,"op"),id=S(c,"id");
        if(op=="state")return state?.DeepClone();
        if(op=="menu"){if(!nativeMenus.TryGetValue(id,out var menu))throw new Exception("Unavailable native menu.");menu.RaiseEvent(new RoutedEventArgs(MenuItem.ClickEvent));return null;}
        if(op=="pickers"){testImportPath=S(c,"import");testExportPath=S(c,"export");return null;}
        if(op=="inspect"){var all=new List<object>();void Walk(DependencyObject root){for(int i=0;i<VisualTreeHelper.GetChildrenCount(root);i++){var child=VisualTreeHelper.GetChild(root,i);if(child is FrameworkElement el&&el.IsVisible)all.Add(new{type=el.GetType().Name,id=System.Windows.Automation.AutomationProperties.GetAutomationId(el),text=el is Button b?(System.Windows.Automation.AutomationProperties.GetName(b) is string name&&name.Length>0?name:b.Content?.ToString()):el is TextBlock t?t.Text:el is TextBox input?input.Text:""});Walk(child);}}Walk(this);if(modal!=null)Walk(modal);return all;}
        if(op=="clickText"){
            var root=S(c,"area")=="rail"?(DependencyObject)rail:this;
            Button? Find(DependencyObject parent){for(int i=0;i<VisualTreeHelper.GetChildrenCount(parent);i++){var child=VisualTreeHelper.GetChild(parent,i);if(child is Button b&&b.IsVisible&&(b.Content?.ToString()==S(c,"text")||System.Windows.Automation.AutomationProperties.GetName(b)==S(c,"text")))return b;var nested=Find(child);if(nested!=null)return nested;}return null;}
            var button=Find(root)??throw new Exception("Native button unavailable: "+S(c,"text"));button.RaiseEvent(new RoutedEventArgs(System.Windows.Controls.Button.ClickEvent));return null;
        }
        if(op=="capture"){
            _ = CaptureOwnWindow(S(c,"path"));return null;
        }
        if(op=="close"){Close();return null;}
        if(!controls.TryGetValue(id,out var control))throw new Exception("Native control unavailable: "+id);
        if(op=="read")return control is TextBox textValue?textValue.Text:control is DockPanel colorValue?colorValue.Children.OfType<TextBox>().FirstOrDefault()?.Text:null;
        if(op=="set"){
            if(control is TextBox text){text.Focus();text.Text=S(c,"value");text.MoveFocus(new TraversalRequest(FocusNavigationDirection.Next));}
            else if(control is PasswordBox password)password.Password=S(c,"value");
            else if(control is ComboBox combo)combo.SelectedValue=S(c,"value");
            else if(control is CheckBox check){check.IsChecked=B(c,"value");check.RaiseEvent(new RoutedEventArgs(CheckBox.ClickEvent));}
            else throw new Exception("Native field does not support values: "+control.GetType().Name);
        }
        if(op=="click"){if(control is Button button)button.RaiseEvent(new RoutedEventArgs(System.Windows.Controls.Button.ClickEvent));else throw new Exception("Not a native button.");}
        return null;
    }
}

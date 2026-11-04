using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Shapes;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Microsoft.Win32;
namespace SIForge.Native;
public sealed partial class StudioWindow : Window
{
    readonly Workspace workspace=new();
    readonly Grid body=new(), tools=new();
    readonly StackPanel rail=new(), toolItems=new(){Orientation=Orientation.Horizontal},leftItems=new(),rightItems=new(),bottomItems=new();
    readonly ScrollViewer left=new(){VerticalScrollBarVisibility=ScrollBarVisibility.Auto},right=new(){VerticalScrollBarVisibility=ScrollBarVisibility.Auto},bottom=new(){VerticalScrollBarVisibility=ScrollBarVisibility.Auto};
    readonly ContentControl nativeCenter=new();
    readonly WebView2 browser=new();
    readonly TextBlock title=new(){Text="SI FORGE STUDIO",FontSize=13,FontWeight=FontWeights.SemiBold,Margin=new Thickness(12,0,12,0),VerticalAlignment=VerticalAlignment.Center},status=new(){Text="Starting local workspace…",Margin=new Thickness(12,5,12,5)};
    readonly Canvas graphCanvas=new(){Width=1900,Height=1100,Background=Brushes.Transparent};
    readonly ScrollViewer graph=new(){HorizontalScrollBarVisibility=ScrollBarVisibility.Auto,VerticalScrollBarVisibility=ScrollBarVisibility.Auto};
    readonly Dictionary<string,string> signatures=new();
    readonly Dictionary<string,FrameworkElement> controls=new();
    readonly Dictionary<string,string> selections=new();
    readonly Dictionary<string,MenuItem> nativeMenus=new();
    DockPanel? chrome;
    readonly Dictionary<string,Button> navigation=new();
    bool inspectorHidden;string rightSelection="";
    Button? inspectorToggle;
    readonly List<WebView2> previews=new();
    JsonNode? state;Window? modal;StackPanel? modalBody;string modalSignature="";
    bool allowClose,started,applying,siteMode;
    string currentView="",dragFrom="";
    Popup? dragOverlay;
    readonly SolidColorBrush accent=new(Color.FromRgb(139,135,255)),ink=new(Color.FromRgb(220,225,235)),surface=new(Color.FromRgb(28,32,41)),fieldSurface=new(Color.FromRgb(21,24,31)),muted=new(Color.FromRgb(144,153,173)),edge=new(Color.FromRgb(48,53,64));
    public StudioWindow()
    {
        ApplyTheme();Title="SI FORGE STUDIO · Native";Width=1500;Height=960;MinWidth=1050;MinHeight=720;Background=new SolidColorBrush(Color.FromRgb(18,21,28));Foreground=ink;FontFamily=new FontFamily("Segoe UI");FontSize=12;UseLayoutRounding=true;SnapsToDevicePixels=true;
        var root=new DockPanel();Content=root;graphCanvas.Background=GraphBackground();
        var top=new DockPanel{Background=surface,Height=54};chrome=top;DockPanel.SetDock(top,Dock.Top);root.Children.Add(top);var brand=new Border{Width=30,Height=30,CornerRadius=new CornerRadius(9),Background=accent,Margin=new Thickness(16,0,0,0),VerticalAlignment=VerticalAlignment.Center,Child=new TextBlock{Text="F",FontWeight=FontWeights.Bold,FontSize=19,Foreground=fieldSurface,HorizontalAlignment=HorizontalAlignment.Center,VerticalAlignment=VerticalAlignment.Center}};DockPanel.SetDock(brand,Dock.Left);top.Children.Add(brand);DockPanel.SetDock(title,Dock.Left);top.Children.Add(title);
        var actions=new StackPanel{Orientation=Orientation.Horizontal,HorizontalAlignment=HorizontalAlignment.Right};DockPanel.SetDock(actions,Dock.Right);top.Children.Add(actions);
        inspectorToggle=Button("Inspector",()=>{inspectorHidden=!inspectorHidden;if(state!=null)ApplyState(state);return Task.CompletedTask;});inspectorToggle.ToolTip="Show or hide properties";actions.Children.Add(inspectorToggle);
        actions.Children.Add(Button("Save",()=>Action(new{type="click",selector="#save"})));actions.Children.Add(Button("Lock",()=>Action(new{type="click",selector="#lock"})));
        var projectMenu=new Menu{Background=surface,VerticalAlignment=VerticalAlignment.Center};var file=new MenuItem{Header="Project"};projectMenu.Items.Add(file);
        foreach(var entry in new[]{("Import project","#import-project"),("Export project","#export-project"),("Export website","#export")}){var mi=new MenuItem{Header=entry.Item1};nativeMenus[entry.Item2]=mi;mi.Click+=async(_,_)=>await Action(new{type="click",selector=entry.Item2});file.Items.Add(mi);}actions.Children.Add(projectMenu);actions.Children.Add(Button("Run website",()=>Action(new{type="click",selector="#run"}),true));
        DockPanel.SetDock(status,Dock.Bottom);status.FontSize=11;status.Foreground=new SolidColorBrush(Color.FromRgb(122,133,155));status.Margin=new Thickness(18,5,18,5);root.Children.Add(status);root.Children.Add(body);
        foreach(var width in new[]{92d,232d,0d,286d})body.ColumnDefinitions.Add(new ColumnDefinition{Width=width==0?new GridLength(1,GridUnitType.Star):new GridLength(width)});
        body.RowDefinitions.Add(new RowDefinition{Height=GridLength.Auto});body.RowDefinitions.Add(new RowDefinition{Height=new GridLength(1,GridUnitType.Star)});body.RowDefinitions.Add(new RowDefinition{Height=new GridLength(0)});
        Grid.SetRowSpan(rail,3);body.Children.Add(rail);rail.Background=surface;
        foreach(var view in new[]{"design","navbar","backend","data","code","settings"}){var button=Button(view=="navbar"?"Navbar":view=="data"?"Database":char.ToUpper(view[0])+view[1..],()=>Action(new{type="view",view}));button.Margin=new Thickness(8,5,8,0);button.Padding=new Thickness(4,10,4,10);button.MinHeight=52;button.ToolTip=button.Content.ToString();var icon=view switch{"design"=>"\uE790","navbar"=>"\uE700","backend"=>"\uE8D4","data"=>"\uE8F1","code"=>"\uE943",_=>"\uE713"};var label=button.Content.ToString();var item=new StackPanel();item.Children.Add(new TextBlock{Text=icon,FontFamily=new FontFamily("Segoe MDL2 Assets"),FontSize=17,HorizontalAlignment=HorizontalAlignment.Center,Margin=new Thickness(0,0,0,6)});item.Children.Add(new TextBlock{Text=label,FontSize=10,HorizontalAlignment=HorizontalAlignment.Center});button.Content=item;System.Windows.Automation.AutomationProperties.SetName(button,label);navigation[view]=button;rail.Children.Add(button);}
        tools.Children.Add(new ScrollViewer{Content=toolItems,HorizontalScrollBarVisibility=ScrollBarVisibility.Auto,VerticalScrollBarVisibility=ScrollBarVisibility.Disabled});Put(tools,1,0,3);tools.Background=surface;tools.Margin=new Thickness(1,0,0,8);toolItems.Margin=new Thickness(10,5,10,5);
        left.Content=leftItems;right.Content=rightItems;bottom.Content=bottomItems;left.Background=right.Background=surface;leftItems.Margin=rightItems.Margin=new Thickness(16,8,16,16);left.Margin=new Thickness(1,0,8,0);right.Margin=new Thickness(8,0,0,0);Put(left,1,1);Grid.SetRowSpan(left,2);Put(right,3,1);Grid.SetRowSpan(right,2);Put(browser,2,1);Put(nativeCenter,1,1,3);Put(graph,2,1);graph.Content=graphCanvas;Put(bottom,2,2);
        Loaded+=async(_,_)=>{DarkTitleBar(this);await Start();};Closing+=OnClosing;Closed+=(_,_)=>{foreach(var view in previews)view.Dispose();browser.Dispose();workspace.Dispose();};
        PreviewMouseMove+=async(_,e)=>{if(Mouse.Captured==this&&B(state,"gesture")){var p=e.GetPosition(browser);await Action(new{type="pointer",phase="move",@event=new{clientX=p.X,clientY=p.Y,shiftKey=(Keyboard.Modifiers&ModifierKeys.Shift)!=0,ctrlKey=(Keyboard.Modifiers&ModifierKeys.Control)!=0,altKey=(Keyboard.Modifiers&ModifierKeys.Alt)!=0}});e.Handled=true;}};
        PreviewMouseLeftButtonUp+=async(_,e)=>{if(Mouse.Captured==this){await Action(new{type="pointer",phase="up"});ReleaseMouseCapture();e.Handled=true;}};
        PreviewKeyDown+=async(_,e)=>{if(e.Key==Key.Escape&&Mouse.Captured==this){await Action(new{type="pointer",phase="cancel"});ReleaseMouseCapture();e.Handled=true;return;}
            if(e.Key==Key.Escape&&currentView=="backend"){e.Handled=true;await Action(new{type="graph",op="cancel"});return;}if((Keyboard.Modifiers&ModifierKeys.Control)!=0&&e.Key==Key.S){e.Handled=true;await Action(new{type="click",selector="#save"});}
            else if(Keyboard.FocusedElement is not TextBox&&Keyboard.FocusedElement is not PasswordBox&&(Keyboard.Modifiers&ModifierKeys.Control)!=0&&(e.Key==Key.Z||e.Key==Key.Y)){e.Handled=true;await Action(new{type="click",selector=e.Key==Key.Z?"#undo":"#redo"});}
        };
    }
    void Put(UIElement child,int col,int row,int span=1){Grid.SetColumn(child,col);Grid.SetRow(child,row);Grid.SetColumnSpan(child,span);body.Children.Add(child);}
    Button Button(string text,Func<Task> action,bool primary=false)
    {
        var b=new Button{Content=text,Padding=new Thickness(11,7,11,7),Margin=new Thickness(3),MinHeight=32,VerticalAlignment=VerticalAlignment.Center,Background=primary?accent:fieldSurface,Foreground=primary?new SolidColorBrush(Color.FromRgb(18,21,28)):ink,BorderBrush=primary?accent:edge,BorderThickness=new Thickness(0)};
        b.Click+=async(_,_)=>{try{await action();}catch(Exception ex){Error(ex.Message);}};return b;
    }
    void Error(string text){status.Text=text;MessageBox.Show(this,text,"SI FORGE STUDIO",MessageBoxButton.OK,MessageBoxImage.Warning);}
    static string S(JsonNode? n,string key,string fallback="")=>n?[key]?.ToString()??fallback;
    static bool B(JsonNode? n,string key)=>bool.TryParse(S(n,key),out var v)&&v;
    static double N(JsonNode? n,string key,double fallback=0)=>double.TryParse(S(n,key),System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out var v)?v:fallback;
    async Task Start()
    {
        try{
            await workspace.Start();await browser.EnsureCoreWebView2Async(workspace.Environment);Configure(browser,true);
            await browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(workspace.BridgeScript());
            browser.CoreWebView2.WebMessageReceived+=async(_,e)=>{if(!Trusted(e.Source))return;try{var data=JsonNode.Parse(e.WebMessageAsJson);if(S(data,"kind")=="state")ApplyState(data!);else if(S(data,"kind")=="desktop")await Desktop(data!);else if(S(data,"kind")=="native-error")Error(S(data,"message"));}catch(Exception ex){Error(ex.Message);}};
            browser.CoreWebView2.NavigationStarting+=(_,e)=>{if(!Trusted(e.Uri)&&!(workspace.SiteOnly&&SameOrigin(e.Uri,workspace.Website)))e.Cancel=true;};
            browser.CoreWebView2.NavigationCompleted+=(_,_)=>{if(workspace.SiteOnly&&SameOrigin(browser.Source?.ToString()??"",workspace.Website)){siteMode=true;ShowWebsiteOnly();}};
            browser.Source=new Uri(workspace.Editor+"/?native=1#"+workspace.Token);started=true;StartTestPipe();
        }catch(Exception ex){Error(ex.Message);}
    }
    bool Trusted(string url)=>SameOrigin(url,workspace.Editor);
    static bool SameOrigin(string url,string origin)=>Uri.TryCreate(url,UriKind.Absolute,out var u)&&Uri.TryCreate(origin,UriKind.Absolute,out var o)&&u.Scheme==o.Scheme&&u.Host==o.Host&&u.Port==o.Port;
    void Configure(WebView2 view,bool main=false)
    {
        var core=view.CoreWebView2;core.Settings.AreDevToolsEnabled=System.Environment.GetEnvironmentVariable("SI_NATIVE_DEBUG_PORT")!=null;core.Settings.AreDefaultContextMenusEnabled=false;core.Settings.IsStatusBarEnabled=false;
        core.PermissionRequested+=(_,e)=>e.State=CoreWebView2PermissionState.Deny;core.DownloadStarting+=(_,e)=>e.Cancel=true;core.NewWindowRequested+=(_,e)=>e.Handled=true;
    }
    async Task Action(object action)
    {
        if(!started||siteMode||browser.CoreWebView2==null)return;var json=JsonSerializer.Serialize(action);await browser.ExecuteScriptAsync("window.siNative?.execute("+json+").catch(e=>chrome.webview.postMessage({kind:'native-error',message:e.message}))");
    }
    void ShowWebsiteOnly(){browser.Width=double.NaN;browser.Height=double.NaN;browser.HorizontalAlignment=HorizontalAlignment.Stretch;browser.VerticalAlignment=VerticalAlignment.Stretch;browser.CoreWebView2.MemoryUsageTargetLevel=CoreWebView2MemoryUsageTargetLevel.Normal;if(chrome!=null)chrome.Visibility=Visibility.Collapsed;Title="SI FORGE Website";foreach(var el in new UIElement[]{rail,tools,left,right,bottom,nativeCenter,graph})el.Visibility=Visibility.Collapsed;browser.Visibility=Visibility.Visible;Grid.SetColumn(browser,0);Grid.SetColumnSpan(browser,4);body.RowDefinitions[2].Height=new GridLength(0);title.Text="SI FORGE Website";status.Text="Local website";}
    async void OnClosing(object? sender,System.ComponentModel.CancelEventArgs e)
    {
        if(allowClose||!started)return;e.Cancel=true;
        try{if(siteMode){await workspace.Api("lock",new{});allowClose=true;Close();}else browser.CoreWebView2.PostWebMessageAsJson("{\"kind\":\"before-close\"}");}catch(Exception ex){Error("Save failed: "+ex.Message);}
    }
    async Task OpenWebsite(string url)
    {
        if(!SameOrigin(url,workspace.Website))throw new Exception("Only the local website can be opened.");
        var view=new WebView2();var window=new Window{Title="SI FORGE Website",Width=1200,Height=850,Content=view,Owner=this};previews.Add(view);window.Closed+=(_,_)=>{previews.Remove(view);view.Dispose();};window.Show();await view.EnsureCoreWebView2Async(workspace.Environment);Configure(view);view.Source=new Uri(url);
    }
    async Task Desktop(JsonNode data)
    {
        object? result=null;string? error=null;var method=S(data,"method");var arg=data["arg"];
        try{if(workspace.SiteOnly&&new[]{"chooseProject","cancelProjectImport","importProject","exportProject"}.Contains(method))throw new Exception("Edit and transfer projects in SI FORGE STUDIO.");switch(method){
            case "openWebsite":await OpenWebsite(arg!.ToString());break;
            case "chooseProject":{
                var picker=new OpenFileDialog{Filter="SI FORGE project|*.siforge",Title="Import project"};if(testImportPath==null&&picker.ShowDialog(this)!=true){result=new{canceled=true};break;}var info=new FileInfo(testImportPath??picker.FileName);if(!info.Extension.Equals(".siforge",StringComparison.OrdinalIgnoreCase))throw new Exception("Choose a .siforge project file.");if(info.Length>128*1024*1024)throw new Exception("Project files must be under 128 MB.");var id=Guid.NewGuid().ToString("N");selections[id]=info.FullName;result=new{id,name=info.Name};break;}
            case "cancelProjectImport":selections.Remove(arg!.ToString());break;
            case "importProject":{
                var id=S(arg,"id");if(!selections.Remove(id,out var file))throw new Exception("Choose the project file again.");if(new FileInfo(file).Length>128*1024*1024)throw new Exception("Project files must be under 128 MB.");result=await workspace.Api("import-project",new{contents=await File.ReadAllTextAsync(file),password=S(arg,"password")});break;}
            case "exportProject":{
                var picker=new SaveFileDialog{Filter="SI FORGE project|*.siforge",FileName="Project.siforge",DefaultExt=".siforge"};if(testExportPath==null&&picker.ShowDialog(this)!=true){result=new{canceled=true};break;}
                var file=System.IO.Path.GetFullPath(testExportPath??picker.FileName);if(!file.EndsWith(".siforge",StringComparison.OrdinalIgnoreCase))file+=".siforge";var projects=System.IO.Path.GetFullPath(System.IO.Path.Combine(workspace.Root,"projects"))+System.IO.Path.DirectorySeparatorChar;if(file.StartsWith(projects,StringComparison.OrdinalIgnoreCase))throw new Exception("Export outside the app's projects folder.");var exported=await workspace.Api("export-project",new{});var tmp=file+"."+Guid.NewGuid().ToString("N")+".tmp";try{await File.WriteAllTextAsync(tmp,S(exported,"contents"));File.Move(tmp,file,true);}finally{if(File.Exists(tmp))File.Delete(tmp);}result=new{path=file};break;}
            case "closeReady":await workspace.Api("lock",new{});allowClose=true;_ = Dispatcher.BeginInvoke(new System.Action(Close));break;
            default:throw new Exception("Unknown desktop command.");
        }}catch(Exception ex){error=ex.Message;}
        browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new{kind="reply",id=data["id"]?.GetValue<int>(),result,error}));
    }
}

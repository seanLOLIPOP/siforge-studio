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
using Microsoft.Win32;
namespace SIForge.Native;
public sealed partial class StudioWindow
{
    void ApplyState(JsonNode data)
    {
        if(siteMode)return;state=data;if(B(data,"gesture")&&Mouse.LeftButton==MouseButtonState.Pressed&&Mouse.Captured!=this)Mouse.Capture(this,CaptureMode.SubTree);else if(!B(data,"gesture")&&Mouse.Captured==this)ReleaseMouseCapture();title.Text="SI FORGE STUDIO"+(B(data,"unlocked")?"  ·  "+S(data,"title"):"");status.Text=S(data,"message")+"     "+S(data,"status");
        if(chrome!=null)chrome.IsEnabled=!B(data,"busy");
        bool unlocked=B(data,"unlocked");string view=S(data,"view");currentView=view;
        rail.Visibility=tools.Visibility=unlocked?Visibility.Visible:Visibility.Collapsed;
        bool panels=unlocked&&(view=="design"||view=="navbar"||view=="backend")&&!(view=="navbar"&&B(data,"expanded"));
        left.Visibility=panels&&view!="backend"?Visibility.Visible:Visibility.Collapsed;right.Visibility=panels?Visibility.Visible:Visibility.Collapsed;
        body.ColumnDefinitions[1].Width=new GridLength(panels&&view!="backend"?225:0);body.ColumnDefinitions[3].Width=new GridLength(panels?300:0);
        Grid.SetColumn(browser,2);Grid.SetColumnSpan(browser,1);bool webVisible=unlocked&&(view=="design"||view=="navbar");browser.Visibility=Visibility.Visible;browser.Width=webVisible?double.NaN:1;browser.Height=webVisible?double.NaN:1;browser.HorizontalAlignment=webVisible?HorizontalAlignment.Stretch:HorizontalAlignment.Left;browser.VerticalAlignment=webVisible?VerticalAlignment.Stretch:VerticalAlignment.Bottom;if(browser.CoreWebView2!=null)browser.CoreWebView2.MemoryUsageTargetLevel=webVisible?Microsoft.Web.WebView2.Core.CoreWebView2MemoryUsageTargetLevel.Normal:Microsoft.Web.WebView2.Core.CoreWebView2MemoryUsageTargetLevel.Low;
        graph.Visibility=unlocked&&view=="backend"?Visibility.Visible:Visibility.Collapsed;bottom.Visibility=graph.Visibility;body.RowDefinitions[2].Height=new GridLength(view=="backend"&&unlocked?190:0);
        nativeCenter.Visibility=!unlocked||view=="data"||view=="code"||view=="settings"?Visibility.Visible:Visibility.Collapsed;
        applying=true;
        try{
            if(!unlocked){SetRegion("gate",data["gate"],node=>{var stack=new StackPanel{Width=440,Margin=new Thickness(30),VerticalAlignment=VerticalAlignment.Center,HorizontalAlignment=HorizontalAlignment.Center};stack.Children.Add(new TextBlock{Text="SI FORGE STUDIO",FontSize=25,FontWeight=FontWeights.SemiBold,Margin=new Thickness(0,0,0,24)});if(node!=null)stack.Children.Add(Render(node,"gate"));nativeCenter.Content=new ScrollViewer{Content=stack,VerticalScrollBarVisibility=ScrollBarVisibility.Auto};});}
            else{
                var tool=new JsonObject{["kind"]="row",["children"]=new JsonArray()};var items=(JsonArray)tool["children"]!;if(data["device"]!=null)items.Add(data["device"]!.DeepClone());if(data["tools"]!=null)items.Add(data["tools"]!.DeepClone());
                Fill("tools",tool,toolItems);Fill("left",data["left"],leftItems);Fill("right",data["right"],rightItems);Fill("bottom",data["bottom"],bottomItems);
                if(nativeCenter.Visibility==Visibility.Visible)SetRegion("center:"+view,data["center"],node=>nativeCenter.Content=node==null?null:new ScrollViewer{Content=Render(node,"center"),VerticalScrollBarVisibility=ScrollBarVisibility.Auto,HorizontalScrollBarVisibility=ScrollBarVisibility.Auto,Padding=new Thickness(18)});
                if(view=="backend")RenderGraph(data["graph"]);
            }
            ApplyModal(data["modal"]);
            var ids=new HashSet<string>();void Collect(JsonNode? n){if(n is JsonObject o){if(o["id"]!=null)ids.Add(o["id"]!.ToString());foreach(var item in o)Collect(item.Value);}else if(n is JsonArray a)foreach(var item in a)Collect(item);}Collect(data);foreach(var id in controls.Keys.Where(id=>!ids.Contains(id)).ToArray())controls.Remove(id);
        }finally{applying=false;}
    }
    string Shape(JsonNode? node)
    {
        if(node==null)return "";var copy=node.DeepClone();void Strip(JsonNode? n){if(n is JsonObject o){o.Remove("value");o.Remove("checked");if(new[]{"row","group","label","heading","expander","text"}.Contains(S(o,"kind"))){o.Remove("id");o.Remove("stable");}foreach(var x in o.ToArray())Strip(x.Value);}else if(n is JsonArray a)foreach(var x in a)Strip(x);}Strip(copy);return copy.ToJsonString();
    }
    void SetRegion(string name,JsonNode? node,Action<JsonNode?> build)
    {
        string shape=Shape(node);if(!signatures.TryGetValue(name,out var previous)||previous!=shape){signatures[name]=shape;build(node);}else Patch(node);
    }
    void Fill(string name,JsonNode? node,Panel panel)=>SetRegion(name,node,n=>{panel.Children.Clear();if(n!=null)panel.Children.Add(Render(n,name));});
    void Patch(JsonNode? node)
    {
        if(node==null)return;string id=S(node,"id");if(controls.TryGetValue(id,out var control)){
            control.IsEnabled=!B(node,"disabled");if(S(node,"kind")=="color"&&control is DockPanel colorPanel){var field=colorPanel.Children.OfType<TextBox>().FirstOrDefault();if(field!=null&&!field.IsKeyboardFocusWithin)field.Text=S(node,"value");var swatch=colorPanel.Children.OfType<System.Windows.Controls.Button>().FirstOrDefault();if(swatch!=null)swatch.Foreground=ParseColor(S(node,"value"),Colors.Gray);}if(S(node,"kind")=="shadow"&&control is ContentControl preview)preview.Content=RenderShadow(node["value"]);
            if(control is TextBox text&&!text.IsKeyboardFocusWithin&&text.Text!=S(node,"value"))text.Text=S(node,"value");
            if(control is CheckBox check)check.IsChecked=B(node,"checked");
            if(control is ComboBox combo&&!combo.IsDropDownOpen)combo.SelectedValue=S(node,"value");
        }
        if(node["children"] is JsonArray children)foreach(var child in children)Patch(child);
    }
    FrameworkElement Render(JsonNode node,string scope)
    {
        string kind=S(node,"kind"),id=S(node,"id"),text=S(node,"text"),value=S(node,"value");FrameworkElement element;
        switch(kind){
            case "input":case "editor":{
                var input=new TextBox{Text=value,Padding=new Thickness(7),Margin=new Thickness(0,3,0,6),MinWidth=90,AcceptsReturn=kind=="editor",AcceptsTab=kind=="editor",TextWrapping=kind=="editor"?TextWrapping.NoWrap:TextWrapping.Wrap,VerticalScrollBarVisibility=kind=="editor"?ScrollBarVisibility.Auto:ScrollBarVisibility.Hidden,HorizontalScrollBarVisibility=ScrollBarVisibility.Auto,MinHeight=kind=="editor"?150:30,MaxWidth=scope=="tools"?200:double.PositiveInfinity};
                if(S(node,"hint").Length>0)input.ToolTip=S(node,"hint");
                if(id=="#code-editor"){input.MinHeight=500;input.FontFamily=new FontFamily("Cascadia Mono,Consolas");input.FontSize=14;}
                var timer=new DispatcherTimer{Interval=TimeSpan.FromMilliseconds(350)};string last=value;
                async Task Commit(){timer.Stop();if(applying||input.Text==last)return;var next=input.Text;if(S(node,"inputType")=="number"){if(!double.TryParse(next,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.CurrentCulture,out var number)&&!double.TryParse(next,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out number)){status.Text="Enter a valid number.";return;}if(!double.IsFinite(number)||(S(node,"min").Length>0&&number<N(node,"min"))||(S(node,"max").Length>0&&number>N(node,"max"))){status.Text="Enter a number within the field's limits.";return;}next=number.ToString(System.Globalization.CultureInfo.InvariantCulture);}last=input.Text;await Action(new{type="change",id,value=next});}
                timer.Tick+=async(_,_)=>await Commit();input.TextChanged+=(_,_)=>{if(!applying){timer.Stop();timer.Start();}};input.LostKeyboardFocus+=async(_,_)=>await Commit();
                input.KeyDown+=async(_,e)=>{if(e.Key==Key.Enter&&kind!="editor"){await Commit();Keyboard.ClearFocus();}};
                element=input;break;}
            case "password":{
                var input=new PasswordBox{Padding=new Thickness(7),Margin=new Thickness(0,3,0,6),MinHeight=32};input.PasswordChanged+=async(_,_)=>{if(!applying)await Action(new{type="change",id,value=input.Password});};element=input;break;}
            case "select":{
                var combo=new ComboBox{Margin=new Thickness(0,3,0,6),MinWidth=100,Padding=new Thickness(5),SelectedValuePath="Tag",MaxWidth=scope=="tools"?240:double.PositiveInfinity};
                if(node["options"] is JsonArray options)foreach(var option in options)combo.Items.Add(new ComboBoxItem{Content=S(option,"text"),Tag=S(option,"value")});combo.SelectedValue=value;
                combo.SelectionChanged+=async(_,_)=>{if(!applying&&combo.SelectedValue!=null)await Action(new{type="change",id,value=combo.SelectedValue.ToString()});};element=combo;break;}
            case "check":{
                var check=new CheckBox{IsChecked=B(node,"checked"),Margin=new Thickness(3,4,3,6),VerticalAlignment=VerticalAlignment.Center};check.Click+=async(_,_)=>{if(!applying)await Action(new{type="change",id,value=check.IsChecked==true});};element=check;break;}
            case "file":element=Button("Choose image…",()=>Upload(id));break;
            case "color":{
                var row=new DockPanel();var input=new TextBox{Text=value,Margin=new Thickness(0,3,0,6),Padding=new Thickness(7)};var swatch=Button("●",async()=>{using var picker=new System.Windows.Forms.ColorDialog{FullOpen=true};try{picker.Color=System.Drawing.ColorTranslator.FromHtml(input.Text);}catch{}if(picker.ShowDialog()==System.Windows.Forms.DialogResult.OK){input.Text="#"+picker.Color.R.ToString("X2")+picker.Color.G.ToString("X2")+picker.Color.B.ToString("X2");await Action(new{type="change",id,value=input.Text});}});swatch.Foreground=ParseColor(value,Colors.Gray);DockPanel.SetDock(swatch,Dock.Right);row.Children.Add(swatch);row.Children.Add(input);input.LostKeyboardFocus+=async(_,_)=>{if(!applying)await Action(new{type="change",id,value=input.Text});};element=row;break;}
            case "button":{
                var button=Button(text,()=>suppressClicks.TryGetValue(id,out var until)&&DateTime.UtcNow<until?Task.CompletedTask:Action(new{type="click",id}),B(node,"active"));button.IsDefault=id=="#modal-confirm"||id=="#unlock-button";button.HorizontalAlignment=HorizontalAlignment.Stretch;if(B(node,"drag"))EnableDrag(button,id);if(B(node,"drop"))EnableDrop(button,id);element=button;break;}
            case "heading":{
                var row=new DockPanel{Margin=new Thickness(0,14,0,7)};var label=new TextBlock{Text=text,FontWeight=FontWeights.SemiBold,FontSize=11,VerticalAlignment=VerticalAlignment.Center,Foreground=ink};row.Children.Add(label);foreach(var child in node["children"]?.AsArray()??new JsonArray()){if(child!=null){var control=Render(child,scope);DockPanel.SetDock(control,Dock.Right);row.Children.Add(control);}}element=row;break;}
            case "label":{
                var stack=new StackPanel{Margin=new Thickness(0,4,0,2)};if(text.Length>0)stack.Children.Add(new TextBlock{Text=text,FontSize=11,Foreground=Brushes.SlateGray,Margin=new Thickness(0,4,0,2)});foreach(var child in node["children"]?.AsArray()??new JsonArray())if(child!=null)stack.Children.Add(Render(child,scope));element=stack;break;}
            case "expander":{
                var stack=new StackPanel();foreach(var child in node["children"]?.AsArray()??new JsonArray())if(child!=null)stack.Children.Add(Render(child,scope));element=new Expander{Header=text,IsExpanded=B(node,"open"),Content=stack,Margin=new Thickness(2,7,2,7)};break;}
            case "row":case "group":{
                Panel panel=kind=="row"?new WrapPanel{Orientation=Orientation.Horizontal}:new StackPanel();foreach(var child in node["children"]?.AsArray()??new JsonArray())if(child!=null)panel.Children.Add(Render(child,scope));
                if(B(node,"drop"))EnableDrop(panel,id);
                if(id.StartsWith("#")||text.Length==0)element=panel;else{var row=new Border{Child=panel,Padding=new Thickness(4),Margin=new Thickness(0,3,0,3),Background=B(node,"active")?new SolidColorBrush(Color.FromRgb(238,240,255)):Brushes.Transparent};if(text.Length>0)panel.Children.Insert(0,new TextBlock{Text=text,Margin=new Thickness(5)});row.MouseLeftButtonUp+=async(_,e)=>{if(!InsideButton(e.OriginalSource))await Action(new{type="click",id});};element=row;}break;}
            case "table":element=RenderTable(node);break;
            case "shadow":element=new ContentControl{Content=RenderShadow(node["value"])};break;
            case "output":element=new TextBox{Text=text,IsReadOnly=true,AcceptsReturn=true,TextWrapping=TextWrapping.NoWrap,FontFamily=new FontFamily("Consolas"),MinHeight=100,VerticalScrollBarVisibility=ScrollBarVisibility.Auto,HorizontalScrollBarVisibility=ScrollBarVisibility.Auto};break;
            default:element=new TextBlock{Text=text,TextWrapping=TextWrapping.Wrap,Margin=new Thickness(3),Foreground=Brushes.SlateGray};break;
        }
        if(id.Length>0){controls[id]=element;System.Windows.Automation.AutomationProperties.SetAutomationId(element,id);}
        element.IsEnabled=!B(node,"disabled");return element;
    }
    FrameworkElement RenderTable(JsonNode node)
    {
        var grid=new DataGrid{IsReadOnly=true,AutoGenerateColumns=false,CanUserAddRows=false,EnableRowVirtualization=true,EnableColumnVirtualization=true,MinHeight=250,MaxHeight=650,HeadersVisibility=DataGridHeadersVisibility.Column,Margin=new Thickness(5)};
        var columns=node["columns"]?.AsArray()??new JsonArray();var rows=node["rows"]?.AsArray()??new JsonArray();var table=new DataTable();for(int i=0;i<columns.Count;i++){table.Columns.Add("c"+i);grid.Columns.Add(new DataGridTextColumn{Header=columns[i]?.ToString(),Binding=new System.Windows.Data.Binding("[c"+i+"]")});}
        foreach(var row in rows){var values=new object[columns.Count];for(int i=0;i<values.Length;i++)values[i]=i<(row?.AsArray().Count??0)?S(row?[i],"text"):"";table.Rows.Add(values);}grid.ItemsSource=table.DefaultView;
        var container=new StackPanel();container.Children.Add(grid);var delete=Button("Delete selected record",async()=>{if(grid.SelectedIndex<0||grid.SelectedIndex>=rows.Count)return;var row=rows[grid.SelectedIndex]?.AsArray();var action=row?.FirstOrDefault(c=>S(c,"kind")=="button");if(action!=null)await Action(new{type="click",id=S(action,"id")});});container.Children.Add(delete);return container;
    }
    void ApplyModal(JsonNode? data)
    {
        if(data==null){if(modal!=null){var old=modal;modal=null;old.Close();IsEnabled=true;Activate();}return;}
        if(modal==null){modal=new Window{Owner=this,Title=S(data,"title"),Width=480,SizeToContent=SizeToContent.Height,MaxHeight=Height*.88,WindowStartupLocation=WindowStartupLocation.CenterOwner,Background=Brushes.White};modalBody=new StackPanel{Margin=new Thickness(22)};modal.Content=new ScrollViewer{Content=modalBody,VerticalScrollBarVisibility=ScrollBarVisibility.Auto};modal.Closing+=async(_,_)=>{if(modal!=null){modal=null;IsEnabled=true;await Action(new{type="cancelModal"});}};modal.PreviewKeyDown+=(_,e)=>{if(e.Key==Key.Escape){e.Handled=true;modal?.Close();}};modal.Show();IsEnabled=false;modalSignature="";}
        modal.Title=S(data,"title");var shape=Shape(data);if(shape!=modalSignature){modalSignature=shape;modalBody!.Children.Clear();modalBody.Children.Add(new TextBlock{Text=S(data,"title"),FontSize=20,FontWeight=FontWeights.SemiBold,Margin=new Thickness(0,0,0,12)});if(data["body"]!=null)modalBody.Children.Add(Render(data["body"]!,"modal"));if(data["actions"]!=null)modalBody.Children.Add(Render(data["actions"]!,"modal"));}else{Patch(data["body"]);Patch(data["actions"]);}
    }
    async Task Upload(string id)
    {
        var picker=new OpenFileDialog{Filter="Images|*.png;*.jpg;*.jpeg;*.webp;*.gif"};if(picker.ShowDialog(this)!=true)return;var file=new FileInfo(picker.FileName);if(file.Length>3*1024*1024)throw new Exception("Use an image under 3 MB.");string mime=file.Extension.ToLowerInvariant() switch{".png"=>"image/png",".jpg" or ".jpeg"=>"image/jpeg",".gif"=>"image/gif",".webp"=>"image/webp",_=>throw new Exception("Unsupported image format.")};await Action(new{type="upload",id,name=file.Name,mime,base64=Convert.ToBase64String(await File.ReadAllBytesAsync(file.FullName))});
    }
    readonly Dictionary<string,DateTime> suppressClicks=new();
    static bool InsideButton(object source){for(DependencyObject? node=source as DependencyObject;node!=null;node=node is Visual?VisualTreeHelper.GetParent(node):LogicalTreeHelper.GetParent(node))if(node is System.Windows.Controls.Button)return true;return false;}
    void EnableDrag(FrameworkElement element,string key)
    {
        Point start=default;element.PreviewMouseLeftButtonDown+=(_,e)=>start=e.GetPosition(element);
        element.MouseMove+=(_,e)=>{if(e.LeftButton!=MouseButtonState.Pressed||Math.Abs((e.GetPosition(element)-start).Length)<8||dragFrom.Length>0)return;dragFrom=key;suppressClicks[key]=DateTime.UtcNow.AddMinutes(1);try{ShowDragOverlay();DragDrop.DoDragDrop(element,new DataObject("SIForgeNative",key),DragDropEffects.Move|DragDropEffects.Copy);}finally{dragOverlay?.SetCurrentValue(Popup.IsOpenProperty,false);dragOverlay=null;suppressClicks[key]=DateTime.UtcNow.AddMilliseconds(500);dragFrom="";}};
    }
    void EnableDrop(FrameworkElement element,string key){element.AllowDrop=true;element.DragOver+=(_,e)=>{if(e.Data.GetDataPresent("SIForgeNative")){e.Effects=DragDropEffects.Move;e.Handled=true;}};element.Drop+=async(_,e)=>{if(e.Data.GetData("SIForgeNative") is string from){e.Handled=true;await Action(new{type="drop",from,to=key});}};}
    void ShowDragOverlay()
    {
        if(currentView!="design"||browser.Visibility!=Visibility.Visible)return;var overlay=new Border{Width=browser.ActualWidth,Height=browser.ActualHeight,Background=new SolidColorBrush(Color.FromArgb(12,82,99,232)),AllowDrop=true};dragOverlay=new Popup{PlacementTarget=browser,Placement=PlacementMode.Relative,AllowsTransparency=true,StaysOpen=true,Child=overlay,IsOpen=true};overlay.DragOver+=(_,e)=>{e.Effects=DragDropEffects.Copy;e.Handled=true;};overlay.Drop+=async(_,e)=>{if(e.Data.GetData("SIForgeNative") is string from){var point=e.GetPosition(overlay);e.Handled=true;await Action(new{type="dropCanvas",from,x=point.X,y=point.Y});}};
    }
    void RenderGraph(JsonNode? data)
    {
        graphCanvas.Children.Clear();var nodes=data?["nodes"]?.AsArray()??new JsonArray();
        foreach(var node in nodes){if(node==null)continue;foreach(var link in new[]{"next","otherwise"}){var target=nodes.FirstOrDefault(n=>S(n,"id")==S(node,link));if(target==null)continue;double x=N(node,"x")+190,y=N(node,"y")+35,tx=N(target,"x"),ty=N(target,"y")+35;var shape=new System.Windows.Shapes.Path{Stroke=link=="next"?accent:Brushes.DarkOrange,StrokeThickness=2,Tag=new[]{S(node,"id"),S(target,"id")},Data=new PathGeometry(new[]{new PathFigure(new Point(x,y),new[]{new BezierSegment(new Point(x+75,y),new Point(tx-75,ty),new Point(tx,ty),true)},false)})};graphCanvas.Children.Add(shape);}}
        foreach(var node in nodes){if(node==null)continue;string id=S(node,"id");var stack=new StackPanel();stack.Children.Add(new TextBlock{Text=S(node,"type"),FontWeight=FontWeights.SemiBold,FontSize=14,Margin=new Thickness(10)});if(S(node,"type")!="response")stack.Children.Add(Button("Connect output →",()=>Action(new{type="graph",op="port",id}),S(data,"linkFrom")==id));
            var border=new Border{Tag=id,Child=stack,Width=190,MinHeight=76,Background=Brushes.White,CornerRadius=new CornerRadius(10),BorderBrush=S(data,"selected")==id?accent:Brushes.LightGray,BorderThickness=new Thickness(1),Cursor=Cursors.SizeAll};Canvas.SetLeft(border,N(node,"x"));Canvas.SetTop(border,N(node,"y"));graphCanvas.Children.Add(border);
            Point start=default;double x=0,y=0;bool moved=false;
            border.MouseLeftButtonDown+=(_,e)=>{if(InsideButton(e.OriginalSource))return;start=e.GetPosition(graphCanvas);x=Canvas.GetLeft(border);y=Canvas.GetTop(border);moved=false;border.CaptureMouse();e.Handled=true;};
            border.MouseMove+=(_,e)=>{if(!border.IsMouseCaptured)return;var p=e.GetPosition(graphCanvas);if((p-start).Length>4)moved=true;if(moved){Canvas.SetLeft(border,Math.Max(15,x+p.X-start.X));Canvas.SetTop(border,Math.Max(15,y+p.Y-start.Y));UpdateGraphWires();}};
            border.MouseLeftButtonUp+=async(_,e)=>{if(!border.IsMouseCaptured)return;border.ReleaseMouseCapture();e.Handled=true;await Action(moved?new{type="graph",op="move",id,x=Canvas.GetLeft(border),y=Canvas.GetTop(border)}:(object)new{type="graph",op="select",id});};
        }
    }
    void UpdateGraphWires(){var nodes=graphCanvas.Children.OfType<Border>().Where(b=>b.Tag is string).ToDictionary(b=>b.Tag!.ToString()!);foreach(var line in graphCanvas.Children.OfType<System.Windows.Shapes.Path>()){if(line.Tag is not string[] ids||!nodes.TryGetValue(ids[0],out var from)||!nodes.TryGetValue(ids[1],out var to))continue;var a=new Point(Canvas.GetLeft(from)+190,Canvas.GetTop(from)+35);var b=new Point(Canvas.GetLeft(to),Canvas.GetTop(to)+35);line.Data=new PathGeometry(new[]{new PathFigure(a,new[]{new BezierSegment(new Point(a.X+75,a.Y),new Point(b.X-75,b.Y),b,true)},false)});}}
    static SolidColorBrush ParseColor(string? value,Color fallback){try{return new SolidColorBrush((Color)ColorConverter.ConvertFromString(value??"")!);}catch{return new SolidColorBrush(fallback);}}
    FrameworkElement RenderShadow(JsonNode? data)
    {
        var value=data?["value"];string target=S(data,"target"),preset=S(value,"preset"),source=S(value,"source");SolidColorBrush background=ParseColor(S(data,"background"),Colors.White),foreground=ParseColor(S(data,"color"),Colors.DarkSlateGray);
        var color=ParseColor(source=="custom"?S(value,"color"):source=="text"?S(data,"color"):source=="accent"?S(data,"accent"):S(data,"background"),Colors.SlateBlue).Color;
        if(source!="custom"&&preset!="glow")color=Color.FromRgb((byte)(color.R*.7),(byte)(color.G*.7),(byte)(color.B*.7));
        var grid=new Grid{Height=125,Margin=new Thickness(4),Background=new SolidColorBrush(Color.FromRgb(241,243,248))};var sample=new Border{Width=100,Height=56,Background=background,CornerRadius=new CornerRadius(8),Child=new TextBlock{Text="Aa",Foreground=foreground,FontSize=28,FontWeight=FontWeights.Bold,HorizontalAlignment=HorizontalAlignment.Center,VerticalAlignment=VerticalAlignment.Center}};
        var effect=new DropShadowEffect{Color=color,Opacity=N(value,"opacity",.3),BlurRadius=N(value,"blur",20),ShadowDepth=Math.Sqrt(N(value,"x")*N(value,"x")+N(value,"y")*N(value,"y")),Direction=-Math.Atan2(N(value,"y"),N(value,"x"))*180/Math.PI};
        if(preset=="3d"||preset=="long"){
            var layers=new Grid{Width=100,Height=56};if(target=="text")layers.Children.Add(new Border{Background=background,CornerRadius=new CornerRadius(8)});
            int depth=(int)N(value,"depth",8);for(int i=depth;i>=1;i--){FrameworkElement layer=target=="text"?new TextBlock{Text="Aa",FontSize=28,FontWeight=FontWeights.Bold,Foreground=new SolidColorBrush(color),HorizontalAlignment=HorizontalAlignment.Center,VerticalAlignment=VerticalAlignment.Center}:new Border{Background=new SolidColorBrush(color),CornerRadius=new CornerRadius(8)};layer.Opacity=N(value,"opacity",.85);layer.RenderTransform=new TranslateTransform(N(value,"x")*i/depth,N(value,"y")*i/depth);if(N(value,"blur")>0)layer.Effect=new BlurEffect{Radius=N(value,"blur")};layers.Children.Add(layer);}
            if(target=="text")layers.Children.Add(new TextBlock{Text="Aa",FontSize=28,FontWeight=FontWeights.Bold,Foreground=foreground,HorizontalAlignment=HorizontalAlignment.Center,VerticalAlignment=VerticalAlignment.Center});else layers.Children.Add(sample);grid.Children.Add(layers);return grid;
        }
        if(preset!="none")if(target=="text")sample.Child.SetValue(UIElement.EffectProperty,effect);else sample.Effect=effect;grid.Children.Add(sample);return grid;
    }
}

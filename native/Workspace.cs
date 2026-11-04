using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
namespace SIForge.Native;
public sealed class Workspace : IDisposable
{
    public readonly string Root, Source, InstallRoot;
    public string Editor="", Website="", Token=Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
    public readonly bool SiteOnly;
    public Process? Backend;
    public readonly HttpClient Http = new(){Timeout=TimeSpan.FromSeconds(90)};
    public CoreWebView2Environment? Environment;
    public Workspace()
    {
        InstallRoot=AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        Root=System.Environment.GetEnvironmentVariable("SI_WORKSPACE_ROOT")??InstallRoot;
        Source=System.Environment.GetEnvironmentVariable("SI_SOURCE")??Path.Combine(InstallRoot,"resources","app");
        SiteOnly=File.Exists(Path.Combine(InstallRoot,"site-mode.json"));
        Directory.CreateDirectory(Root);
    }
    public async Task Start()
    {
        string node=System.Environment.GetEnvironmentVariable("SI_NODE")??Path.Combine(InstallRoot,"runtime","node.exe");
        var psi=new ProcessStartInfo(node){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=Root,RedirectStandardOutput=true,RedirectStandardError=true};
        psi.ArgumentList.Add(Path.Combine(Source,"src","server.mjs"));
        foreach(var entry in new Dictionary<string,string>{{"SI_ROOT",Root},{"SI_TOKEN",Token},{"SI_SITE_ONLY",SiteOnly?"1":"0"},{"SI_APP_ROOT",Root},{"SI_SOURCE",Source},{"SI_NATIVE_ROOT",InstallRoot},{"SI_NODE",node}})psi.Environment[entry.Key]=entry.Value;
        Backend=Process.Start(psi)??throw new Exception("The local backend could not start.");
        var ready=new TaskCompletionSource<JsonNode>();
        Backend.OutputDataReceived+=(_,e)=>{if(e.Data==null)return;try{var info=JsonNode.Parse(e.Data);if(info?["url"]!=null)ready.TrySetResult(info);}catch{}};
        var errors=new StringBuilder();Backend.ErrorDataReceived+=(_,e)=>{if(errors.Length<4000&&e.Data!=null)errors.AppendLine(e.Data);};
        Backend.EnableRaisingEvents=true;Backend.Exited+=(_,_)=>ready.TrySetException(new Exception("Local backend stopped. "+errors));
        Backend.BeginOutputReadLine();Backend.BeginErrorReadLine();
        var result=await ready.Task.WaitAsync(TimeSpan.FromSeconds(30));Editor=new Uri(result["url"]!.ToString()).GetLeftPart(UriPartial.Authority);Website=result["preview"]!.ToString();
        Http.DefaultRequestHeaders.Add("X-Studio-Token",Token);
        var runtime=Path.Combine(InstallRoot,"webview2");
        if(!File.Exists(Path.Combine(runtime,"msedgewebview2.exe")))runtime=System.Environment.GetEnvironmentVariable("SI_WEBVIEW2_RUNTIME")??"";
        string args="--no-first-run";var port=System.Environment.GetEnvironmentVariable("SI_NATIVE_DEBUG_PORT");if(port!=null&&int.TryParse(port,out var p)&&p>1024&&p<65536)args+=" --remote-debugging-port="+p;
        Environment=await CoreWebView2Environment.CreateAsync(string.IsNullOrEmpty(runtime)?null:runtime,Path.Combine(Root,".native-data"),new CoreWebView2EnvironmentOptions(args));
    }
    public async Task<JsonNode> Api(string action,object? body=null)
    {
        var url=Editor+"/studio/"+action;
        using var response=body==null?await Http.GetAsync(url):await Http.PostAsync(url,new StringContent(JsonSerializer.Serialize(body),Encoding.UTF8,"application/json"));
        var node=JsonNode.Parse(await response.Content.ReadAsStringAsync())??new JsonObject();
        if(!response.IsSuccessStatusCode)throw new Exception(node["error"]?.ToString()??"Operation failed.");return node;
    }
    public string BridgeScript()=>"""
    (()=>{
      const origin=ORIGIN;
      if(location.origin!==origin||window!==top)return;
      const pending=new Map();let serial=0,closing;
      const call=(method,arg)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});chrome.webview.postMessage({kind:'desktop',id,method,arg});});
      chrome.webview.addEventListener('message',event=>{const m=event.data;if(m.kind==='before-close'){closing?.();return;}if(m.kind==='reply'){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.result);}}});
      window.desktop={openWebsite:url=>call('openWebsite',url),chooseProject:()=>call('chooseProject'),cancelProjectImport:id=>call('cancelProjectImport',id),importProject:arg=>call('importProject',arg),exportProject:name=>call('exportProject',name),onBeforeClose:fn=>closing=fn,closeReady:()=>call('closeReady')};
    })();
    """.Replace("ORIGIN",JsonSerializer.Serialize(Editor));
    public void Dispose(){try{if(Backend is {HasExited:false})Backend.Kill(true);}catch{}Http.Dispose();Backend?.Dispose();}
}

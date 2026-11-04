import {randomUUID} from 'node:crypto';
export const id=()=>randomUUID();
export function starter(name='My workspace') {
  const el=(type,text,extra={})=>({id:id(),type,text,style:{},children:[],...extra});
  return {version:1,name,updatedAt:new Date().toISOString(),theme:{accent:'#5263e8',background:'#f6f7fb',text:'#20243b',font:'Inter, system-ui, sans-serif'},
    pages:[{id:id(),name:'Home',path:'/',elements:[
      el('container','',{style:{padding:'40px',background:'#ffffff',borderRadius:'20px'},children:[el('text','YOUR NEXT GREAT IDEA',{style:{color:'#5263e8',fontSize:'12px',fontWeight:'700'}}),el('heading','A workspace that works for you.'),el('text','Create an account, sign in, and keep your projects moving. Built entirely in SI FORGE STUDIO.'),el('button','Open your dashboard',{href:'/dashboard'})]}),
      el('auth','Your account'),
    ],css:'',html:'',js:''},
    {id:id(),name:'Dashboard',path:'/dashboard',elements:[el('heading','Your dashboard'),el('text','Your records stay connected to your account. Sign in on the home page first.'),el('form','Create a task',{table:'tasks',endpoint:'create-task',children:[el('input','Task title',{name:'title',required:true}),el('input','Details',{name:'details'}),el('button','Save task',{submit:true})]}),el('table','Your tasks',{table:'tasks'})],css:'',html:'',js:''}],
    tables:[{name:'tasks',columns:['title','details'],rows:[]}],users:[],flows:[{id:id(),name:'Create task',path:'create-task',method:'POST',nodes:[
      {id:'request',type:'request',x:50,y:100,next:'validate',config:{}},
      {id:'validate',type:'validate',x:290,y:100,next:'insert',config:{required:['title']}},
      {id:'insert',type:'insert',x:530,y:100,next:'response',config:{table:'tasks'}},
      {id:'response',type:'response',x:770,y:100,next:'',config:{message:'Task saved'}}]}]};
}
export function validateProject(p){
  if(!p||p.version!==1||typeof p.name!=='string'||p.name.length>100||!Array.isArray(p.pages)||!p.pages.length||p.pages.length>100)throw Error('Invalid project or pages.');
  if(!Array.isArray(p.tables)||!Array.isArray(p.flows)||!Array.isArray(p.users))throw Error('Invalid project data.');
  const elementIds=new Set();let elementCount=0;
  const checkElements=(elements,depth=0)=>{if(depth>30)throw Error('Components are nested too deeply.');for(const e of elements){if(++elementCount>5000||typeof e.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(e.id)||elementIds.has(e.id))throw Error('Invalid or duplicate component ID.');elementIds.add(e.id);if(!['container','heading','text','button','input','form','table','image','auth'].includes(e.type)||!Array.isArray(e.children))throw Error('Invalid component.');checkElements(e.children,depth+1);}};
  for(const page of p.pages)checkElements(page.elements||[]);
  for(const f of p.flows)for(const n of f.nodes||[])if(typeof n.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(n.id))throw Error('Invalid node ID.');
  const paths=new Set();for(const page of p.pages){if(!/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(page.path)||paths.has(page.path))throw Error('Page paths must be unique URL paths.');paths.add(page.path);if(!Array.isArray(page.elements))throw Error('Invalid page elements.');}
  const names=new Set();for(const t of p.tables){if(!/^[a-z][a-z0-9_]{0,39}$/.test(t.name)||names.has(t.name)||!Array.isArray(t.columns)||!t.columns.length||t.columns.length>30||new Set(t.columns).size!==t.columns.length||t.columns.some(c=>!/^[a-z][a-z0-9_]{0,39}$/.test(c)||['id','owner','created_at'].includes(c)))throw Error('Tables need unique names and valid columns (id, owner, created_at are reserved).');names.add(t.name);if(!Array.isArray(t.rows))throw Error('Invalid table rows.');}
  const routes=new Set();for(const f of p.flows){if(!/^[a-z][a-z0-9-]{0,60}$/.test(f.path)||routes.has(f.path))throw Error('Flow paths must be unique lowercase slugs.');routes.add(f.path);if(!['GET','POST'].includes(f.method)||!Array.isArray(f.nodes)||f.nodes.length>100)throw Error('Invalid flow.');const ids=f.nodes.map(n=>n.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate node IDs.');for(const n of f.nodes){if(!['request','validate','condition','insert','list','code','response'].includes(n.type))throw Error('Unknown node type.');for(const link of [n.next,n.otherwise])if(link&&!ids.includes(link))throw Error('Node connection points to a missing node.');}}
  return p;
}

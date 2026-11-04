import vm from 'node:vm';
export function runFlow(flow,body,db,user){
  let node=flow.nodes.find(n=>n.type==='request'),input=structuredClone(body),result=null;const trace=[];
  if(!node)throw Error('Flow needs a Request node.');
  for(let count=0;node&&count<100;count++){
    const started=Date.now(),c=node.config||{};let next=node.next;
    try{switch(node.type){
      case 'request':break;
      case 'validate':for(const field of c.required||[])if(!String(input[field]??'').trim())throw Error(field+' is required.');break;
      case 'condition':if(String(input[c.field]??'')!==String(c.equals??''))next=node.otherwise;break;
      case 'insert':result=db.insert(c.table,input,user.id);break;
      case 'list':result=db.list(c.table,user.id);break;
      case 'code':{const context=vm.createContext({input:structuredClone(input),result:structuredClone(result),user:{id:user.id,email:user.email}},{codeGeneration:{strings:false,wasm:false}});input=new vm.Script(`"use strict"; (function(){${c.code||'return input;'}\n})()`).runInContext(context,{timeout:300});input=JSON.parse(JSON.stringify(input));break;}
      case 'response':trace.push({id:node.id,type:node.type,ms:Date.now()-started});return {ok:true,message:c.message||'Done',data:result??input,trace};
    }}catch(e){e.trace=[...trace,{id:node.id,type:node.type,error:e.message}];throw e;}
    trace.push({id:node.id,type:node.type,ms:Date.now()-started});node=flow.nodes.find(n=>n.id===next);
  }
  if(node)throw Error('Flow exceeded 100 steps. Check for a cycle.');
  throw Error('Flow must end at a Response node.');
}

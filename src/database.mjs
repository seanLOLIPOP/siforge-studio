import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
export class Database {
  constructor(project){this.project=project;this.db=new DatabaseSync(':memory:');try{for(const t of project.tables){this.db.exec(`CREATE TABLE "${t.name}" (id TEXT PRIMARY KEY, owner TEXT, created_at TEXT, ${t.columns.map(c=>`"${c}" TEXT`).join(',')})`);for(const row of t.rows)this.insert(t.name,row,row.owner,true);}}catch(error){this.db.close();throw error;}}
  table(name){const t=this.project.tables.find(t=>t.name===name);if(!t)throw Error('Table not found: '+name);return t;}
  insert(name,data,owner,preserve=false){const t=this.table(name);const row={id:preserve?data.id:randomUUID(),owner,created_at:preserve?data.created_at:new Date().toISOString(),...Object.fromEntries(t.columns.map(c=>[c,String(data[c]??'').slice(0,10000)]))};const cols=['id','owner','created_at',...t.columns];this.db.prepare(`INSERT INTO "${name}" (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).run(...cols.map(c=>row[c]??''));return row;}
  list(name,owner){this.table(name);return owner===undefined?this.db.prepare(`SELECT * FROM "${name}" ORDER BY created_at DESC LIMIT 1000`).all():this.db.prepare(`SELECT * FROM "${name}" WHERE owner=? ORDER BY created_at DESC LIMIT 1000`).all(owner);}
  remove(name,id){this.table(name);this.db.prepare(`DELETE FROM "${name}" WHERE id=?`).run(id);}
  snapshot(){for(const t of this.project.tables)t.rows=this.db.prepare(`SELECT * FROM "${t.name}"`).all();}
  close(){this.db.close();}
}

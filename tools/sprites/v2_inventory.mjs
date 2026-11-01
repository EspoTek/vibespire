// Read-only content discovery: inspect object properties, not effect/status IDs.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const result = {};
for (const [kind, prefix] of Object.entries({cards:'card_', relics:'relic_', potions:'potion_', enemies:'enemy_'})) {
  const folder = path.join(root, 'src/content', kind);
  const files = ['cards','enemies'].includes(kind)
    ? fs.readdirSync(folder).filter(f=>f.endsWith('.ts')).map(f=>path.join(folder,f))
    : [folder+'.ts'];
  const records = [];
  for (const file of files) {
    const source = fs.readFileSync(file,'utf8');
    const tokens=[...source.matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]/g)].map(m=>m[0]).filter(t=>!t.startsWith('//')&&!t.startsWith('/*'));
    const stack=[], pairs=new Map();
    for(let i=0;i<tokens.length;i++) {
      if(['{','[','('].includes(tokens[i])) stack.push(i);
      if(['}',']',')'].includes(tokens[i])) { const start=stack.pop(); if(start===undefined) throw new Error('Unbalanced '+file); pairs.set(start,i); }
    }
    for(const [start,end] of pairs) {
      if(tokens[start]!=='{') continue;
      const props={};
      for(let j=start+1;j<end;j++) {
        if(pairs.has(j)) { j=pairs.get(j); continue; }
        if(tokens[j+1]===':' && /^['"`]/.test(tokens[j+2])) props[tokens[j]]=tokens[j+2].slice(1,-1).replaceAll("\\'","'");
        if(tokens[j]==='boss'&&tokens[j+1]===':'&&tokens[j+2]==='true') props.boss=true;
      }
      if(!props.icon || !props.icon.startsWith(prefix)) continue;
      if(!props.id) throw new Error('Missing literal id: '+file);
      const row={id:props.id,icon:props.icon,source:path.relative(root,file)};
      for(const key of ['name','cls','text','boss']) if(Object.hasOwn(props,key)) row[key]=props[key];
      records.push(row);
    }
  }
  const ids = records.map(r=>r.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate '+kind+' ids');
  const atlas = JSON.parse(fs.readFileSync(path.join(root,'public/assets/sprites',kind+'-atlas.json'),'utf8'));
  result[kind] = {code:records, missing:records.filter(r=>!Object.hasOwn(atlas.frames,r.id)), cut:Object.keys(atlas.frames).filter(id=>!ids.includes(id))};
}
process.stdout.write(JSON.stringify(result,null,2)+'\n');

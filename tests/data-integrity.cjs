const path=require('node:path');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
function boot(file,options={}){
 const storage=new Map(Object.entries(options.seed||{})),nodes={},alerts=[],listeners={},docListeners={},errors=[],media={matches:!!options.dark,addEventListener(t,f){this.change=f}},downloads=[];
 function node(id){return nodes[id]||=({id,innerHTML:'',textContent:'',hidden:true,style:{},classList:{add(){},remove(){}},querySelector(){return null},querySelectorAll(){return []},setAttribute(){},remove(){},appendChild(){},replaceChildren(){},append(){},focus(){},addEventListener(){}})}
 const window={addEventListener(t,f){(listeners[t]||=[]).push(f)},dispatchEvent(e){for(const f of listeners[e.type]||[])f(e)},scrollTo(){}};
 const context={window,document:{getElementById:node,querySelector:s=>s.includes('meta')?node('meta'):null,querySelectorAll:()=>[],addEventListener(t,f){(docListeners[t]||=[]).push(f)},documentElement:{dataset:{}},body:{classList:{add(){},remove(){}},appendChild(){}},createElement(){return {click(){downloads.push(this)},remove(){},setAttribute(){},append(){},appendChild(){},querySelector(){return null}}},hidden:false},localStorage:{getItem(k){if(options.blockReads)throw Error('blocked');return storage.get(k)??null},setItem(k,v){if(options.failKey===k){if(options.failOnce)options.failKey=null;throw Error('quota')}storage.set(k,String(v))},removeItem:k=>storage.delete(k)},matchMedia:()=>media,crypto:{randomUUID},Event:class{constructor(type){this.type=type}},FormData:class{constructor(data){this.data=data}get(k){return this.data[k]??null}has(k){return k in this.data}},FileReader:class{readAsText(file){this.result=file.text;this.onload()}},Blob,TextEncoder,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame:f=>f(),alert:m=>alerts.push(m),confirm:()=>options.confirm!==false,console:{log(){},error(...a){errors.push(a.map(String).join(' '))}}};
 const ctx=vm.createContext(context);vm.runInContext(fs.readFileSync(file,'utf8').match(/<script[^>]*>([\s\S]*?)<\/script>/i)[1],ctx);
 return {ctx,storage,nodes,alerts,options,errors,media,downloads,listeners,read:expr=>JSON.parse(JSON.stringify(vm.runInContext(expr,ctx))),run:code=>vm.runInContext(code,ctx),node};
}
const keys={events:'yaryane_v1_events',tasks:'yaryane_tasks_v1',notes:'yaryane_notes_v1',shifts:'yaryane_shifts_v1'};
const event={id:'a',kind:'private',name:'Arzt Ä',date:'2026-11-02',start:'09:00',end:'10:00',notes:''};
const task={id:42,title:'Aufgabe',icon:'📌',date:'2026-11-03',done:false};
const moduleKeys=keys;
for(const variant of ['main','preview']){
 const keys=Object.fromEntries(Object.entries(moduleKeys).map(([k,v])=>[k,variant==='preview'?v.replace('yaryane_','yaryane_preview_'):v]));const backupKey=variant==='preview'?'yaryane_preview_preimport_backup_v1':'yaryane_preimport_backup_v1';const file=path.join(__dirname,'..',variant==='main'?'index.html':'vorschau/index.html');let app=boot(file);
 assert.equal(app.errors.length,0);
 for(const page of ['home','calendar','tasks','shifts','notes','more']){app.run("page='"+page+"';render()");assert.equal(app.errors.length,0,variant+' '+page+' '+app.errors.join(';'))}
 const denied=boot(file,{blockReads:true,failKey:'yaryane_theme',dark:true});assert.equal(denied.errors.length,0);assert.equal(denied.read('theme'),'dark');
 app=boot(file);app.media.matches=true;app.media.change();assert.equal(app.read('theme'),'dark');assert.equal(app.storage.has('yaryane_theme'),false);
 app.run("setTheme('light')");app.media.matches=true;app.media.change();assert.equal(app.read('theme'),'light');
 app.run("selected='2026-01-31';month=0;year=2026;moveMonth(1)");assert.equal(app.read('selected'),'2026-02-28');
 app.run("selected='2028-01-31';month=0;year=2028;moveMonth(1)");assert.equal(app.read('selected'),'2028-02-29');
 app.run("selected='2026-12-31';month=11;year=2026;moveMonth(1)");assert.equal(app.read('selected'),'2027-01-31');
 const bad=[{date:'2026-02-30'},{date:'2026-11-01\n'},{start:'24:00'},{start:'09:99'},{start:'09:00\n'},{start:'9:00\n'},{kind:'bad'},{notes:{}},{name:'  '},{start:'09:00',end:'09:00'}];
 for(const change of bad){app.ctx.data={events:[{...event,...change}]};assert.throws(()=>app.run('yaryaneNormalizeBackup(data)'))}
 app.ctx.data={events:[{...event,id:"a');alert(1)//"}],tasks:[task],notes:[{id:'n',title:'Notiz',body:'Text'}],shifts:[{id:'s',type:'night',date:'2026-11-03',start:'22:00',end:'06:00'}]};
 const safe=app.read('yaryaneNormalizeBackup(data)');assert.match(safe.events[0].id,/^[\w-]+$/);assert.equal(safe.tasks[0].id,'42');
 app.run('yaryaneApplySnapshot(data)');const original=app.read('({events,tasks,notes,shifts})'),raw=Object.fromEntries(app.storage);
 app.ctx.changed={events:[{...event,name:'Neue Daten'}],tasks:[],notes:[],shifts:[]};app.options.failKey=keys.notes;app.options.failOnce=true;
 assert.throws(()=>app.run('yaryaneApplySnapshot(changed)'));
 assert.deepEqual(app.read('({events,tasks,notes,shifts})'),original);
 assert.deepEqual(Object.fromEntries(app.storage),raw);
 app.ctx.legacy=[{...event,id:'legacy'}];app.run('yaryaneApplySnapshot(legacy)');assert.equal(app.read('tasks.length'),1);
 app.ctx.form={title:'Neu',kind:'work',date:'2026-11-05',start:'22:00',end:'06:00',body:'Test',repeat:'weekly4'};
 app.run("edit={type:'event',id:undefined};submitForm({preventDefault(){},target:form})");assert.equal(app.read('events.length'),5);
 assert.deepEqual(app.read('events.slice(1).map(x=>x.date)'),['2026-11-05','2026-11-12','2026-11-19','2026-11-26']);
 assert.equal(new Set(app.read('events.map(x=>x.id)')).size,5);
 app.ctx.form={title:'Geändert',icon:'📌',date:'2026-11-03',priority:'high',details:'Text'};app.run("edit={type:'task',id:42};submitForm({preventDefault(){},target:form})");assert.equal(app.read('tasks.length'),1);assert.equal(app.read('tasks[0].title'),'Geändert');
 if(variant==='main'){app.ctx.nightSlots=[{...event,date:'2026-11-01',start:'22:00',end:'10:00'}];const oldEvents=app.read('events');app.run('events=nightSlots;shifts=[];yaneFreeSlots(\"Freie Zeitfenster 2026-11-02\")');assert.equal(app.read('yaneLastSlots[0].start'),'10:00');app.ctx.oldEvents=oldEvents;app.run('events=oldEvents');}
 const before=app.read('events');app.options.failKey=keys.events;app.options.failOnce=true;app.ctx.form={title:'Nicht speichern',kind:'private',date:'2026-11-05',start:'09:00',end:'10:00',body:''};
 app.run("edit={type:'event',id:undefined};submitForm({preventDefault(){},target:form})");assert.deepEqual(app.read('events'),before);assert.equal(app.read('edit.type'),'event');
 const id=before[0].id;app.ctx.removeId=id;app.options.confirm=false;app.run("edit={type:'event',id:removeId};deleteEntry()");assert.deepEqual(app.read('events'),before);
 app.options.confirm=true;app.options.failKey=keys.events;app.options.failOnce=true;app.run('deleteEntry()');assert.deepEqual(app.read('events'),before);assert.equal(app.read('edit.id'),id);
 app.run('deleteEntry()');assert.equal(app.read('events.length'),before.length-1);
 app.ctx.night=[{...event,id:'night',date:'2026-11-01',start:'22:00',end:'06:00'}];app.run('events=night;shifts=[]');app.ctx.candidate={date:'2026-11-02',start:'05:00',end:'07:00'};assert.equal(app.read('yaryaneEventConflicts(candidate).length'),1);
 app.ctx.candidate={date:'2026-11-02',start:'06:00',end:'07:00'};assert.equal(app.read('yaryaneEventConflicts(candidate).length'),0);
 const input={files:[{size:20,text:JSON.stringify({events:[event],tasks:[task]})}],value:'file'};app.ctx.input=input;app.run('importData(input)');assert.equal(input.value,'');assert.equal(app.read('events[0].name'),event.name);assert.ok(app.storage.get(backupKey));
 app.run('restoreSnapshot()');assert.equal(app.read('events[0].id'),'night');
 app.run('exportData()');assert.ok(app.downloads[0].download.endsWith('.json'));
 app.run("openForm('event')");assert.equal(app.node('app').inert,true);assert.equal(app.node('yaneLaunch').inert,true);assert.ok(app.node('modal').innerHTML.includes('aria-modal=\"true\"'));app.run('closeForm()');assert.equal(app.node('app').inert,false);assert.equal(app.node('yaneLaunch').inert,false);
 if(variant==='preview')for(const key of Object.values(moduleKeys))assert.equal(app.storage.has(key),false);
 const crud=boot(file);crud.ctx.form={title:'Aufgabe',icon:'📌',date:'2026-11-03'};crud.run("edit={type:'task'};submitForm({preventDefault(){},target:form})");const taskId=crud.read('tasks[0].id');crud.ctx.taskId=taskId;crud.run('toggleTask(taskId)');assert.equal(crud.read('tasks[0].done'),true);crud.options.failKey=keys.tasks;crud.options.failOnce=true;crud.run('toggleTask(taskId)');assert.equal(crud.read('tasks[0].done'),true);
 crud.ctx.form={title:'Notiz',icon:'📝',body:'Zeile 1\nZeile 2',color:'mint',pinned:'on',checklist:'on'};crud.run("edit={type:'note'};submitForm({preventDefault(){},target:form})");assert.equal(crud.read('notes[0].pinned'),true);assert.equal(crud.read('notes[0].checklist'),true);assert.equal(crud.read('notes[0].body'),'Zeile 1\nZeile 2');
 crud.ctx.form={date:'2026-03-22',shiftType:'night',start:'22:00',end:'06:00',breakMinutes:'30',repeat:'weekly4'};crud.run("edit={type:'shift'};submitForm({preventDefault(){},target:form})");assert.deepEqual(crud.read('shifts.map(x=>x.date)'),['2026-03-22','2026-03-29','2026-04-05','2026-04-12']);assert.equal(crud.read('shifts[0].breakMinutes'),30);if(variant==='main')assert.equal(crud.read('shiftHours(shifts[0])'),7.5);
 console.log('PASS '+variant+': six views; storage restrictions; theme; month bounds; schema/date/time validation; safe IDs; multi-key rollback; legacy backups; numeric IDs; repeat dates; failed save/delete; overnight conflicts; import/restore/export.');
}
module.exports={boot,keys,event,task};

const {boot,keys,event}=require('./data-integrity.cjs'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function cloud(options={}){
 const app=boot(require('node:path').join(__dirname,'..','index.html'),options),calls=[];
 let write=async()=>{},read=async()=>({exists:()=>true,data:()=>({events:[event],tasks:[],notes:[],shifts:[]})});
 Object.assign(app.ctx,{initializeApp:()=>({}),getAuth:()=>({}),getFirestore:()=>({}),doc:(...args)=>args,setDoc:(reference,data)=>{calls.push({reference,data:JSON.parse(JSON.stringify(data))});return write(reference,data)},getDoc:reference=>read(reference),onAuthStateChanged:(auth,cb)=>{app.authCallback=cb},signInWithEmailAndPassword(){},createUserWithEmailAndPassword(){},sendPasswordResetEmail(){},signOut(){}});
 const code=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8').match(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/i)[1].replace(/^import .*;\n/gm,'');
 vm.runInContext(code,app.ctx);app.run("user={uid:'test-user',email:'test@example.invalid'};active=true");
 return {...app,calls,setWrite(fn){write=fn},setRead(fn){read=fn}};
}
(async()=>{
 let app=cloud();const pending=deferred();let n=0;app.setWrite(()=>++n===1?pending.promise:Promise.resolve());
 app.run("dirty=true");const first=app.run('uploadChanges()');
 app.ctx.updated=[event];app.run("yaryanePersist('event',updated)");
 assert.equal(app.read('dirty'),true);pending.resolve();await first;
 assert.equal(app.read('dirty'),true);await app.run('uploadChanges()');assert.equal(app.calls.length,2);assert.equal(app.calls[1].data.events[0].name,event.name);
 app=cloud();const loading=deferred();app.setRead(()=>loading.promise);const download=app.run('downloadConfirm()');
 app.ctx.updated=[{...event,name:'Während Download geändert'}];app.run("yaryanePersist('event',updated)");
 loading.resolve({exists:()=>true,data:()=>({events:[event],tasks:[],notes:[],shifts:[]})});await download;
 assert.equal(app.read('events[0].name'),'Während Download geändert');assert.ok(app.read('lastMessage').includes('während des Ladens'));
 app=cloud({seed:{[keys.events]:JSON.stringify([event])},failKey:keys.notes,failOnce:true});
 await app.run('downloadConfirm()');assert.equal(app.read('events[0].name'),event.name);assert.equal(app.storage.get(keys.events),JSON.stringify([event]));assert.equal(app.read('active'),true);assert.ok(app.read('lastMessage').startsWith('Download fehlgeschlagen'));
 app=cloud();app.setRead(async()=>({exists:()=>true,data:()=>({events:[{...event,date:'2026-02-30'}],tasks:[],notes:[],shifts:[]})}));
 await app.run('downloadConfirm()');assert.equal(app.read('events.length'),0);assert.ok(app.read('lastMessage').includes('Ungültiges Datum'));
 app=cloud();const old=deferred();app.setWrite(()=>old.promise);const upload=app.run('uploadChanges()');app.run("authRevision++;user=null;active=false;dirty=false;lastMessage='Abgemeldet'");old.resolve();await upload;assert.equal(app.read('active'),false);assert.equal(app.read('lastMessage'),'Abgemeldet');
 console.log('PASS mocked cloud: edits during upload are queued; edits during download cannot be overwritten; invalid cloud records and storage errors preserve local state; late uploads cannot reactivate a logged-out account. No real Firebase account accessed.');
})().catch(error=>{console.error(error);process.exit(1)});

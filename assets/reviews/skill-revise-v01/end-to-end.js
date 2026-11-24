import {actions,directions,createComposition} from './choreography.js';
const [catalogue,retained,revisions]=await Promise.all(['/catalogue.json','/retained.json','/revisions.json'].map(async url=>(await fetch(url)).json()));
const assets=new Map([...catalogue.packs,...retained.assets,...revisions.assets].map(p=>[p.id,p]));
const ui=Object.fromEntries(['action','direction','play','restart','speed','zoom','repeat','all','phase','clock','progress','description'].map(id=>[id,document.getElementById(id)]));
for(const a of actions)ui.action.add(new Option(a.label,a.id));
class MotionReview extends Phaser.Scene{
 preload(){
  this.load.image('ground','/ground.png');
  for(const p of catalogue.packs)this.load.atlas(p.id,p.png,p.atlas);
  for(const p of retained.assets)this.load.atlas(p.id,'/retained/'+p.id+'.png','/retained/'+p.id+'.json');
  for(const p of revisions.assets)this.load.atlas(p.id,'/revisions/'+p.id+'.png','/revisions/'+p.id+'.json');
  this.load.on('loaderror',f=>console.error('Asset load error',f.src));
 }
 create(){
  this.add.image(683,384,'ground').setDisplaySize(3072,2048).setDepth(-10000);
  this.clock=0;this.speed=1;this.paused=false;this.repeat=true;this.playAll=false;this.runs=0;
  this.items=[];this.trace=[];this.renderedFrames=new Set();this.pendingCues=[];this.lastRender=null;
  // Record only after Phaser rendered the composed scene, not when a cue was scheduled.
  this.game.events.on('postrender',()=>this.observe());
  ui.action.onchange=()=>{this.playAll=false;this.run(ui.action.value,ui.direction.value)};
  ui.direction.onchange=()=>this.run(ui.action.value,ui.direction.value);
  ui.play.onclick=()=>{this.paused=!this.paused;this.refresh()};
  ui.restart.onclick=()=>this.run(ui.action.value,ui.direction.value);
  ui.speed.onchange=()=>{this.speed=Number(ui.speed.value)};
  ui.zoom.onchange=()=>this.zoom(Number(ui.zoom.value));
  ui.repeat.onchange=()=>{this.repeat=ui.repeat.checked};
  ui.all.onclick=()=>{this.playAll=true;this.run(actions[0].id,ui.direction.value)};
  ui.progress.oninput=()=>this.seek(Number(ui.progress.value)/1000*this.plan.duration);
  this.input.keyboard.on('keydown-SPACE',()=>ui.play.click());
  const query=new URLSearchParams(location.search),initialAction=query.get('action'),initialDirection=query.get('direction'),initialSpeed=Number(query.get('speed')??1);
  if([1,.5,.25].includes(initialSpeed)){this.speed=initialSpeed;ui.speed.value=String(initialSpeed)}
  this.zoom(1.5);this.run(actions.some(a=>a.id===initialAction)?initialAction:actions[0].id,directions[initialDirection]?initialDirection:'right');
  window.__SKILL_REVISE_E2E__={ready:true,actions,directions:Object.keys(directions),
   run:(id,direction='right',options={})=>{this.repeat=options.repeat??false;this.playAll=false;ui.repeat.checked=this.repeat;this.run(id,direction)},
   pause:()=>{this.paused=true;this.refresh()},resume:()=>{this.paused=false;this.refresh()},
   setSpeed:value=>{this.speed=value},seek:time=>this.seek(time),snapshot:()=>this.snapshot()};
 }
 zoom(value){this.cameras.main.setZoom(value);this.cameras.main.centerOn(700,425)}
 run(id,direction){
  const plan=createComposition(id,direction,this.runs+1);
  for(const n of plan.nodes)for(const frame of n.frames)if(!this.textures.get(n.texture).has(frame))throw Error('Missing frame '+n.texture+':'+frame);
  for(const item of this.items)item.sprite.destroy();
  this.plan=plan;this.clock=0;this.paused=false;this.completed=false;this.endWait=0;this.runs++;
  this.trace=[];this.pendingCues=[];this.seenCues=new Set();this.renderedFrames=new Set();this.lastRender=null;
  this.items=plan.nodes.map(node=>{
   const p=assets.get(node.texture),sprite=this.add.sprite(0,0,node.texture,node.frames[0]);
   sprite.setOrigin(...(node.origin??p.pivot??[.5,.5]));
   return {node,sprite};
  });
  ui.action.value=id;ui.direction.value=direction;
  ui.description.textContent=plan.note+' · Preview chuyển động; chưa tích hợp combat/server.';
  this.renderAt();this.refresh();
 }
 seek(time){
  this.paused=true;this.clock=Math.max(0,Math.min(this.plan.duration-1,time));this.completed=false;
  this.trace=[];this.pendingCues=[];this.seenCues=new Set(this.plan.cues.filter(c=>c.at<this.clock).map(c=>this.plan.cues.indexOf(c)));
  this.renderAt();this.refresh();
 }
 renderAt(){
  for(const {node:n,sprite:s} of this.items){
   const visible=this.clock>=n.start&&this.clock<n.end;s.setVisible(visible);if(!visible)continue;
   const age=this.clock-n.start,p=n.position(this.clock),index=Math.floor(age/n.frameMs);
   s.setFrame(n.frames[n.loop?index%n.frames.length:Math.min(n.frames.length-1,index)]);
   s.setPosition(p.x,p.y).setRotation(n.rotation??0);
   const base=n.scaleAt?.(this.clock)??n.scale??assets.get(n.texture).scale??.5;
   s.setScale(n.scaleX??base,n.scaleY??base);
   if(n.beam){const a=n.beam.from(this.clock),b=n.beam.to(this.clock),length=Math.hypot(b.x-a.x,b.y-a.y);s.setPosition((a.x+b.x)/2,(a.y+b.y)/2).setRotation(Math.atan2(b.y-a.y,b.x-a.x)).setScale(length/(n.texture==='laser-ground'?116:180),n.beamWidth??.9)}
   s.setDepth((p.groundY??p.y)+(n.depthOffset??0)).setAlpha(n.fade?Math.max(0,1-age/(n.end-n.start)):1);
  }
  this.plan.cues.forEach((cue,i)=>{if(cue.at<=this.clock&&!this.seenCues.has(i)){this.seenCues.add(i);this.pendingCues.push(cue)}});
 }
 visible(){return this.items.filter(i=>i.sprite.visible).map(({node:n,sprite:s})=>({id:n.id,kind:n.kind,texture:n.texture,frame:s.frame.name,x:s.x,y:s.y,scaleX:s.scaleX,scaleY:s.scaleY,origin:[s.originX,s.originY],rotation:s.rotation,depth:s.depth}))}
 observe(){
  if(!this.plan)return;const visible=this.visible();
  for(const s of visible)this.renderedFrames.add(s.texture+':'+s.frame);
  this.lastRender={at:this.clock,visible};
  for(const cue of this.pendingCues.splice(0))this.trace.push({...cue,renderedAt:this.clock,visible});
 }
 snapshot(){return {id:this.plan.id,direction:this.plan.direction,clock:this.clock,duration:this.plan.duration,paused:this.paused,completed:this.completed,runs:this.runs,trace:this.trace,renderedFrames:[...this.renderedFrames],lastRender:this.lastRender,objects:this.items.length,displayObjects:this.children.length,visible:this.visible()}}
 refresh(){
  ui.play.textContent=this.paused?'Tiếp tục':'Tạm dừng';
  ui.clock.textContent=(this.clock/1000).toFixed(2)+' / '+(this.plan.duration/1000).toFixed(2)+' s';
  ui.progress.value=String(this.clock/this.plan.duration*1000);
  ui.phase.textContent=this.plan.cues.filter(c=>c.at<=this.clock).at(-1)?.label??'Lấy đà';
 }
 update(_time,delta){
  if(!this.plan||this.paused)return;
  if(this.completed){
   this.endWait+=delta;
   if(this.endWait>650&&(this.playAll||this.repeat)){
    const next=this.playAll?actions[(actions.findIndex(a=>a.id===this.plan.id)+1)%actions.length].id:this.plan.id;
    this.run(next,this.plan.direction);
   }
   return;
  }
  this.clock=Math.min(this.plan.duration-1,this.clock+Math.min(delta,80)*this.speed);
  this.renderAt();this.refresh();if(this.clock>=this.plan.duration-1)this.completed=true;
 }
}
new Phaser.Game({type:Phaser.AUTO,width:1366,height:768,parent:'canvas',backgroundColor:'#28332d',render:{antialias:true},scene:MotionReview,audio:{noAudio:true}});

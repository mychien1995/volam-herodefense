const specifications=[{id:'slam',prefix:'',title:'Đưa búa ra sau đầu → kéo qua trước → gập người, chạm đất'},{id:'sweep',prefix:'/sweep',title:'Lấy đà bên hông → lên vai → xoay hông quạt qua trước → hạ theo đà'}];
const studies=new Map(await Promise.all(specifications.map(async spec=>[spec.id,{...await (await fetch(spec.prefix+'/study.json')).json(),...spec}])));
const ui=Object.fromEntries(['action','play','restart','speed','zoom','repeat','phase','clock','progress','poses'].map(id=>[id,document.getElementById(id)]));
class MotionStudy extends Phaser.Scene{
 preload(){
  this.load.image('ground','/ground.png');this.load.atlas('idle','/idle.png','/idle.json');
  for(const s of studies.values()){this.load.image(s.id+'-reference',s.prefix+'/reference.png');this.load.atlas(s.id,s.prefix+'/body.png',s.prefix+'/body.json')}
  this.load.on('loaderror',file=>console.error('Missing asset',file.src));
 }
 create(){
  this.add.image(683,384,'ground').setDisplaySize(3072,2048).setTint(0x66746a);
  const style={fontFamily:'Arial',fontSize:'17px',color:'#fff0cf',backgroundColor:'#14232be0',padding:{x:10,y:6}};
  this.title=this.add.text(175,105,'',style);
  this.reference=this.add.image(1030,280,'sweep-reference');
  this.add.text(780,86,'Ảnh mẫu: chuẩn đường đi và chuyển trọng lượng',style);
  this.add.text(830,568,'Đứng yên giữ nguyên     Mẫu ở kích thước gameplay',{...style,fontSize:'14px'});
  this.add.sprite(900,555,'idle','idle_0_right').setOrigin(.5,320/448).setScale(.5);
  const initial=studies.get('sweep');
  this.actor=this.add.sprite(440,525,initial.id,initial.frames[0].name);
  this.native=this.add.sprite(1110,555,initial.id,initial.frames[0].name);
  this.speed=1;this.repeat=true;this.renderLog=[];
  ui.action.onchange=()=>this.select(ui.action.value);
  ui.play.onclick=()=>{this.paused=!this.paused;this.refresh()};ui.restart.onclick=()=>this.restart();
  ui.speed.onchange=()=>this.speed=Number(ui.speed.value);ui.zoom.onchange=()=>this.actor.setScale(Number(ui.zoom.value)/this.study.density);
  ui.repeat.onchange=()=>this.repeat=ui.repeat.checked;
  ui.progress.oninput=()=>this.seek(Number(ui.progress.value)/1000*this.study.duration);
  this.game.events.on('postrender',()=>{const frame=this.actor.frame.name;this.seen.add(frame);if(this.renderLog.at(-1)?.frame!==frame||this.renderLog.at(-1)?.id!==this.study.id)this.renderLog.push({id:this.study.id,frame,at:Math.round(this.clock),position:[this.actor.x,this.actor.y],scale:this.actor.scaleX*this.study.density})});
  this.input.keyboard.on('keydown-SPACE',()=>ui.play.click());
  window.__THIEN_SU_REFERENCE__={ready:true,seek:time=>this.seek(time),restart:()=>this.restart(),pause:()=>{this.paused=true;this.refresh()},resume:()=>{this.paused=false;this.refresh()},snapshot:()=>this.snapshot()};
  const requested=new URLSearchParams(location.search).get('action');this.select(studies.has(requested)?requested:'sweep');
 }
 select(id){
  this.study=studies.get(id);const s=this.study;ui.action.value=id;
  this.clock=0;this.paused=false;this.cycles=0;this.seen=new Set();this.index=0;
  this.actor.setTexture(id,s.frames[0].name).setOrigin(...s.pivot).setScale(Number(ui.zoom.value)/s.density);
  this.native.setTexture(id,s.frames[0].name).setOrigin(...s.pivot).setScale(.5/s.density);
  this.reference.setTexture(id+'-reference');const {width,height}=this.reference.texture.getSourceImage();this.reference.setDisplaySize(540,540*height/width);
  this.title.setText(s.title);ui.poses.replaceChildren();
  s.frames.forEach((f,i)=>{const button=document.createElement('button');button.textContent=(i+1)+'. '+f.label;button.onclick=()=>this.seek(s.frames.slice(0,i).reduce((sum,f)=>sum+f.duration,0));ui.poses.append(button)});
  this.renderAt();
 }
 restart(){this.clock=0;this.paused=false;this.renderAt()}
 seek(time){this.clock=Math.max(0,Math.min(this.study.duration-1,time));this.paused=true;this.renderAt()}
 renderAt(){const s=this.study;let elapsed=0,index=s.frames.length-1;for(let i=0;i<s.frames.length;i++){elapsed+=s.frames[i].duration;if(this.clock<elapsed){index=i;break}}
  this.index=index;const frame=s.frames[index];this.actor.setFrame(frame.name);this.native.setFrame(frame.name);this.refresh();
 }
 refresh(){const s=this.study;ui.play.textContent=this.paused?'Tiếp tục':'Tạm dừng';ui.phase.textContent=s.frames[this.index??0].label;ui.clock.textContent=(Math.min(this.clock,s.duration)/1000).toFixed(2)+' / '+(s.duration/1000).toFixed(2)+' s';ui.progress.value=String(Math.min(this.clock,s.duration)/s.duration*1000);[...ui.poses.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===this.index)))}
 snapshot(){const s=this.study;return {id:s.id,frame:this.actor.frame.name,index:this.index,clock:this.clock,duration:s.duration,paused:this.paused,cycles:this.cycles,seen:[...this.seen],renderLog:this.renderLog.slice(-40),position:[this.actor.x,this.actor.y],scale:this.actor.scaleX*s.density,textureScale:this.actor.scaleX,density:s.density,objects:this.children.length,frames:s.frames.map(f=>f.name)}}
 update(_time,delta){if(this.paused||!this.study)return;this.clock+=Math.min(delta,80)*this.speed;if(this.clock>=this.study.duration+500){if(this.repeat){this.clock=0;this.cycles++}else{this.clock=this.study.duration-1;this.paused=true}}this.renderAt()}
}
new Phaser.Game({type:Phaser.AUTO,width:1366,height:768,parent:'canvas',backgroundColor:'#28332d',render:{antialias:true},audio:{noAudio:true},scene:MotionStudy});

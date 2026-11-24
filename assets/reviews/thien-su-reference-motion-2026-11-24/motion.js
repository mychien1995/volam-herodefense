const study=await (await fetch('/study.json')).json();
const ui=Object.fromEntries(['play','restart','speed','zoom','repeat','phase','clock','progress','poses'].map(id=>[id,document.getElementById(id)]));
class MotionStudy extends Phaser.Scene{
 preload(){this.load.image('ground','/ground.png');this.load.image('reference','/reference.png');this.load.atlas('study','/body.png','/body.json');this.load.atlas('idle','/idle.png','/idle.json');this.load.on('loaderror',file=>console.error('Missing asset',file.src))}
 create(){
  this.add.image(683,384,'ground').setDisplaySize(3072,2048).setTint(0x66746a);
  const style={fontFamily:'Arial',fontSize:'18px',color:'#fff0cf',backgroundColor:'#14232be0',padding:{x:10,y:6}};
  this.add.text(240,105,'Đưa búa ra sau đầu → kéo qua trước → gập người, chạm đất',style);
  this.add.image(1030,280,'reference').setDisplaySize(540,363);
  this.add.text(780,86,'Ảnh mẫu: chuẩn đường đi và chuyển trọng lượng',style);
  this.add.text(830,568,'Đứng yên giữ nguyên     Mẫu ở kích thước gameplay',{...style,fontSize:'14px'});
  this.add.sprite(900,555,'idle','idle_0_right').setOrigin(.5,320/448).setScale(.5);
  this.actor=this.add.sprite(440,525,'study',study.frames[0].name).setOrigin(...study.pivot).setScale(3/study.density);
  this.native=this.add.sprite(1110,555,'study',study.frames[0].name).setOrigin(...study.pivot).setScale(.5/study.density);
  this.clock=0;this.speed=1;this.paused=false;this.repeat=true;this.cycles=0;this.seen=new Set();this.renderLog=[];
  ui.play.onclick=()=>{this.paused=!this.paused;this.refresh()};ui.restart.onclick=()=>this.restart();
  ui.speed.onchange=()=>this.speed=Number(ui.speed.value);ui.zoom.onchange=()=>this.actor.setScale(Number(ui.zoom.value)/study.density);
  ui.repeat.onchange=()=>this.repeat=ui.repeat.checked;
  ui.progress.oninput=()=>this.seek(Number(ui.progress.value)/1000*study.duration);
  study.frames.forEach((f,i)=>{const button=document.createElement('button');button.textContent=(i+1)+'. '+f.label;button.onclick=()=>this.seek(study.frames.slice(0,i).reduce((sum,f)=>sum+f.duration,0));ui.poses.append(button)});
  this.game.events.on('postrender',()=>{const frame=this.actor.frame.name;this.seen.add(frame);if(this.renderLog.at(-1)?.frame!==frame)this.renderLog.push({frame,at:Math.round(this.clock),position:[this.actor.x,this.actor.y],scale:this.actor.scaleX})});
  this.input.keyboard.on('keydown-SPACE',()=>ui.play.click());
  window.__THIEN_SU_REFERENCE__={ready:true,seek:time=>this.seek(time),restart:()=>this.restart(),pause:()=>{this.paused=true;this.refresh()},resume:()=>{this.paused=false;this.refresh()},snapshot:()=>this.snapshot()};
  this.renderAt();
 }
 restart(){this.clock=0;this.paused=false;this.renderAt()}
 seek(time){this.clock=Math.max(0,Math.min(study.duration-1,time));this.paused=true;this.renderAt()}
 renderAt(){let elapsed=0,index=study.frames.length-1;for(let i=0;i<study.frames.length;i++){elapsed+=study.frames[i].duration;if(this.clock<elapsed){index=i;break}}
  this.index=index;const frame=study.frames[index];this.actor.setFrame(frame.name);this.native.setFrame(frame.name);this.refresh();
 }
 refresh(){ui.play.textContent=this.paused?'Tiếp tục':'Tạm dừng';ui.phase.textContent=study.frames[this.index??0].label;ui.clock.textContent=(Math.min(this.clock,study.duration)/1000).toFixed(2)+' / '+(study.duration/1000).toFixed(2)+' s';ui.progress.value=String(Math.min(this.clock,study.duration)/study.duration*1000);[...ui.poses.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===this.index)))}
 snapshot(){return {frame:this.actor.frame.name,index:this.index,clock:this.clock,duration:study.duration,paused:this.paused,cycles:this.cycles,seen:[...this.seen],renderLog:this.renderLog.slice(-40),position:[this.actor.x,this.actor.y],scale:this.actor.scaleX*study.density,textureScale:this.actor.scaleX,density:study.density,objects:this.children.length,frames:study.frames.map(f=>f.name)}}
 update(_time,delta){if(this.paused||!this.actor)return;this.clock+=Math.min(delta,80)*this.speed;if(this.clock>=study.duration+500){if(this.repeat){this.clock=0;this.cycles++}else{this.clock=study.duration-1;this.paused=true}}this.renderAt()}
}
new Phaser.Game({type:Phaser.AUTO,width:1366,height:768,parent:'canvas',backgroundColor:'#28332d',render:{antialias:true},audio:{noAudio:true},scene:MotionStudy});

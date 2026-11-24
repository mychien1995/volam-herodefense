const catalogue = await (await fetch('/catalogue.json')).json();
const chosen = document.querySelector('#pack'), clips = document.querySelector('#clip');
let scene;
class Review extends Phaser.Scene {
  preload() {
    this.load.image('ground','/ground.png');
    this.load.atlas('retained','/retained/body.png','/retained/body.json');
    for (const p of catalogue.packs) this.load.atlas(p.id,p.png,p.atlas);
    this.load.on('loaderror',f=>console.error('Asset load error',f.src));
  }
  create() {
    scene=this;
    this.add.image(683,384,'ground').setDisplaySize(3072,2048).setDepth(-10);
    this.old=this.add.sprite(500,440,'retained','idle_0_down_right').setOrigin(176/352,248/320).setScale(.5);
    this.actor=this.add.sprite(780,440,catalogue.packs[0].id).setDepth(440);
    this.add.text(440,475,'Baseline M3D',{fontSize:'14px',color:'#fff'});
    this.add.text(710,475,'Asset mới · 1×',{fontSize:'14px',color:'#ffe8b0'});
    this.history=[];this.completed=0;
    this.game.events.on('postrender',()=>{const a=this.actor.anims.currentAnim;if(!a)return;const frame=this.actor.frame.name,previous=this.history.at(-1);if(previous?.key===a.key&&previous?.frame===frame)return;this.history.push({key:a.key,frame,at:this.time.now});if(this.history.length>4096)this.history.shift()});
    this.actor.on('animationcomplete',()=>{this.completed++});
    for(const p of catalogue.packs) {
      chosen.add(new Option(p.label,p.id));
      for(const c of p.clips) this.anims.create({key:p.id+':'+c.name,frames:c.frames.map(f=>({key:p.id,frame:f})),frameRate:c.fps??10,repeat:c.loop?-1:0,skipMissedFrames:false});
    }
    const selectPack=()=>{
      const p=catalogue.packs.find(p=>p.id===chosen.value);
      clips.replaceChildren(...p.clips.map(c=>new Option(c.name,c.name)));
      this.actor.setOrigin(...p.pivot).setScale(p.scale??.5);this.actor.stop();this.actor.setTexture(p.id,p.clips[0].frames[0]);
      document.querySelector('#note').textContent=p.note??'Candidate animation · không mô phỏng gameplay';
      play();
    };
    const play=()=>this.actor.play(chosen.value+':'+clips.value);
    chosen.onchange=selectPack;clips.onchange=play;
    document.querySelector('#play').onclick=play;
    document.querySelector('#pause').onclick=()=>this.actor.anims.pause();
    document.querySelector('#zoom').onclick=()=>{const z=this.cameras.main.zoom===1?2:1;this.cameras.main.setZoom(z);this.cameras.main.centerOn(683,410);document.querySelector('#zoom').textContent='Zoom '+z+'×'};
    selectPack();
    window.__SKILL_REVISE__={ready:true,packs:catalogue.packs,select:(id,name)=>{chosen.value=id;selectPack();if(name){clips.value=name;play()}},snapshot:()=>({frame:this.actor.frame.name,history:this.history,completed:this.completed,playing:this.actor.anims.isPlaying,origin:[this.actor.originX,this.actor.originY],scale:this.actor.scaleX,zoom:this.cameras.main.zoom})};
  }
}
new Phaser.Game({type:Phaser.AUTO,width:1366,height:768,parent:'canvas',backgroundColor:'#28332d',render:{antialias:true},scene:Review,audio:{noAudio:true}});

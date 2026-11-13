const Phaser = window.Phaser;
const sword = new URLSearchParams(location.search).get("phai") === "kiem-ton";
const pack = "/assets/exports/characters/con_luan_skill_preview/";
const approved = "/assets/exports/characters/con_luan_thien_su_v03/";
const vfx = "con_luan_spell_fx";
const monk = "hero_con_luan_thien_su";
const monkFx = "con_luan_thien_su_fx";
const branch = sword ? "kiem_ton" : monk;
const directions = { down: [0,1], left: [-1,0], right: [1,0], up: [0,-1] };
const beats = ["thrust", "sweep", "rising", "overhead"];
// Torso centers on the Chaos cels, measured relative to the feet pivot.
const chaosTorso = { down: [-4,-59], left: [37,-59], right: [-37,-59], up: [-23,-59] };
const monkRingScale = 1.2;
const starRadius = { x:138 * Math.sqrt(1.2), y:88 * Math.sqrt(1.2) };
const starDuration = 5000;
const starPulseInterval = 1000;
const viewActions = sword ? {
  P: "Huyền Thiên Vô Cực Công", A: "Cầu sét / Kiếm sét", S: "Kinh Lôi", Q: "Lôi Động Thiên Địa",
  W: "Điện Quang Lôi Ảnh", E: "Bạo Lôi Kiếm Canh", R: "Lôi Long Thiên Tường", T: "Trận pháp năm kiếm",
} : {
  P: "Huyền Thiên Vô Cực Công", A: "Đánh thường", Q: "Ngũ Lôi Chính Pháp · Đổi thế", W: "Cuồng Lôi Chấn Địa",
  E: "Ngũ Lôi Chính Pháp · Vòng sét", R: "Thiên Lôi Trấn Nhạc", T: "Vô Cực Phong Lôi Quyết",
};
const status = document.getElementById("status");
document.getElementById("school").textContent = "Côn Luân " + (sword ? "Kiếm Tôn" : "Thiền Sư");

class Review extends Phaser.Scene {
  preload() {
    this.load.image("ground", "/assets/exports/renovation-v2/arena-ground.png");
    this.load.atlas("dummy", "/assets/exports/renovation-v1/creep_bandit_grunt.png",
      "/assets/exports/renovation-v1/creep_bandit_grunt.json");
    for (const key of ["kiem_ton", "thien_su_extra", vfx]) {
      this.load.aseprite(key, pack + key + ".png", pack + key + ".json");
    }
    for (const key of [monk, monkFx]) {
      this.load.aseprite(key, approved + key + ".png", approved + key + ".json");
    }
    this.load.json("sockets", approved + "hammer-sockets.json");
  }

  create() {
    this.eventsLog = [];
    this.effects = new Set();
    this.planted = [];
    this.six = 0;
    this.plantCharges = 3;
    this.plantReady = 0;
    this.strike = 0;
    this.ranged = false;
    this.chaos = false;
    this.starCasting = false;
    this.busy = false;
    this.facing = "right";
    this.wReady = 0;
    this.x = 1560;
    this.y = 1152;
    this.add.image(0, 0, "ground").setOrigin(0).setDepth(-10);
    this.actor = this.add.sprite(this.x, this.y, branch, "idle_right_0").setOrigin(.5, .75);
    this.actor.on("animationupdate", (anim, frame) => this.note("frame", { key: anim.key, frame: frame.textureFrame }));
    this.blade = this.add.image(0, 0, vfx, "jian_0").setVisible(sword);
    this.coil = this.add.sprite(0, 0, monkFx, "coil_0").setVisible(false);
    this.aura = this.add.image(0, 0, vfx, "chaos_aura_0").setVisible(false);
    this.sockets = this.cache.json.get("sockets");
    this.dummies = [[1765,1152],[1768,1075],[1757,1232],[1557,980],[1390,1160],[1555,1337]]
      .map(([x,y]) => this.add.sprite(x, y, "dummy", "idle_down_0").setOrigin(.5, 224/256).setDepth(y));
    for (const texture of [monk, monkFx, vfx, "kiem_ton"]) this.register(texture);
    this.coil.play(monkFx + ":coil");
    this.keys = this.input.keyboard.createCursorKeys();
    for (const [key, label] of Object.entries(viewActions)) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = label;
      button.textContent = key;
      button.setAttribute("aria-label", key + " · " + label);
      button.onclick = () => { button.blur(); this.action(key); };
      document.getElementById("controls").append(button);
    }
    window.addEventListener("keydown", (event) => {
      const key = event.code.slice(3);
      if (event.repeat || !event.code.startsWith("Key") || !(key in viewActions)) return;
      event.preventDefault();
      this.action(key);
    });
    this.cameras.main.setBounds(0,0,3200,2304).startFollow(this.actor, true, .18, .18, -60, 38);
    this.locomotion(false);
    window.conLuanReview = {
      snapshot: () => ({
        phaser: Phaser.VERSION, zoom: this.cameras.main.zoom, branch, facing: this.facing,
        x: this.x, y: this.y, frame: this.actor.frame.name,
        texture: this.actor.texture.key, feet: [this.actor.displayOriginX, this.actor.displayOriginY],
        blade: { visible: this.blade.visible, angle: this.blade.angle, x: this.blade.x, y: this.blade.y },
        planted: this.planted.length, plantCharges: this.plantCharges, readyW: this.time.now >= this.wReady,
        chaos: this.chaos, ranged: this.ranged, busy: this.busy,
        aura: { visible:this.aura.visible, x:this.aura.x, y:this.aura.y },
        effects: [...this.effects].map((sprite) => sprite.frame.name),
        log: this.eventsLog.slice(),
      }),
    };
  }

  register(texture) {
    const atlas = this.cache.json.get(texture);
    const names = Object.keys(atlas.frames);
    for (const tag of atlas.meta.frameTags) {
      if (tag.from === tag.to) continue;
      const frames = names.slice(tag.from, tag.to + 1).map((frame) => ({
        key: texture, frame, duration: atlas.frames[frame].duration,
      }));
      this.anims.create({ key: texture + ":" + tag.name, frames,
        duration: frames.reduce((sum, frame) => sum + frame.duration, 0),
        repeat: /^(idle_|walk_|coil$)/.test(tag.name) ? -1 : 0, skipMissedFrames: false });
    }
  }

  note(event, data = {}) {
    this.eventsLog.push({ event, ...data });
    if (this.eventsLog.length > 320) this.eventsLog.shift();
  }

  say(label) {
    status.textContent = label;
    this.statusTimer?.remove(false);
    this.statusTimer = this.time.delayedCall(1800, () => { status.textContent = ""; });
  }

  pose(texture, tag) {
    const key = texture + ":" + tag;
    if (this.anims.exists(key)) {
      this.actor.play(key, true);
    } else if (this.actor.texture.key !== texture || this.actor.frame.name !== tag + "_0") {
      this.actor.anims.stop();
      this.actor.setTexture(texture, tag + "_0");
    }
  }

  locomotion(moving) {
    if (!sword && this.chaos) this.pose("thien_su_extra", "chaos_" + this.facing);
    else this.pose(branch, (moving ? "walk_" : "idle_") + this.facing);
  }

  cast(texture, tag, duration) {
    this.busy = true;
    this.actor.setScale(this.chaos ? 1.34 : 1);
    this.pose(texture, tag + "_" + this.facing);
    this.time.delayedCall(duration, () => {
      this.busy = false;
      this.actor.setScale(1);
      this.locomotion(false);
    });
  }

  action(key) {
    if (this.busy) return;
    this.say(viewActions[key]);
    this.note("input", { key, facing: this.facing });
    if (key === "P") {
      const x = sword ? this.blade.x : this.x + 14;
      const y = sword ? this.blade.y - 32 : this.y - 41;
      this.fx(sword ? "violet_stagger" : "gold_ember",x,y,{duration:430,depth:this.y+3});
      return;
    }
    if (sword) this.swordAction(key);
    else this.monkAction(key);
  }

  point(distance, height = 0) {
    const [dx,dy] = directions[this.facing];
    return { x: this.x + dx * distance, y: this.y + dy * distance - height };
  }

  target() {
    const p = this.point(208);
    return this.dummies.reduce((best, dummy) => {
      const distance = (actor) => Phaser.Math.Distance.Between(actor.x, actor.y, p.x, p.y);
      return distance(dummy) < distance(best) ? dummy : best;
    });
  }

  fx(tag, x, y, options = {}) {
    const { texture = vfx, duration = 260, scale = 1, alpha = 1, angle = 0,
      depth = y + 8, persist = false, fade = true } = options;
    const sprite = this.add.sprite(x,y,texture,tag + "_0").setDepth(depth)
      .setScale(scale).setAlpha(alpha).setRotation(angle);
    this.effects.add(sprite);
    this.note("fx", { tag, x: Math.round(x), y: Math.round(y) });
    if (this.anims.exists(texture + ":" + tag)) {
      sprite.play(texture + ":" + tag);
      if (!persist) sprite.once("animationcomplete", () => this.removeFx(sprite));
    } else if (!persist) {
      if (fade) this.tweens.add({ targets: sprite, alpha: 0, duration, hold: 0,
        onComplete: () => this.removeFx(sprite) });
      else this.time.delayedCall(duration, () => this.removeFx(sprite));
    }
    return sprite;
  }

  removeFx(sprite) {
    if (this.effects.delete(sprite)) sprite.destroy();
  }

  travel(tag, start, end, duration, options = {}, impact = () => {}) {
    const sprite = this.fx(tag, start.x, start.y, { ...options, persist: true });
    this.tweens.add({ targets: sprite, x: end.x, y: end.y, duration,
      onComplete: () => { this.removeFx(sprite); impact(); } });
  }

  strikeTarget(tag, target, height = 42, options = {}) {
    this.fx(tag, target.x - 4, target.y - height, { depth: target.depth + 2, ...options });
  }

  monkAction(key) {
    const target = this.target();
    if (key === "Q") {
      this.ranged = !this.ranged;
      this.note("toggle", { ranged: this.ranged });
      return;
    }
    if (key === "A") {
      const hit = this.ranged ? "ranged" : "melee_" + (this.strike % 4 + 1);
      this.cast(monk, hit, this.ranged ? 410 : 375);
      if (this.ranged) this.time.delayedCall(105, () => {
        this.strikeTarget("bolt", target, 42, { texture: monkFx });
        for (const dummy of this.dummies.filter((d) => d !== target &&
          Phaser.Math.Distance.Between(d.x,d.y,target.x,target.y) < 100).slice(0,2)) {
          const x = dummy.x-target.x, y = dummy.y-target.y;
          const branch = this.fx("edge",target.x+x/2,target.y-42+y/2,
            { angle: Math.atan2(y,x), duration: 150, depth: dummy.depth+2, scale: .55 });
          branch.setTint(0xffd875);
          this.strikeTarget("gold_ember",dummy);
        }
      });
      else {
        const beat = beats[this.strike++ % 4];
        this.fx("trail_" + beat + "_" + this.facing, this.x,this.y,
          { texture: monkFx, depth: this.y + (this.facing === "up" ? -1 : 1) });
        if (beat === "overhead") this.time.delayedCall(135, () => {
          const [x,y] = this.sockets["melee_4_" + this.facing + "_1"];
          this.fx("slam", this.x+x, this.y+y+5, { texture: monkFx });
        });
      }
      return;
    }
    if (key === "W") {
      this.cast(monk, "melee_4", 430);
      const [x,y] = this.sockets["melee_4_" + this.facing + "_1"];
      this.time.delayedCall(135, () => {
        this.fx("gold_burst", this.x+x, this.y+y+5);
        this.fx("gold_stagger", this.x+x, this.y+y-32, { duration: 500 });
        for (const dummy of this.dummies.filter((d) =>
          Phaser.Math.Distance.Between(d.x,d.y,this.x+x,this.y+y) <= 125)) {
          this.strikeTarget("gold_stagger", dummy, 82, { duration: 500 });
        }
      });
    }
    if (key === "E") {
      this.cast(monk, "ranged", 420);
      const x = this.x, y = this.y;
      const fullScale = 2.45 * monkRingScale, radius = 250 * monkRingScale, duration = 460;
      const ring = this.fx("gold_ring", x,y,
        { scale: .22 * monkRingScale, depth:y-2, persist:true });
      this.tweens.add({ targets:ring, scaleX:fullScale, scaleY:fullScale, duration,
        onComplete: () => {
          this.removeFx(ring);
          const fade = this.fx("gold_ring_fade",x,y,{scale:fullScale,duration:220,depth:y-2});
          this.note("ring_extent",{scale:fade.scaleX,radius});
        } });
      for (const dummy of this.dummies) {
        const distance = Phaser.Math.Distance.Between(x,y,dummy.x,dummy.y);
        if (distance <= radius) this.time.delayedCall(duration * distance / radius, () =>
          this.strikeTarget("gold_ember",dummy,1,{ duration:420 }));
      }
    }
    if (key === "R") {
      const facing = this.facing, start = this.point(44,47), end = this.point(220,30);
      this.cast("thien_su_extra", "throw", 430);
      const sparks = this.fx("coil", start.x,start.y,{texture:monkFx,persist:true,depth:this.y+152});
      const [dx,dy] = directions[facing];
      sparks.setPosition(start.x+dx*26,start.y+dy*26);
      this.tweens.add({ targets:sparks, x:end.x+dx*26,y:end.y+dy*26,duration:270 });
      this.travel("hammer_" + facing,start,end,270,{ depth:this.y+150 },() => {
        this.removeFx(sparks);
        this.fx("gold_burst",end.x,end.y+30);
        for (const dummy of this.dummies.filter((d) =>
          Phaser.Math.Distance.Between(d.x,d.y,end.x,end.y+30) < 105)) {
          this.strikeTarget("gold_stagger",dummy,83,{duration:480});
        }
      });
    }
    if (key === "T") {
      this.chaos = true;
      this.chaosTimer?.remove(false);
      this.note("chaos", { active:true });
      this.fx("gold_ember",this.x,this.y-53,{scale:2,duration:430});
      this.chaosTimer = this.time.delayedCall(4400, () => {
        this.chaos = false;
        this.actor.setScale(1);
        this.note("chaos", { active:false });
        this.fx("gold_ember",this.x,this.y-38);
      });
    }
  }

  swordAction(key) {
    const target = this.target();
    if (key === "A") {
      const finisher = this.six === 6;
      this.six = finisher ? 0 : this.six + 1;
      this.cast(branch,"cast",210);
      const start = this.point(28,51), end = {x:target.x-4,y:target.y-42};
      this.travel(finisher ? "blade" : "orb",start,end,240,
        { angle:Math.atan2(end.y-start.y,end.x-start.x), depth:target.depth+1 },
        () => this.strikeTarget("violet_impact",target,42,{scale:finisher?1:.5}));
      this.note("basic", { finisher });
    }
    if (key === "S") {
      if (this.planted.length >= 3) return this.say("Kinh Lôi · Đã cắm 3 kiếm");
      if (!this.plantCharges) {
        if (this.time.now < this.plantReady) return this.say("Kinh Lôi · Đang hồi");
        this.plantCharges = 3;
      }
      if (--this.plantCharges === 0) this.plantReady = this.time.now + 3600;
      const point = this.point(9);
      const field = this.fx("field",point.x,point.y,{alpha:.55,depth:point.y-3,persist:true});
      const blade = this.fx("anchor",point.x,point.y,{persist:true});
      const marker = { ...point, field, blade };
      this.planted.push(marker);
      marker.expiry = this.time.delayedCall(60000,() => this.removeMarker(marker));
      this.fx("violet_impact",point.x,point.y,{scale:.52});
      this.moveCast(-64,170);
      this.note("plant", { count:this.planted.length });
    }
    if (key === "Q") {
      if (!this.planted.length) return this.say("Cắm kiếm bằng S trước");
      this.cast(branch,"cast",220);
      const markers = [...this.planted];
      this.time.delayedCall(90,() => {
        for (const marker of markers) {
          this.removeMarker(marker);
          this.fx("violet_bolt",marker.x,marker.y,{duration:450,fade:false});
          this.fx("violet_ring",marker.x,marker.y,{duration:420,scale:1.15});
        }
        this.note("detonate",{count:markers.length});
      });
    }
    if (key === "W") {
      if (this.time.now < this.wReady) return this.say("Điện Quang Lôi Ảnh · Đang hồi");
      this.wReady = this.time.now + 2200;
      const [dx,dy] = directions[this.facing];
      const wake = this.point(46,18);
      this.fx("dash",wake.x,wake.y,{angle:Math.atan2(dy,dx),duration:280});
      this.moveCast(136,180,true);
    }
    if (key === "E") {
      this.cast(branch,"cast",480);
      const [dx,dy] = directions[this.facing], heading = Math.atan2(dy,dx);
      const start = this.point(15,42);
      for (const [i,offset] of [-45,-22.5,0,22.5,45].entries()) {
        const angle = heading + offset*Math.PI/180;
        this.time.delayedCall(i*65,() => this.travel("blade",start,
          {x:start.x+Math.cos(angle)*178,y:start.y+Math.sin(angle)*178},160,
          {angle,depth:this.y+15,scale:.7}));
      }
      this.note("fan",{degrees:90,count:5});
    }
    if (key === "R") {
      this.cast(branch,"cast",320);
      const start = this.point(32,48), impact = {x:target.x-4,y:target.y-42};
      const angle = Math.atan2(impact.y-start.y,impact.x-start.x);
      const lead = Math.min(60,Math.hypot(impact.x-start.x,impact.y-start.y));
      const end = {x:impact.x-lead*Math.cos(angle),y:impact.y-lead*Math.sin(angle)};
      this.travel("dragon_head",start,end,300,{ angle,depth:target.depth+1 },() => {
          this.strikeTarget("violet_impact",target);
          this.strikeTarget("violet_stagger",target,83,{duration:490});
      });
    }
    if (key === "T" && !this.starCasting) this.star();
  }

  removeMarker(marker) {
    this.removeFx(marker.field);
    this.removeFx(marker.blade);
    marker.expiry.remove(false);
    this.planted = this.planted.filter((candidate) => candidate !== marker);
  }

  moveCast(distance,duration,dash = false) {
    const start = { x:this.x, y:this.y }, end = this.point(distance);
    this.cast(branch,dash?"walk":"cast",duration+30);
    const travel = { progress:0 };
    this.tweens.add({ targets:travel, progress:1, duration, onUpdate: () => {
      const old = [this.x,this.y];
      this.x = Phaser.Math.Clamp(Phaser.Math.Linear(start.x,end.x,travel.progress),1200,2020);
      this.y = Phaser.Math.Clamp(Phaser.Math.Linear(start.y,end.y,travel.progress),865,1480);
      this.crossField(old);
    }});
  }

  crossField(old) {
    if (this.time.now >= this.wReady) return;
    for (const marker of this.planted) {
      const distance = (x,y) => Math.hypot((x-marker.x)/102,(y-marker.y)/36);
      if (distance(...old) > 1 && distance(this.x,this.y) <= 1) {
        this.wReady = 0;
        this.fx("violet_ring",marker.x,marker.y,{scale:1.4,depth:marker.y-1});
        this.note("dash_reset");
        this.say("Điện Quang Lôi Ảnh · Hồi chiêu");
        break;
      }
    }
  }

  star() {
    this.starCasting = true;
    this.cast(branch,"cast",660);
    const center = { x:this.x, y:this.y };
    const points = Array.from({length:5},(_,i) => {
      const theta = -Math.PI/2 + i*2*Math.PI/5;
      return {x:center.x+Math.cos(theta)*starRadius.x,y:center.y+Math.sin(theta)*starRadius.y};
    });
    const start = {x:this.blade.x,y:this.blade.y-36}, anchors = [];
    points.forEach((point,index) => {
      this.time.delayedCall(index*54,() => this.travel("anchor",start,point,270,
        {depth:point.y+110},() => {
          anchors.push(this.fx("anchor",point.x,point.y,{persist:true}));
          this.fx("violet_impact",point.x,point.y,{scale:.52});
          if (anchors.length === points.length) this.activateStar(center,points,anchors);
        }));
    });
  }

  activateStar(center,points,anchors) {
    const edges = points.map((p,i) => {
      const q = points[(i+2)%5], dx=q.x-p.x, dy=q.y-p.y;
      const edge = this.fx("edge",p.x+dx/2,p.y+dy/2,{persist:true,angle:Math.atan2(dy,dx),depth:0});
      edge.setScale(Math.hypot(dx,dy)/168, .70);
      return edge;
    });
    const field = new Phaser.Geom.Polygon(points);
    this.note("star",{anchors:anchors.length,edges:edges.length,center,points,at:this.time.now});
    const pulse = (beat) => {
      this.note("star_pulse",{beat,at:this.time.now});
      if (beat === 0) {
        this.fx("violet_bolt",center.x,center.y-8,
          {duration:320,scale:1.3,fade:false,depth:center.y+125});
      }
      for (const point of points) {
        this.fx("violet_impact",point.x,point.y,{scale:.53,duration:310,depth:center.y+124});
      }
      for (const dummy of this.dummies) {
        if (!Phaser.Geom.Polygon.Contains(field,dummy.x,dummy.y)) continue;
        this.strikeTarget("violet_impact",dummy,42,{scale:.55});
        if (beat === 0) this.strikeTarget("violet_stagger",dummy,83,{duration:470});
      }
    };
    pulse(0);
    for (let beat = 1; beat < starDuration / starPulseInterval; beat++) {
      this.time.delayedCall(beat * starPulseInterval,() => pulse(beat));
    }
    this.time.delayedCall(starDuration,() => {
      for (const sprite of [...anchors,...edges]) this.removeFx(sprite);
      this.starCasting = false;
      this.note("star_end",{at:this.time.now});
    });
  }

  update(_,delta) {
    if (!this.actor) return;
    if (!this.busy) {
      const direction = Object.keys(directions).find((key) => this.keys[key].isDown);
      if (direction) {
        this.facing = direction;
        const [dx,dy] = directions[direction], old = [this.x,this.y];
        this.x = Phaser.Math.Clamp(this.x + dx * Math.min(delta,35)*.15,1200,2020);
        this.y = Phaser.Math.Clamp(this.y + dy * Math.min(delta,35)*.15,865,1480);
        if (sword) this.crossField(old);
      }
      this.locomotion(Boolean(direction));
    }
    this.actor.setPosition(Math.round(this.x),Math.round(this.y)).setDepth(this.y);
    if (sword) {
      const offsets = { down:[-28,-22],left:[31,-19],right:[-31,-19],up:[23,-10] };
      const [x,y] = offsets[this.facing];
      this.blade.setPosition(this.x+x,this.y+y+Math.round(Math.sin(this.time.now/180)*2))
        .setDepth(this.y+(this.facing==="up"?1:-1));
    } else {
      const chaos = this.chaos;
      const [auraX,auraY] = this.actor.frame.name.startsWith("chaos_") ? chaosTorso[this.facing] : [0,-44];
      this.aura.setVisible(chaos).setPosition(this.actor.x+auraX*this.actor.scaleX,
        this.actor.y+auraY*this.actor.scaleY).setDepth(this.y+3)
        .setAlpha(.68 + .28*Math.sin(this.time.now/69)**2);
      const anchor = this.sockets[this.actor.frame.name];
      this.coil.setVisible(this.ranged && Boolean(anchor) && this.actor.texture.key === monk);
      if (anchor) this.coil.setPosition(this.x+anchor[0]*this.actor.scaleX,
        this.y+anchor[1]*this.actor.scaleY).setDepth(this.y+1);
    }
  }
}

new Phaser.Game({ type:Phaser.AUTO, parent:"canvas", pixelArt:true, roundPixels:true,
  render:{preserveDrawingBuffer:true}, scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},scene:Review });

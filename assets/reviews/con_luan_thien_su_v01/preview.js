const Phaser = window.Phaser;
const bodyKey = "hero_con_luan_thien_su";
const fxKey = "con_luan_thien_su_fx";
const exportsPath = "/assets/exports/characters/con_luan_thien_su_v02/";
const meleeBeats = ["thrust", "sweep", "rising", "overhead"];
const arenaPath = "/assets/exports/renovation-v1/";
const directions = {
  down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1],
};
class Review extends Phaser.Scene {
  preload() {
    this.load.json("hammerSockets", exportsPath + "hammer-sockets.json");
    this.load.image("ground", "/assets/exports/renovation-v2/arena-ground.png");
    this.load.image("lantern", "/assets/exports/arena_art01/lantern.png");
    this.load.atlas("bong", arenaPath + "hero_cai_bang.png", arenaPath + "hero_cai_bang.json");
    this.load.atlas("dummy", arenaPath + "creep_bandit_grunt.png", arenaPath + "creep_bandit_grunt.json");
    for (const key of [bodyKey, fxKey]) {
      this.load.aseprite(key, exportsPath + key + ".png", exportsPath + key + ".json");
    }
    this.load.on("loaderror", (file) => console.error("Asset preview load error:", file.key, file.src));
  }

  create() {
    this.add.image(0, 0, "ground").setOrigin(0).setDepth(-1);
    this.actor = this.add.sprite(1570, 1180, bodyKey, "idle_down_0")
      .setOrigin(112 / 224, 132 / 176).setDepth(1180);
    this.hammerSockets = this.cache.json.get("hammerSockets");
    this.add.sprite(1400, 1238, "bong", "idle_down_0").setOrigin(.5, 224 / 256).setDepth(1238);
    for (const [x, y] of [[1455, 1075], [1750, 1260]]) {
      this.add.image(x, y, "lantern").setOrigin(.5, 180 / 192).setDepth(y);
    }
    this.dummies = Object.fromEntries(Object.entries(directions).map(([direction, [dx, dy]]) => {
      const x = 1570 + dx * 188;
      const y = 1180 + dy * 170;
      return [direction, this.add.sprite(x, y, "dummy", "idle_down_0")
        .setOrigin(.5, 224 / 256).setDepth(y)];
    }));
    for (const key of [bodyKey, fxKey]) {
      const atlas = this.cache.json.get(key);
      const frameNames = Object.keys(atlas.frames);
      for (const tag of atlas.meta.frameTags) {
        const frames = frameNames.slice(tag.from, tag.to + 1).map((frame) => ({
          key, frame, duration: atlas.frames[frame].duration,
        }));
        this.anims.create({
          key: tag.name, frames,
          duration: frames.reduce((total, frame) => total + frame.duration, 0),
          repeat: /^(idle_|walk_|coil$)/.test(tag.name) ? -1 : 0,
          skipMissedFrames: false,
        });
      }
    }
    this.coil = this.add.sprite(0, 0, fxKey, "coil_0").setOrigin(.5)
      .setVisible(false);
    this.effects = new Set();
    this.facing = "down";
    this.state = "idle";
    this.nextStrike = 1;
    this.ranged = false;
    this.released = false;
    this.attackType = null;
    this.actionStart = null;
    this.log = [];
    this.coil.on("animationupdate", (anim, frame) => {
      if (this.ranged) this.note("effect", { key: anim.key, frame: frame.textureFrame });
    });
    this.coil.play("coil");

    this.actor.on("animationstart", (anim, frame) => {
      this.note("start", { key: anim.key, frame: frame.textureFrame });
    });
    this.actor.on("animationupdate", (anim, frame) => {
      this.note("frame", { key: anim.key, frame: frame.textureFrame });
      if (this.released || !this.attackType || frame.index !== 2) return;
      this.released = true;
      if (this.attackType === "ranged") {
        const target = this.dummies[this.facing];
        const hitX = target.x - 4;
        const hitY = target.y - 42;
        this.effect("bolt", hitX, hitY, target.depth + 2);
        this.note("bolt", { x: hitX, y: hitY, targetX: target.x, targetFoot: target.y,
          frame: frame.textureFrame });
      } else if (this.nextStrike === 4) {
        const [x, y] = this.hammerSockets[frame.textureFrame];
        this.effect("slam", this.actor.x + x, this.actor.y + y + 5, this.actor.depth + 2);
        this.note("slam", { x: this.actor.x + x, y: this.actor.y + y + 5,
          frame: frame.textureFrame });
      }
    });
    this.actor.on("animationrepeat", (anim) => this.note("loop", { key: anim.key }));
    this.actor.on("animationcomplete", (anim) => {
      this.note("complete", { key: anim.key, elapsed: Math.round(this.time.now - this.actionStart) });
      if (this.attackType === "melee") this.nextStrike = this.nextStrike % 4 + 1;
      this.attackType = null;
      this.state = "idle";
      this.play("idle");
    });

    this.keys = this.input.keyboard.createCursorKeys();
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.code === "KeyA") this.attack();
      if (event.code === "KeyQ") this.toggle();
    });
    document.getElementById("attack").addEventListener("click", (event) => {
      event.currentTarget.blur();
      this.attack();
    });
    document.getElementById("toggle").addEventListener("click", (event) => {
      event.currentTarget.blur();
      this.toggle();
    });

    this.cameras.main.startFollow(this.actor, true, 1, 1, 0, 36);
    this.cameras.main.setBounds(0, 0, 3200, 2304);
    this.play("idle");
    window.thienSuReview = {
      snapshot: () => ({
        phaser: Phaser.VERSION,
        key: this.actor.anims.currentAnim.key,
        frame: this.actor.frame.name,
        x: this.actor.x, y: this.actor.y,
        facing: this.facing,
        ranged: this.ranged,
        coil: this.coil.visible,
        effects: [...this.effects].map((fx) => ({ x: fx.x, y: fx.y, frame: fx.frame.name })),
        feet: [this.actor.displayOriginX, this.actor.displayOriginY],
        scale: this.actor.scaleX,
        zoom: this.cameras.main.zoom,
        log: this.log.slice(),
      }),
    };
  }

  note(event, data) {
    this.log.push({ event, at: Math.round(this.time.now), ...data });
    if (this.log.length > 320) this.log.shift();
  }

  play(state) {
    this.actor.play(state + "_" + this.facing, true);
  }

  toggle() {
    if (this.attackType) return;
    this.ranged = !this.ranged;
    this.coil.setVisible(this.ranged);
    document.getElementById("toggle").setAttribute("aria-pressed", String(this.ranged));
    this.note("toggle", { ranged: this.ranged });
  }

  attack() {
    if (this.attackType) return;
    this.attackType = this.ranged ? "ranged" : "melee";
    this.released = false;
    this.actionStart = this.time.now;
    this.play(this.ranged ? "ranged" : "melee_" + this.nextStrike);
    if (!this.ranged) {
      const beat = meleeBeats[this.nextStrike - 1];
      this.effect("trail_" + beat + "_" + this.facing, this.actor.x, this.actor.y,
        this.actor.depth + (this.facing === "up" ? -1 : 1));
    }
  }

  effect(key, x, y, depth) {
    const sprite = this.add.sprite(x, y, fxKey, key + "_0")
      .setOrigin(.5).setDepth(depth);
    this.effects.add(sprite);
    this.note("effect", { key, frame: sprite.frame.name });
    sprite.on("animationupdate", (anim, frame) => {
      this.note("effect", { key: anim.key, frame: frame.textureFrame });
    });
    const cleanup = () => {
      this.effects.delete(sprite);
      sprite.destroy();
    };
    sprite.once("animationcomplete", cleanup).play(key);
  }

  update(_, delta) {
    if (!this.actor) return;
    if (!this.attackType) {
      const direction = Object.keys(directions).find((key) => this.keys[key].isDown);
      if (direction) {
        const [dx, dy] = directions[direction];
        this.facing = direction;
        const step = Math.min(delta, 35) * .13;
        this.actor.x = Phaser.Math.Clamp(this.actor.x + dx * step, 1220, 1920);
        this.actor.y = Phaser.Math.Clamp(this.actor.y + dy * step, 900, 1450);
        this.actor.setDepth(this.actor.y);
      }
      this.state = direction ? "walk" : "idle";
      this.play(this.state);
    }
    if (this.ranged) {
      const [x, y] = this.hammerSockets[this.actor.frame.name];
      this.coil.setPosition(this.actor.x + x, this.actor.y + y).setDepth(this.actor.depth + 1);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "canvas",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: Review,
});

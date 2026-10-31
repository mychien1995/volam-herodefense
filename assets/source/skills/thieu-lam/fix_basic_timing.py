from pathlib import Path
p=Path(__file__).resolve().parent/'review.mjs';s=p.read_text(encoding='utf-8')
s=s.replace("if (t < 320) hero.setFrame('basic_attack_' + d + '_' + Math.floor(t / 80));","""let age = t;
    const frames = Object.keys(baseAtlas.frames).filter(name => name.startsWith('basic_attack_' + d + '_'));
    for (const name of frames) {
      const duration = baseAtlas.frames[name].duration;
      if (age < duration) { hero.setFrame(name); return; }
      age -= duration;
    }""")
p.write_text(s,encoding='utf-8')

from pathlib import Path
base=Path(__file__).resolve().parent
original=base.parent/'vo-dang'
s=(original/'review.mjs').read_text(encoding='utf-8')
s=s.replace('vo-dang','thieu-lam').replace('VO_DANG','THIEU_LAM').replace('hero_vo_dang_kiem','hero_thieu_lam_dao').replace('hero_vo_dang','hero_thieu_lam').replace("skill === 'vo_dang_kiem' || (char && char.frameDimensions[0] === 96)","entry.style === 'dao'")
s=s.replace("skill === 'vo_dang_quyen' || skill === 'vo_dang_kiem'","false")
s=s.replace("let scene,","const frameEvents = {};\nlet scene,")
s=s.replace("tracked.push({ sprite, a, anim, anchor: [x, y] });","tracked.push({ sprite, a, anim, anchor: [x, y] });\n          const record = () => { const key = a.id + ':' + anim.name; (frameEvents[key] ??= []).includes(sprite.frame.name) || frameEvents[key].push(sprite.frame.name); };\n          sprite.on('animationupdate', record); sprite.on('animationrepeat', record); record();")
s=s.replace("errors,\n        selectedIcon", "errors,\n        frameEvents,\n        selectedIcon")
start=s.index('function render(time) {')
end=s.index("window.addEventListener('keydown'",start)
s=s[:start]+"""function render(time) {
  if (!scene || !actors.length) return;
  for (const e of ephemeral) e.sprite.destroy();
  ephemeral.length = 0;
  const t = time % 2400, hit=document.querySelector('#hit').checked, empowered=document.querySelector('#empowered').checked;
  for (const actor of actors) {
    const {x,y,d,ex,ey}=actor,[dx,dy]=vec[d];
    character(actor,t);
    if(!vfx)continue;
    const stages=[...new Set(vfx.animations.map(a=>a.stage))];
    const field=['kim_quang_ho_tran','bat_dong_minh_vuong'].includes(skill);
    for(const stage of stages){
      if(stage.startsWith('empowered_') && !empowered)continue;
      if(empowered && stages.includes('empowered_'+stage))continue;
      const anim=vfx.animations.find(a=>a.stage===stage && (a.direction===d || a.direction==='none'));
      let start=160,bx=x,by=y,age;
      if(['preparation','windup'].includes(stage))start=0;
      if(['release','slash','sweep','spin'].includes(stage.replace('empowered_','')))start=180;
      if(['impact','empowered_impact'].includes(stage)){if(!hit)continue;start=230;bx=ex;by=ey-22;}
      if(['armor_break','slow'].includes(stage)){if(!hit)continue;start=350;bx=ex;by=ey;}
      if(stage==='activation')start=80;
      if(stage==='loop'){start=360;if(t>=1300)continue;}
      if(['pulse','healing_pulse'].includes(stage))start=700;
      if(stage==='guard')start=330;
      if(stage==='hit_response'){if(!hit)continue;start=650;}
      if(stage==='ground_impact')start=220;
      if(stage==='aftereffect')start=400;
      if(stage==='ally_defense'){start=650;bx=x+dx*45;by=y+dy*45;}
      if(stage==='ending')start=field || skill==='kim_cang_bat_hoai' || skill==='nhu_lai_niet_ban'?1400:520;
      if(stage==='travel'){start=240;if(t>=1000)continue;const distance=28+Math.max(0,t-start)*.12;bx=x+dx*distance;by=y-22+dy*distance;}
      age=t-start;
      effect(stage,bx,by,age,d);
    }
  }
}
""" + s[end:]
(base/'review.mjs').write_text(s,encoding='utf-8')
s=(original/'review.html').read_text(encoding='utf-8').replace('Võ Đang','Thiếu Lâm').replace('Hit / counter trigger','Confirmed hit demo').replace('<input id="qi" type="checkbox" />Basic qi demo','<input id="empowered" type="checkbox" />Same-target finisher demo')
s=s.replace('production prototypes await\n      final approval','prototypes · approval gate waived by user')
(base/'review.html').write_text(s,encoding='utf-8')
s=(original/'serve.mjs').read_text(encoding='utf-8').replace('vo-dang','thieu-lam').replace('8766','8768')
(base/'serve.mjs').write_text(s,encoding='utf-8')
print('Adapted existing Phaser atlas loader, registry and review surface; no gameplay imports.')

// Portable presentation contract for the later integration session; no game imports.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FEEDBACK_R2} from '../../feedback-r2.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const components=manifest.components.filter(c=>c.id.endsWith('_r2')).map(c=>({
  id:c.id,mapping:c.mapping,source:c.sourceFile,sheet:c.sheet,atlas:c.atlas,
  dimensions:c.canvas,pivot:c.pivot,origin:c.origin,
  animations:c.animations.map(a=>({name:a.name,frames:a.frames,durationsMs:a.frameDurationsMs,direction:a.direction,phase:a.phase,loop:a.loop})),
}));
const contract={revision:2,date:'2026-11-02',scope:'Art/choreography only. No production integration or authoritative gameplay values.',
  directorApproved:false,productionIntegrated:false,phaserProductionVerified:false,tuning:FEEDBACK_R2,components,
  bindings:{
    shaolinBasic:'First three beats only: outbound local translation32; fourth roundhouse unchanged.',
    viDa:'Preserve canonical vi_da_quyen identity. Multiply original feet-to-eruption offset by1.3; no skill-branch change.',
    shaolinDao:'Move authored qi so its peak forward visible reach is1.2 times measured original bounds; never enlarge a hitbox.',
    nhuLai:'Eight visual emissions,220ms apart, each independent intro/glide/impact/outro; repeat retained cast pose with visual timing fit.',
    sonic:'Use r2 wave tags. Attach local root to fistTips per hand/direction; convex edge faces heading.360ms outward translation, no homing.',
    nhanKiem:'Preview actor fades at departure, vanishes, appears175 units along facing at arrival. Sword stays fixed at its endpoint through the1.5s hold. This demonstrates requested blink, not server teleport timing/authority.',
    lietPhong:'Longer slash plus separately authored ground-break at1350ms preview time, root28 ahead of feet. Ground layer remains below actors; ending fades over160ms.',
    bachLiet:'Nine distinct moving blade bursts,200ms apart; flurry extended. Phase durations remain suggestions.',
    khangLong:'Travel200 instead of125 in850ms instead of1050ms:1.6x distance and about1.98x apparent speed.',
  },
  originalAssets:'All previous source/export bytes retained; hash snapshot in source/revisions/before_feedback_r2/artifact_hashes.json',
  historicalEvidence:'previews/history/before_feedback_r2',
  validation:'previews/performance_validation.json',
};
await writeFile(resolve(root,'feedback-r2-handoff.json'),JSON.stringify(contract,null,2)+'\n');
console.log('R2 contract: '+components.length+' asset components plus presentation bindings');

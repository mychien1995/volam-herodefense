import {test,expect} from '@playwright/test';
import {reviewDraft} from './review-draft.mjs';
test('r3 independent viewer: native frames, four facings and lifecycle cleanup',async({page})=>{
  const r=await reviewDraft(page,process.env.M3D_R3_REVIEW_URL||'http://127.0.0.1:5513/assets/m3d-feedback-review-r3/');
  expect(r.status).toBe('PASS');
  expect(r.clipsPlayed).toBe(33);
  expect(r.frameReferences).toBe(40);
});

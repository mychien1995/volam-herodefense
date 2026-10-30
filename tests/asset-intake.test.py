"""Preflight failure tests use existing real assets; they do not manufacture replacement art."""
import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('intake',Path(__file__).parents[1]/'scripts/asset-intake.py')
intake=importlib.util.module_from_spec(spec);spec.loader.exec_module(intake)

def recipe():
    return dict(id='intake_validation_fixture',kind='validation_fixture',reviewed=True,
                source='Approved baseline copy for pipeline verification only; not a new imported asset',license='Original project artwork',
                canvas=[80,80],pivot=[40,64],frames=[dict(file='assets/exports/characters/hero_cai_bang_idle.png',rect=[0,0,80,80],offset=[0,0],durationMs=350)],
                tags=[dict(name='idle_down',**{'from':0,'to':0})])

class IntakeTests(unittest.TestCase):
    def test_aseprite_roundtrip_preserves_pixels(self):
        from PIL import Image
        import json
        dest=intake.ROOT/'assets/intake/staged/intake_validation_fixture'
        atlas=json.loads((dest/'atlas.json').read_text())
        b=next(iter(atlas['frames'].values()))['frame']
        actual=Image.open(dest/'sheet.png').convert('RGBA').crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
        original=Image.open(intake.ROOT/'assets/exports/characters/hero_cai_bang_idle.png').convert('RGBA')
        self.assertEqual(actual.tobytes(),original.tobytes())
    def test_baseline(self): intake.baseline()
    def test_valid_existing_pixels(self): intake.validate(recipe())
    def test_opaque_checkerboard(self):
        r=recipe();r['frames'][0]['file']='assets/inbox/cai-bang-idle.png'
        with self.assertRaisesRegex(ValueError,'alpha'): intake.validate(r)
    def test_jpeg(self):
        r=recipe();r['frames'][0]['file']='assets/inbox/cai-bang-walk.jpg'
        with self.assertRaisesRegex(ValueError,'PNG'): intake.validate(r)
    def test_missing_directions(self):
        r=recipe();r['kind']='character'
        with self.assertRaisesRegex(ValueError,'four-direction'): intake.validate(r)
    def test_clipping(self):
        r=recipe();r['frames'][0]['offset']=[1,0]
        with self.assertRaisesRegex(ValueError,'clip'): intake.validate(r)
    def test_review_gate(self):
        r=recipe();r['reviewed']=False
        with self.assertRaisesRegex(ValueError,'review'): intake.validate(r)
    def test_protected_id(self):
        r=recipe();r['id']='hero_cai_bang'
        with self.assertRaisesRegex(ValueError,'locked'): intake.validate(r)

if __name__=='__main__': unittest.main()

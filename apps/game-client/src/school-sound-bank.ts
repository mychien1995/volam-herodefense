import type Phaser from 'phaser';
import type { SkillAudioPort } from './skill-sound-mixer.js';

export type SoundSchool = 'con-luan' | 'ngu-doc' | 'duong-mon';
const files = import.meta.glob('../../../assets/sounds/skills/*-v01/*.ogg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const banks = new Map<
  string,
  Map<string, Array<{ key: string; url: string }>>
>();
for (const [path, url] of Object.entries(files).sort()) {
  const parts = path.split('/');
  const pack = parts.at(-2)!;
  const name = parts.at(-1)!.replace('.ogg', '');
  const cue = name.replace(/-\d+$/, '');
  const bank = banks.get(pack) ?? new Map();
  bank.set(cue, [...(bank.get(cue) ?? []), { key: `${pack}:${name}`, url }]);
  banks.set(pack, bank);
}

export function preloadSchoolSoundBank(
  scene: Phaser.Scene,
  school: SoundSchool,
): void {
  for (const choices of banks.get(`${school}-v01`)?.values() ?? [])
    for (const { key, url } of choices) scene.load.audio(key, url);
}

export function schoolSoundPort(
  scene: Phaser.Scene,
  school: SoundSchool,
): SkillAudioPort {
  const variants = new Map<string, number>();
  return {
    play(cue, options) {
      const choices = banks.get(`${school}-v01`)?.get(cue);
      if (!choices?.length || scene.sound.locked) return;
      const index = variants.get(cue) ?? 0;
      const { key } = choices[index % choices.length]!;
      if (!scene.cache.audio.exists(key)) return;
      variants.set(cue, index + 1);
      const voice = scene.sound.add(key, {
        volume: options.gain,
        rate: options.rate,
        loop: options.loop,
      });
      voice.once('complete', () => voice.destroy());
      if (!voice.play()) {
        voice.destroy();
        return;
      }
      return {
        active: () => !voice.pendingRemove && voice.isPlaying,
        volume: (value) => {
          if (!voice.pendingRemove) voice.volume = value;
        },
        stop: () => {
          if (!voice.pendingRemove) {
            voice.stop();
            voice.destroy();
          }
        },
      };
    },
  };
}

export function inspectSchoolSoundBank(
  scene: Phaser.Scene,
  school: SoundSchool,
) {
  return [...(banks.get(`${school}-v01`)?.values() ?? [])]
    .flat()
    .filter(({ key }) => scene.cache.audio.exists(key)).length;
}

export function nativeCreepPose(
  group: string | undefined,
  pose: string,
): boolean {
  return (
    ['wave_creeps', 'dungeon_creeps', 'minions'].includes(group ?? '') &&
    ['idle', 'walk', 'hurt', 'stun', 'cast', 'death'].includes(pose)
  );
}

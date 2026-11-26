import { skillIcon as dataSkillIcon } from '@volam/game-data';
declare const __VOLAM_RASTER_ALIASES__: Readonly<Record<string, string>>;

const aliases: Readonly<Record<string, string>> =
  typeof __VOLAM_RASTER_ALIASES__ === 'undefined'
    ? {}
    : __VOLAM_RASTER_ALIASES__;
/** The same content-addressed URL is used by DOM portraits and Phaser loaders. */
export const assetUrl = (path: string): string => aliases[path] ?? path;

export const skillIcon = (id: string): string => assetUrl(dataSkillIcon(id));

type RenovationDirection = 'down' | 'left' | 'right' | 'up';
type RenovationSnapshot = {
  page: number;
  pages: number;
  ready: boolean;
  scene: string;
  group: string;
  actor: string;
  showGroup: boolean;
  compare: boolean;
  facing: RenovationDirection;
  walking: boolean;
  menuOpen: boolean;
  failures: string[];
  roster: { id: string; group: string; frames: number }[];
  scenes: string[];
  textureCount: number;
  observed: string[];
  frameTimes: Record<string, number[]>;
  viewport: { width: number; height: number; zoom: number };
  actors: {
    id: string;
    x: number;
    y: number;
    frame: string;
    origin: number[];
    height: number;
    scale: number;
    direction: RenovationDirection;
    depth: number;
  }[];
};
interface Window {
  __renovation?: {
    select(selection: {
      scene?: string;
      group?: string;
      actor?: string;
      showGroup?: boolean;
      compare?: boolean;
      page?: number;
    }): Promise<void>;
    face(direction: RenovationDirection): void;
    walk(enabled: boolean): void;
    snapshot(): RenovationSnapshot;
  };
}

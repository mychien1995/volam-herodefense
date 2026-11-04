import Phaser from 'phaser';

/** Two views of one live production display list, with no second simulation or
 * reconstructed effect timeline. Used only by the standalone review page. */
export function createRuntimeArtGallery(
  scene: Phaser.Scene,
  setMode: (mode: 'current' | 'candidate') => void,
) {
  const main = scene.cameras.main;
  const candidate = scene.cameras.add(0, 0, 1, 1, false, 'artwork-candidate');
  candidate.roundPixels = true;
  let zoom = 1;
  const observations: Record<string, unknown> = {};
  const size = () => {
    const width = Math.floor(scene.scale.width / 2);
    main.setViewport(0, 0, width, scene.scale.height).setZoom(zoom);
    candidate.setViewport(width, 0, width, scene.scale.height).setZoom(zoom);
  };
  const render = (
    renderScene: Phaser.Scene,
    camera: Phaser.Cameras.Scene2D.Camera,
  ) => {
    if (renderScene !== scene) return;
    if (camera === main) {
      setMode('current');
      // CameraManager calls main.preRender (including its production follow)
      // before this event, and candidate.preRender after it. Copy the settled
      // world scroll, rather than running follow interpolation a second time.
      candidate.setScroll(main.scrollX, main.scrollY);
    } else if (camera === candidate) setMode('candidate');
    else return;
    observations[camera === main ? 'current' : 'candidate'] = {
      frame: scene.game.loop.frame,
      x: camera.scrollX,
      y: camera.scrollY,
      zoom: camera.zoom,
      width: camera.width,
      height: camera.height,
    };
  };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, size);
  scene.game.renderer.on(Phaser.Renderer.Events.RENDER, render);
  size();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, size);
    scene.game.renderer.off(Phaser.Renderer.Events.RENDER, render);
  });
  return {
    setZoom(value: number) {
      if (![0.5, 1, 2].includes(value)) throw Error('Invalid gallery zoom');
      zoom = value;
      size();
    },
    inspect: () => ({ ...observations }),
  };
}

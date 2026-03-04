import { Application, Container } from 'pixi.js';
import { createBackground } from './create-background';

export interface SceneContainers {
  gameWorld: Container;
  groundLayer: Container;
  borderLayer: Container;
  roadLayer: Container;
  buildingLayer: Container;
  entityLayer: Container;
  decorLayer: Container;
  hudLayer: Container;
}

export function setupStage(app: Application): SceneContainers {
  const gameWorld = new Container();
  gameWorld.label = 'gameWorld';

  const groundLayer = new Container();
  groundLayer.label = 'groundLayer';

  const borderLayer = new Container();
  borderLayer.label = 'borderLayer';

  const roadLayer = new Container();
  roadLayer.label = 'roadLayer';

  const buildingLayer = new Container();
  buildingLayer.label = 'buildingLayer';

  const entityLayer = new Container();
  entityLayer.label = 'entityLayer';

  const decorLayer = new Container();
  decorLayer.label = 'decorLayer';

  const backgroundLayer = createBackground(app);
  gameWorld.addChild(
    backgroundLayer,
    groundLayer,
    borderLayer,
    roadLayer,
    buildingLayer,
    entityLayer,
    decorLayer,
  );

  const hudLayer = new Container();
  hudLayer.label = 'hudLayer';

  app.stage.addChild(gameWorld, hudLayer);

  return {
    gameWorld,
    groundLayer,
    borderLayer,
    roadLayer,
    buildingLayer,
    entityLayer,
    decorLayer,
    hudLayer,
  };
}

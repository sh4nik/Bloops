class EntityProcessor {
  constructor(opts) {
    this.incubator = [...opts.entities] || [];
    this.preStep = opts.preStep;
    this.postStep = opts.postStep;
    this.entities = [];
  }
  step({ renderOpts }) {
    if (this.preStep) this.preStep(this.entities);
    this.entities = [...this.entities, ...this.incubator];
    this.incubator = [];
    this.entities = this.entities.filter(e => e.isActive);
    this.entities.forEach(e => {
      if (e.step) e.step(this.entities, this.entitiesToInject);
      if (renderOpts && e.render) e.render(this.entities, renderOpts);
    });
    if (this.postStep) this.postStep(this.entities);
  }
  static produceEntities(entityConfig) {
    const entities = [];
    entityConfig.forEach(({ Entity, count, opts }) => {
      for (let i = 0; i < count; i++) {
        entities.push(new Entity(opts));
      }
    });
    return entities;
  }
}

class Simulation {
  constructor({ canvas, entityConfig }) {
    this.ep = new EntityProcessor({
      entities: EntityProcessor.produceEntities(entityConfig),
      preStep: function (entities) { },
      postStep: function (entities) { }
    });
    this.stage = new createjs.Stage(canvas);
  }
  run() {
    createjs.Ticker.addEventListener("tick", () => {
      const renderOpts = { stage: this.stage };
      this.ep.step({ renderOpts });
      this.stage.update();
    });
  }
}

class Agent {
  constructor({ isActive = true, age = 0 }) {
    this.isActive = isActive;
    this.age = age;
    this.x = 0;
    this.y = 0;
  }
  step(entities, incubator) {
    this.x += 5;
    this.y += 5;
  }
  render(entities, renderOpts) {
    if(renderOpts && !this.circle) {
      this.circle = new createjs.Shape();
      renderOpts.stage.addChild(this.circle);
      this.circle.graphics.beginFill('#222').drawCircle(0, 0, 20);
    }
    this.circle.x = this.x;
    this.circle.y = this.y;
  }
}

class Food {
  constructor({ isActive = true }) {
    this.isActive = isActive;
  }
  render(entities, renderOpts) { }
}

function init() {
  const sim = new Simulation({
    canvas: 'main-canvas',
    entityConfig: [
      { Entity: Agent, count: 2, opts: { age: 2 } },
      { Entity: Agent, count: 5, opts: { age: 5 } },
      { Entity: Agent, count: 1, opts: { age: 6 } },
      { Entity: Food, count: 10, opts: {} }
    ]
  });
  sim.run();
}

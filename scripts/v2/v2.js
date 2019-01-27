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
    entityConfig.forEach(({ entity, count, opts }) => {
      for (let i = 0; i < count; i++) {
        entities.push(new entity(opts));
      }
    });
    return entities;
  }
}

class Simulation {
  constructor({ entityConfig }) {
    this.ep = new EntityProcessor({
      entities: EntityProcessor.produceEntities(entityConfig),
      preStep: function (entities) { },
      postStep: function (entities) { }
    });
  }
  run() {
    const renderOpts = {};
    while(true) {
      this.ep.step({renderOpts});
    }
  }
}

class Agent {
  constructor({ isActive = true, age = 0 }) {
    this.isActive = isActive;
    this.age = age;
  }
  step(entities, incubator) { }
  render(entities, renderOpts) {
    console.log(this);
  }
}

class Food {
  constructor({ isActive = true }) {
    this.isActive = isActive;
  }
  render(entities, renderOpts) {
    console.log(this);
  }
}

const sim = new Simulation({
  entityConfig: [
    { entity: Agent, count: 2, opts: { age: 2 } },
    { entity: Agent, count: 5, opts: { age: 5 } },
    { entity: Agent, count: 1, opts: { age: 6 } },
    { entity: Food, count: 10, opts: {} }
  ]
});

sim.run();

class EntityProcessor {
  init(opts) {
    this.entitiesToInject = opts.entitiesToInject || [];
    this.preStep = opts.preStep;
    this.entities = [];
  }
  step() {
    if (this.preStep) this.preStep(this.entities);
    this.entities = [...this.entities, ...this.entitiesToInject.splice(0, this.entitiesToInject.length)]
    this.entities = this.entities.filter(e => e.isActive);
    this.entities.forEach(e => e.step && e.step(this.entities, this.entitiesToInject));
  }
  print() {
    console.log(this.entities);
  }
}

class Simulation {
  static run(initialEntityConfig) {

    const ep = new EntityProcessor();
    const entitiesToInject = [];

    initialEntityConfig.forEach(({ entity, count, opts }) => {
      for (let i = 0; i < count; i++) {
        entitiesToInject.push(new entity(opts));
      }
    });
    
    ep.init({
      entitiesToInject,
      preStep: function (entities) { }
    });

    for (var i = 0; i < 1000; i++) {
      ep.step();
      ep.print();
    }

  }
}

class Agent {
  constructor(opts) {
    this.isActive = opts.isActive !== undefined ? opts.isActive : true;
    this.age = opts.age !== undefined ? opts.age : 0;
  }
  step(entities, entitiesToInject) { }
}

class Food {
  constructor(opts) {
    this.isActive = opts.isActive !== undefined ? opts.isActive : true;
  }
}

Simulation.run([
  { entity: Agent, count: 2, opts: { age: 2 } },
  { entity: Agent, count: 5, opts: { age: 5 } },
  { entity: Agent, count: 1, opts: { age: 666 } },
  { entity: Food, count: 10, opts: {} }
]);

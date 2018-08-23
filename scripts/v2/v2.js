class Agent {
  constructor(opts) {
    // Initialize options
    this.isActive = opts.isActive !== undefined ? opts.isActive : true;
    this.age = opts.age !== undefined ? opts.age : 0;
  }
  step(entities) {}
  mate(partner) {}
}

class Renderer {
  render(entity, entities) {}
}

class Simulation {
  constructor(renderer) {
    this.renderer = renderer;
  }
  init(opts) {
    // Initialize options
    this.matingEntityLimit =
      opts.matingEntityLimit !== undefined ? opts.matingEntityLimit : 50;
    this.matingRate = opts.matingRate !== undefined ? opts.matingRate : 0.1;
    this.repopulate = opts.repopulate !== undefined ? opts.repopulate : [];
    this.initialEntities =
      opts.initialEntities !== undefined ? opts.initialEntities : [];
    this.selectMate =
      opts.selectMate !== undefined
        ? opts.selectMate
        : (entities, entity) => {
            entities[0];
          };

    this.entities = [];
    this.initialEntities.forEach(({ entity, count, opts }) => {
      for (let i = 0; i < count; i++) {
        this.entities.push(new entity(opts));
      }
    });
  }
  step(renderer) {
    this.entities.forEach(e => {
      // Step
      e.step && e.step(this.entities);
      // Mate
      e.mate &&
        this.entities.filter(e => e && e.mate).length <
          this.matingEntityLimit &&
        Math.random(1) < this.matingRate &&
        this.entities.push(e.mate(this.selectMate(this.entities, e)));
      // Render
      renderer && renderer.render(e, this.entities);
    });
    // Clean
    this.entities = this.entities.filter(e => e && e.isActive);
    // Repopulate
    this.repopulate.forEach(getNewEnities => {
      this.entities.concat(getNewEnities());
    });
  }
  printStats() {
    console.log(this.entities);
  }
}

const opts = {
  initialEntities: [
    { entity: Agent, count: 2, opts: {age: 2}},
    { entity: Agent, count: 5, opts: {age: 5}}
  ]
};

const sim = new Simulation();
const renderer = new Renderer();

sim.init(opts);
sim.step(renderer);
sim.printStats();

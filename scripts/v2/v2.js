class Agent {
  constructor(opts) {
    // Initialize options
    this.isActive = true;
    this.age = opts.age || 0;
    this.position = opts.position;
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
    this.matingEntityLimit = opts.matingEntityLimit || 50;
    this.matingRate = opts.matingRate || 0.1;
    this.repopulate = opts.repopulate || [];
    this.initialEntities = opts.initialEntities || [];
    this.selectMate =
      opts.selectMate ||
      ((entities, entity) => {
        entities[0];
      });

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
      if(e.mate &&
        this.entities.filter(e => e.mate).length < this.matingEntityLimit &&
        Math.random(1) < this.matingRate) {
          this.entities.push(e.mate(this.selectMate(this.entities, e)));
      }
      // Render
      renderer && renderer.render(e, this.entities);
    });
    // Clean
    this.entities = this.entities.filter(e => e.isActive);
    // Repopulate
    this.repopulate.forEach(getNewEnities => {
      this.entities.concat(getNewEnities());
    });
  }
  getStats() {
    return {
      entities: this.entities
    };
  }
}

const opts = {
  initialEntities: [
    { entity: Agent, count: 5, opts: {} },
    { entity: Agent, count: 3, opts: {} }
  ]
};

const sim = new Simulation();
const renderer = new Renderer();
sim.init(opts);
sim.step(renderer);
console.log(sim.getStats());

class EntityProcessor {
  constructor(opts) {
    this.incubator = [...opts.entities] || [];
    this.preStep = opts.preStep;
    this.postStep = opts.postStep;
    this.entities = [];
  }
  step({ renderer }) {
    if (this.preStep) this.preStep(this.entities);
    this.entities = [...this.entities, ...this.incubator];
    this.incubator = [];
    this.entities = this.entities.filter(e => e.isActive);
    this.entities.forEach(e => {
      if (e.step) e.step(this.entities, this.entitiesToInject);
      if (renderer && e.render) e.render(this.entities, renderer);
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
  constructor({ canvas, entityConfig, framerate }) {
    this.ep = new EntityProcessor({
      entities: EntityProcessor.produceEntities(entityConfig),
      preStep: function (entities) { },
      postStep: function (entities) { }
    });
    this.stage = new createjs.StageGL(canvas, { antialias: true });
    createjs.Ticker.framerate = framerate;
  }
  render() {
    this.stage.setClearColor('#2299aa');
  }
  run() {
    this.render();
    createjs.Ticker.addEventListener('tick', () => {
      // const renderer = { stage: this.stage };
      let renderer;
      this.ep.step({ renderer });
      this.stage.update();
    });
  }
}

let Inputs = {
  testIn: {
    displayName: 'Test Input',
    process: (agent, entities, data) => {
      return 1;
    }
  }
};

let Outputs = {
  testOut: {
    displayName: 'Test Output',
    process: (val, agent) => { }
  }
};

class Brain {
  constructor({ inputs = [], outputs = [], midLayerNodes = 4, weights }) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.midLayerNodes = midLayerNodes;
    this.network = ENCOG.BasicNetwork.create([
      ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(), this.inputs.length, 1),
      ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(), this.midLayerNodes, 1),
      ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(), this.outputs.length, 0)
    ]);
    this.network.randomize();
    if (weights) this.network.weights = weights;
  }
  compute(agent, entities, data) {
    let inputValues = this.inputs.map(i => Inputs[i].process(agent, entities, data));
    let outputValues = [];
    this.network.compute(inputValues, outputValues);
    this.outputs.map((o, index) => Outputs[o].process(outputValues[index], agent));
  }
  extractJson() { }
  loadJson(json) { }
  clone() { }
  crossover(brain2) { }
  mutate(rate) { }
}

class Agent {
  constructor({ isActive = true, age = 0 }) {
    this.isActive = isActive;
    this.age = age;
    this.x = 0;
    this.y = 60;
    this.brain = new Brain({
      inputs: ['testIn'],
      outputs: ['testOut'],
      midLayerNodes: 4
    });
  }
  step(entities, incubator) {
    this.x += 3;
    this.age += 1;
    this.brain.compute(this, entities, this.prepData(entities));
  }
  render(entities, renderer) {
    let r = 30;
    if (renderer && !this.circle) {
      this.circle = new createjs.Shape();
      renderer.stage.addChild(this.circle);
      this.circle.graphics.beginFill('#333').drawCircle(0, 0, r);
    }
    this.circle.cache(-r, -r, r * 2, r * 2);
    this.circle.x = this.x;
    this.circle.y = this.y;
    if (this.x > renderer.stage.canvas.width) { this.x = 0; }
  }
  prepData(entities) {
    return {
      nearestAgent: null, nearestFood: null
    };
  }
}

class Food {
  constructor({ isActive = true }) {
    this.isActive = isActive;
  }
  render(entities, renderer) { }
}

function init() {
  const sim = new Simulation({
    canvas: 'main-canvas',
    framerate: 60,
    entityConfig: [
      { Entity: Agent, count: 2, opts: { age: 2 } },
      { Entity: Agent, count: 5, opts: { age: 5 } },
      { Entity: Agent, count: 1, opts: { age: 6 } },
      { Entity: Food, count: 10, opts: {} }
    ]
  });
  sim.run();
}

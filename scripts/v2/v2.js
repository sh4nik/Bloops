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
      if (e.step) e.step(this.entities, this.incubator);
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
      const renderer = { stage: this.stage };
      // let renderer;
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
  extract() {
    return {
      inputs: this.inputs,
      outputs: this.outputs,
      midLayerNodes: this.midLayerNodes,
      weights: this.network.weights
    };
  }
  clone() {
    return new Brain(this.extract());
  }
  mate(partnerBrain) {
    let newWeights = Brain.crossover(this.network.weights, partnerBrain.network.weights)[0];
    let childBrain = this.clone();
    childBrain.network.weights = newWeights
    return childBrain;
  }
  mutate() {
    let data = this.network.weights;
    var iswap1 = Math.floor(Math.random() * data.length);
    var iswap2 = Math.floor(Math.random() * data.length);

    if (iswap1 == iswap2) {
      if (iswap1 > 0) {
        iswap1--;
      } else {
        iswap1++;
      }
    }
    var t = data[iswap1];
    data[iswap1] = data[iswap2];
    data[iswap2] = t;
  }
  static crossover(fatherArray, motherArray) {
    var len = motherArray.length;
    var cl = Math.floor(len / 3);
    var ca = cl;
    var cb = ca + cl;
    if (ca > cb) {
      var tmp = cb;
      cb = ca;
      ca = tmp;
    }
    var child1ArrayTemp = [];
    child1ArrayTemp = child1ArrayTemp.concat(fatherArray.slice(0, ca));
    child1ArrayTemp = child1ArrayTemp.concat(motherArray.slice(ca, cb));
    child1ArrayTemp = child1ArrayTemp.concat(fatherArray.slice(cb, len));
    var child2ArrayTemp = [];
    child2ArrayTemp = child2ArrayTemp.concat(motherArray.slice(0, ca));
    child2ArrayTemp = child2ArrayTemp.concat(fatherArray.slice(ca, cb));
    child2ArrayTemp = child2ArrayTemp.concat(motherArray.slice(cb, len));
    let children = [];
    children.push(child1ArrayTemp);
    children.push(child2ArrayTemp);
    return children;
  }
}

class Agent {
  constructor({ isActive = true, age = 0, matingRate = 0.0006, mutationRate = 0.001, health = 100, brain }) {
    this.isActive = isActive;
    this.age = age;
    this.health = health;
    this.x = 0;
    this.y = 60;
    this.matingRate = matingRate;
    this.brain = brain || new Brain({
      inputs: ['testIn'],
      outputs: ['testOut'],
      midLayerNodes: 4
    });
  }
  step(entities, incubator) {
    this.x += 3;
    this.age += 1;
    this.health += 1;
    let env = this.prepData(entities);
    this.brain.compute(this, entities, env);
    if (Math.random(1) < this.matingRate) {
      let child = this.mate(this.findMate(entities));
      if (Math.random(1) < this.mutationRate) child.brain.mutate();
      incubator.push(child);
    }
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
  findMate(agents) {
    let total = 0;
    agents.forEach(agent => {
      total += agent.health;
    });
    agents.forEach(agent => {
      agent.matingProbability = agent.health / total;
    });
    let x = Math.random(1);
    let index = 0;
    while (x > 0) {
      x -= agents[index].matingProbability;
      index++;
    }
    index--;
    return agents[index];
  }
  mate(partner) {
    return new Agent(this.brain.mate(partner.brain));
  }
  prepData(entities) {
    let agents = entities.filter(e => e instanceof Agent);
    let food = entities.filter(e => e instanceof Food);
    return {
      agents, food, nearestAgent: null, nearestFood: null
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
      { Entity: Agent, count: 1, opts: { age: 2 } },
      { Entity: Agent, count: 5, opts: { age: 5 } },
      { Entity: Agent, count: 1, opts: { age: 6 } },
      { Entity: Food, count: 10, opts: {} }
    ]
  });
  sim.run();
}

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
      if (e.step) e.step(this.entities, this.incubator, renderer.stage);
      if (renderer && e.render) e.render(this.entities, renderer);
    });
    if (this.postStep) this.postStep(this.entities);
  }
  static produceEntities(entityConfig, stage) {
    const entities = [];
    entityConfig.forEach(({ Entity, count, opts }) => {
      for (let i = 0; i < count; i++) {
        opts.position = _p5.createVector(Util.random(stage.canvas.width), Util.random(stage.canvas.height));
        entities.push(new Entity(opts));
      }
    });
    return entities;
  }
}

class Simulation {
  constructor({ canvas, entityConfig, framerate }) {
    this.stage = new createjs.Stage(canvas);
    this.resize();
    this.ep = new EntityProcessor({
      entities: EntityProcessor.produceEntities(entityConfig, this.stage),
      preStep: function (entities) { },
      postStep: function (entities) { }
    });
    createjs.Ticker.framerate = framerate;
  }
  render() { }
  run() {
    this.render();
    createjs.Ticker.addEventListener('tick', () => {
      const renderer = { stage: this.stage };
      this.ep.step({ renderer });
      this.stage.update();
    });
  }
  resize() {
    this.stage.canvas.width = window.innerWidth;
    this.stage.canvas.height = window.innerHeight;
  }
}

let Inputs = {
  nearestAgentX: {
    displayName: 'Nearest Agent X',
    process: (env, agent, entities) => {
      return env.nearestAgentVector.x;
    }
  },
  nearestAgentY: {
    displayName: 'Nearest Agent Y',
    process: (env, agent, entities) => {
      return env.nearestAgentVector.y;
    }
  },
  nearestEdibleX: {
    displayName: 'Nearest Edible X',
    process: (env, agent, entities) => {
      return env.nearestEdibleVector.x;
    }
  },
  nearestEdibleY: {
    displayName: 'Nearest Edible Y',
    process: (env, agent, entities) => {
      return env.nearestEdibleVector.y;
    }
  }
};

let Outputs = {
  desiredForceX: {
    displayName: 'Desired Force X',
    process: (val, agent) => {
      agent.applyForce(_p5.createVector(val, 0));
    }
  },
  desiredForceY: {
    displayName: 'Desired Force Y',
    process: (val, agent) => {
      agent.applyForce(_p5.createVector(0, val));
    }
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
  compute(agent, entities, env) {
    let inputValues = this.inputs.map(i => Inputs[i].process(env, agent, entities));
    let outputValues = [];
    this.network.compute(inputValues, outputValues);
    this.outputs.map((o, index) => Outputs[o].process(outputValues[index], agent));
  }
  extract() {
    return {
      inputs: [...this.inputs],
      outputs: [...this.outputs],
      midLayerNodes: this.midLayerNodes,
      weights: [...this.network.weights]
    };
  }
  clone() {
    return new Brain(this.extract());
  }
  mate(partnerBrain) {
    let options = Brain.crossover(this.network.weights, partnerBrain.network.weights);
    let newWeights = options[Util.random(1) < 0.5 ? 1 : 0];
    let childBrain = this.clone();
    childBrain.network.weights = newWeights
    return childBrain;
  }
  mutate() {
    let data = this.network.weights;
    var iswap1 = Math.floor(Util.random() * data.length);
    var iswap2 = Math.floor(Util.random() * data.length);

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
  constructor({
    isActive = true,
    age = 0,
    position,
    matingRate = 0.002,
    mutationRate = 0.001,
    health = 500,
    brain
  }) {
    this.isActive = isActive;
    this.age = age;
    this.health = health;
    this.maxSpeed = 4;
    this.position = position;
    this.velocity = _p5.createVector(0, 0);
    this.acceleration = _p5.createVector(0, 0);
    this.matingRate = matingRate;
    this.mutationRate = mutationRate;
    this.brain = brain || new Brain({
      inputs: ['nearestAgentX', 'nearestAgentY', 'nearestEdibleX', 'nearestEdibleY'],
      outputs: ['desiredForceX', 'desiredForceY'],
      midLayerNodes: 4
    });
  }
  step(entities, incubator, stage) {
    this.updateMovement();
    Util.wrapAround(this.position, stage);
    this.updateStats();
    let env = this.prepEnvironment(entities);
    this.brain.compute(this, entities, env);
    this.handleMating(env.agents, incubator);
  }
  render(entities, renderer) {
    let r = 5;
    if (renderer && !this.circle) {
      this.circle = new createjs.Shape();
      renderer.stage.addChild(this.circle);
      this.circle.graphics.beginFill('#96e7ac').drawCircle(0, 0, r);
    }
    if (this.isActive) {
      this.circle.x = this.position.x;
      this.circle.y = this.position.y;
    } else {
      renderer.stage.removeChild(this.circle);
    }

  }
  updateMovement() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
  }
  updateStats() {
    this.age += 1;
    this.health -= 1;
    if (this.health === 0) this.isActive = false;
  }
  handleMating(agents, incubator) {
    if (Util.random(1) < this.matingRate) {
      let partner = this.findMate(agents);
      if (partner) {
        let child = this.mate(partner);
        if (Util.random(1) < this.mutationRate) child.brain.mutate();
        incubator.push(child);
      }
    }
  }
  applyForce(force) {
    this.acceleration.add(force);
  }
  findMate(agents) {
    let total = 0;
    agents.forEach(agent => {
      total += agent.health;
    });
    agents.forEach(agent => {
      agent.matingProbability = agent.health / total;
    });
    let x = Util.random(1);
    let index = 0;
    while (x > 0) {
      x -= agents[index].matingProbability;
      index++;
    }
    index--;
    return agents[index];
  }
  mate(partner) {
    return new Agent({
      brain: this.brain.mate(partner.brain),
      position: this.position.copy()
    });
  }
  prepEnvironment(entities) {
    let agents = entities.filter(e => e instanceof Agent);
    let edibles = entities.filter(e => e instanceof Food || e instanceof Poison);
    let nearestAgent = Util.findNearest(this, agents);
    let nearestEdible = Util.findNearest(this, edibles);
    let desiredVectorToAgent = p5.Vector.sub(nearestAgent.position, this.position);
    let nearestAgentVector = p5.Vector.sub(desiredVectorToAgent, this.velocity);
    nearestAgentVector.normalize();
    let desiredVectorToEdible = p5.Vector.sub(nearestEdible.position, this.position);
    let nearestEdibleVector = p5.Vector.sub(desiredVectorToEdible, this.velocity);
    nearestEdibleVector.normalize();
    return {
      agents,
      edibles,
      nearestAgent,
      nearestEdible,
      nearestAgentVector,
      nearestEdibleVector
    };
  }
}

class Edible {
  constructor({ isActive = true, position }) {
    this.isActive = isActive;
    this.position = position;
    this.color = '#eb504c';
    this.size = 3;
  }
  render(entities, renderer) {
    if (renderer && !this.circle) {
      this.circle = new createjs.Shape();
      renderer.stage.addChild(this.circle);
      this.circle.graphics.beginFill(this.color).drawCircle(0, 0, this.size);
    }
    if (this.isActive) {
      this.circle.x = this.position.x;
      this.circle.y = this.position.y;
    } else {
      renderer.stage.removeChild(this.circle);
    }
  }
}

class Food extends Edible {
  constructor(opts) {
    super(opts);
    this.color = '#0da5bd';
    this.size = 4;
  }
}

class Poison extends Edible {
  constructor(opts) {
    super(opts);
    this.color = '#eb504c';
    this.size = 3;
  }
}

class Util {
  static random(max) {
    return Math.random() * max;
  }
  static findNearest(entity, entities) {
    return entities.reduce((prev, curr) => {
      return entity.position.dist(curr.position) < entity.position.dist(prev.position) || entity === prev ? curr : prev;;
    });
  }
  static wrapAround(vector, stage) {
    if (vector.x < 0) vector.x = stage.canvas.width;
    if (vector.y < 0) vector.y = stage.canvas.height;
    if (vector.x > stage.canvas.width) vector.x = 0;
    if (vector.y > stage.canvas.height) vector.y = 0;
  }
}

function init() {
  const sim = new Simulation({
    canvas: 'main-canvas',
    framerate: 30,
    entityConfig: [
      { Entity: Agent, count: 10, opts: { age: 2 } },
      { Entity: Food, count: 15, opts: {} },
      { Entity: Poison, count: 15, opts: {} }
    ]
  });
  sim.run();
}

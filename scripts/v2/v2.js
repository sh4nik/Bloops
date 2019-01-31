class EntityProcessor {
  constructor(opts) {
    this.incubator = [...opts.entities] || [];
    this.preStep = opts.preStep;
    this.postStep = opts.postStep;
    this.entities = [];
  }
  step({ renderer, dimensions }) {
    if (this.preStep) this.preStep(this.entities);
    this.entities = [...this.entities, ...this.incubator];
    this.incubator = [];
    this.entities.forEach(e => {
      if (e.step) e.step(this.entities, this.incubator, dimensions);
      if (renderer) e.render(this.entities, renderer);
    });
    this.entities = this.entities.filter(e => e.isActive);
    if (this.postStep) this.postStep(this.entities);
  }
  static produceEntities(entityConfig, dimensions) {
    const entities = [];
    entityConfig.forEach(({ Entity, count, opts }) => {
      for (let i = 0; i < count; i++) {
        opts.position = _p5.createVector(Util.random(dimensions.width), Util.random(dimensions.height));
        entities.push(new Entity(opts));
      }
    });
    return entities;
  }
}

class Simulation {
  constructor({ canvas, entityConfig, framerate, theme }) {
    this.stage = new createjs.Stage(canvas);
    this.theme = Theme.get(theme);
    this.resize();
    this.applyBackgroundColor(canvas);
    this.dimensions = { width: this.stage.canvas.width, height: this.stage.canvas.height };
    this.ep = new EntityProcessor({
      entities: EntityProcessor.produceEntities(entityConfig, this.dimensions),
      preStep: function (entities) { },
      postStep: function (entities) { }
    });
    createjs.Ticker.framerate = framerate;
  }
  render() { }
  run() {
    this.render();
    createjs.Ticker.addEventListener('tick', () => {
      const renderer = { stage: this.stage, theme: this.theme };
      this.ep.step({ renderer, dimensions: this.dimensions });
      this.stage.update();
    });
  }
  resize() {
    this.stage.canvas.width = window.innerWidth;
    this.stage.canvas.height = window.innerHeight;
  }
  applyBackgroundColor(canvas) {
    document.getElementById(canvas).style.backgroundColor = this.theme.backgroundColor;
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
    let swap1 = Math.floor(Util.random() * data.length);
    let swap2 = Math.floor(Util.random() * data.length);
    swap1 == swap2 && swap1 > 0 ? swap1-- : swap1++;
    let temp = data[swap1];
    data[swap1] = data[swap2];
    data[swap2] = temp;
  }
  static crossover(fatherArray, motherArray) {
    let len = motherArray.length;
    let cl = Math.floor(len / 3);
    let ca = cl;
    let cb = ca + cl;
    if (ca > cb) {
      let tmp = cb;
      cb = ca;
      ca = tmp;
    }
    let child1 = [...fatherArray.slice(0, ca), ...motherArray.slice(ca, cb), ...fatherArray.slice(cb, len)];
    var child2 = [...motherArray.slice(0, ca), ...fatherArray.slice(ca, cb), ...motherArray.slice(cb, len)];
    return [child1, child2];
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
    size = 6,
    brain
  }) {
    this.isActive = isActive;
    this.age = age;
    this.health = health;
    this.size = size;
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
  step(entities, incubator, dimensions) {
    const env = this.prepEnvironment(entities);
    this.updateStats();
    this.updateMovement();
    this.think(env);
    this.attemptToEat(env.nearestEdible);
    this.handleMating(env.agents, incubator);
    Util.wrapAround(this.position, dimensions);
  }
  render(entities, renderer) {
    if (renderer && !this.shape) {
      this.shape = new createjs.Shape();
      renderer.stage.addChild(this.shape);
      this.shape.graphics.beginFill(renderer.theme.agentBodyColor).drawCircle(0, 0, this.size);
    }
    if (this.isActive) {
      this.shape.x = this.position.x;
      this.shape.y = this.position.y;
    } else {
      renderer.stage.removeChild(this.shape);
    }
  }
  updateMovement() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
  }
  think(env) {
    this.brain.compute(this, this.entities, env);
  }
  updateStats() {
    this.age += 1;
    this.health -= 1;
    if (this.health <= 0) this.isActive = false;
  }
  attemptToEat(edible) {
    if (Util.checkCollision(this, edible)) {
      this.health += edible.eat();
    }
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
    let edibles = entities.filter(e => e instanceof Edible);
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
    this.size = 4;
    this.healthImpact = 0;
  }
  render(entities, renderer) {
    if (renderer && !this.shape) {
      this.shape = new createjs.Shape();
      renderer.stage.addChild(this.shape);
      this.shape.graphics.beginFill(this.getColor(renderer.theme)).drawCircle(0, 0, this.size);
    }
    if (this.isActive) {
      this.shape.x = this.position.x;
      this.shape.y = this.position.y;
    } else {
      console.log('Removing graphic...');
      renderer.stage.removeChild(this.shape);
    }
  }
  eat() {
    console.log('Eating...');
    this.isActive = false;
    return this.healthImpact;
  }
}

class Food extends Edible {
  constructor(opts) {
    super(opts);
    this.healthImpact = 100;
  }
  getColor(theme) {
    return theme.foodColor;
  }
}

class Poison extends Edible {
  constructor(opts) {
    super(opts);
    this.healthImpact = -100;
  }
  getColor(theme) {
    return theme.poisonColor;
  }
}

class Util {
  static random(max) {
    return Math.random() * max;
  }
  static findNearest(entity, entities) {
    return entities.reduce((prev, curr) => {
      return entity.position.dist(curr.position) < entity.position.dist(prev.position) || entity === prev ? curr : prev;
    });
  }
  static wrapAround(vector, dimensions) {
    if (vector.x < 0) vector.x = dimensions.width;
    if (vector.y < 0) vector.y = dimensions.height;
    if (vector.x > dimensions.width) vector.x = 0;
    if (vector.y > dimensions.height) vector.y = 0;
  }
  static checkCollision(obj1, obj2) {
    return obj1.position.dist(obj2.position) < (obj1.size) + (obj2.size);
  }
}

class Theme {
  static get(theme) {
    const themes = {
      circus: {
        backgroundColor: '#000',
        foodColor: '#0da5bd',
        poisonColor: '#eb504c',
        agentBodyColor: '#96e7ac'
      },
      bloop: {
        backgroundColor: '#000006',
        foodColor: '#00f4b6',
        poisonColor: '#bf4fff',
        agentBodyColor: '#3de1ff'
      }
    };
    return themes[theme];
  }
}

function init() {
  const sim = new Simulation({
    canvas: 'main-canvas',
    framerate: 30,
    theme: 'circus',
    entityConfig: [
      { Entity: Agent, count: 1, opts: { age: 2 } },
      { Entity: Food, count: 150, opts: {} },
      { Entity: Poison, count: 150, opts: {} }
    ]
  });
  sim.run();
}

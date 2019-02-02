class EntityProcessor {
  constructor({ entityConfig, dimensions }) {
    this.dimensions = dimensions;
    this.config = entityConfig;
    this.entities = [];
    this.incubator = [];
    this.initialized = false;
  }
  step({ renderer }) {
    this.incubator = this.limitPopulation();
    this.entities = [...this.entities, ...this.incubator];
    this.incubator = this.produceEntities();
    this.entities.forEach(e => {
      if (e.step) e.step(this.entities, this.incubator, this.dimensions);
    });
    if (renderer) {
      this.entities.sort((a, b) => {
        return a instanceof Agent ? 1 : -1;
      });
      this.entities.forEach(e => {
        if (e.render) e.render(this.entities, renderer);
      });
    }
    this.entities = this.entities.filter(e => e.isActive);
  }
  limitPopulation() {
    this.config.forEach(({ groupId, Entity, count, max, min, opts }) => {
      max = max || count;
      const existingEntities = this.entities.filter(e => e instanceof Entity && e.groupId === groupId);
      if (existingEntities.length >= max) {
        this.incubator = this.incubator.filter(e => !(e instanceof Entity && e.groupId === groupId));
      }
    });
    return this.incubator;
  }
  produceEntities() {
    const entities = [];
    this.config.forEach(({ groupId, Entity, count, max, min, opts }) => {
      min = min || count;
      let limit = min;
      if (!this.initialized) {
        limit = count;
      }
      const existingEntities = this.entities.filter(e => e instanceof Entity && e.groupId === groupId);
      for (let i = existingEntities.length; i < limit; i++) {
        opts.position = _p5.createVector(
          Util.random(this.dimensions.width),
          Util.random(this.dimensions.height)
        );
        opts.groupId = groupId;
        entities.push(new Entity(opts));
      }
    });
    this.initialized = true;
    return entities;
  }
}

class Simulation {
  constructor({ canvasId, entityConfig, framerate, theme }) {
    this.renderer = {
      stage: new createjs.Stage(canvasId),
      theme: Theme.get(theme)
    };
    this.resize();
    this.applyBackgroundColor(canvasId);
    this.dimensions = {
      width: this.renderer.stage.canvas.width,
      height: this.renderer.stage.canvas.height
    };
    this.ep = new EntityProcessor({ entityConfig, dimensions: this.dimensions });
    createjs.Ticker.framerate = framerate;
  }
  render() { }
  run() {
    this.render();
    createjs.Ticker.addEventListener('tick', () => {
      this.ep.step({ renderer: this.renderer, dimensions: this.dimensions });
      this.renderer.stage.update();
    });
  }
  resize() {
    this.renderer.stage.canvas.width = window.innerWidth;
    this.renderer.stage.canvas.height = window.innerHeight;
  }
  applyBackgroundColor(canvasId) {
    document.getElementById(canvasId).style.backgroundColor = this.renderer.theme.backgroundColor;
  }
}

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
    if (weights) {
      this.network.weights = weights;
    } else {
      this.network.randomize();
      this.network.weights = this.network.weights.map(i => Util.roundToDecimal(i));
    }
  }
  compute(env, agent, entities) {
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
    let childOptions = Brain.crossover(this.network.weights, partnerBrain.network.weights);
    let childWeights = childOptions[Util.random(1) < 0.5 ? 1 : 0];
    let childBrain = this.clone();
    childBrain.network.weights = childWeights;
    return childBrain;
  }
  mutate() {
    let data = this.network.weights;
    let swap1 = Math.floor(Util.random() * data.length);
    let swap2 = Math.floor(Util.random() * data.length);
    swap1 += (swap1 === swap2 && swap1 > 0) ? -1 : 1;
    let temp = data[swap1];
    data[swap1] = data[swap2];
    data[swap2] = temp;
  }
  static crossover(father, mother) {
    let len = mother.length;
    let cutLength = Math.floor(len / 3);
    let cutA = cutLength;
    let cutB = cutA + cutLength;
    if (cutA > cutB) {
      let tmp = cutB;
      cutB = cutA;
      cutA = tmp;
    }
    let child1 = [...father.slice(0, cutA), ...mother.slice(cutA, cutB), ...father.slice(cutB, len)];
    let child2 = [...mother.slice(0, cutA), ...father.slice(cutA, cutB), ...mother.slice(cutB, len)];
    return [child1, child2];
  }
}

class Agent {
  constructor({
    isActive = true,
    groupId,
    age = 0,
    position,
    matingRate = 0.001,
    mutationRate = 0.001,
    health = 500,
    healthDrain = 1,
    agroDrain = 4,
    healthImpact = 3000,
    size = 6,
    isAgro = false,
    agroRate = -0.8,
    brain
  }) {
    this.isActive = isActive;
    this.groupId = groupId;
    this.age = age;
    this.health = health;
    this.healthDrain = healthDrain;
    this.agroDrain = agroDrain;
    this.healthImpact = healthImpact;
    this.size = size;
    this.isAgro = isAgro;
    this.agroRate = agroRate;
    this.maxSpeed = 4;
    this.position = position;
    this.velocity = _p5.createVector(0, 0);
    this.acceleration = _p5.createVector(0, 0);
    this.matingRate = matingRate;
    this.mutationRate = mutationRate;
    this.brain = brain || new Brain({
      inputs: ['nearestAgentX', 'nearestAgentY', 'nearestAgentIsAgro', 'nearestEdibleX', 'nearestEdibleY', 'nearestEdibleIsPoison'],
      outputs: ['desiredForceX', 'desiredForceY', 'acceleration', 'agro'],
      midLayerNodes: 8
    });
  }
  step(entities, incubator, dimensions) {
    const env = this.prepEnvironment(entities);
    this.acceleration.mult(0);
    this.updateStats();
    this.think(env, entities);
    this.updateMovement();
    if (this.isAgro) {
      if (env.nearestAgent) this.attemptToEat(env.nearestAgent);
    } else {
      if (env.nearestEdible) this.attemptToEat(env.nearestEdible);
    }
    this.handleMating(env.agents, incubator);
    Util.wrapAround(this.position, dimensions);
  }
  render(entities, renderer) {
    if (renderer && !this.shape) {
      this.shape = new createjs.Shape();
      renderer.stage.addChild(this.shape);
    }
    if (this.isActive) {
      this.shape.x = this.position.x;
      this.shape.y = this.position.y;
      let bodyColor = this.isAgro ? renderer.theme.agroAgentBodyColor : renderer.theme.agentBodyColor;
      this.shape.graphics.clear().setStrokeStyle(3).beginStroke(renderer.theme.agentOutlineColor).beginFill(bodyColor).drawCircle(0, 0, this.size);
    } else {
      renderer.stage.removeChild(this.shape);
    }
  }
  updateMovement() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
  }
  think(env, entities) {
    this.brain.compute(env, this, entities);
  }
  seek(target) {
    let desired = p5.Vector.sub(target.position, this.position);
    desired.normalize();
    desired.mult(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.velocity);
    this.applyForce(steer);
  }
  updateStats() {
    this.age += 1;
    this.health -= (this.healthDrain * (this.isAgro ? this.agroDrain : 1));
    if (this.health <= 0) this.isActive = false;
  }
  attemptToEat(entity) {
    if (Util.checkCollision(this, entity)) {
      this.health += entity.eat();
    }
  }
  eat() {
    this.isActive = false;
    return this.healthImpact;
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
    const position = this.position.copy();
    position.x += 20;
    position.y += 20;
    return new Agent({
      brain: this.brain.mate(partner.brain),
      position,
      groupId: this.groupId,
      healthDrain: this.healthDrain,
      agroDrain: this.agroDrain,
      healthImpact: this.healthImpact,
      size: this.size,
      agroRate: this.agroRate,
      maxSpeed: this.maxSpeed,
      matingRate: this.matingRate,
      mutationRate: this.mutationRate
    });
  }
  prepEnvironment(entities) {
    let agents = entities.filter(e => e instanceof Agent);
    let nearestAgent = null;
    let nearestAgentVector = null;
    if (agents.length) {
      nearestAgent = Util.findNearest(this, agents);
      let desiredVectorToAgent = p5.Vector.sub(nearestAgent.position, this.position);
      nearestAgentVector = p5.Vector.sub(desiredVectorToAgent, this.velocity);
      nearestAgentVector.normalize();
    }
    let edibles = entities.filter(e => e instanceof Edible);
    let nearestEdible = null;
    let nearestEdibleVector = null;
    if (edibles.length) {
      nearestEdible = Util.findNearest(this, edibles);
      let desiredVectorToEdible = p5.Vector.sub(nearestEdible.position, this.position);
      nearestEdibleVector = p5.Vector.sub(desiredVectorToEdible, this.velocity);
      nearestEdibleVector.normalize();
    }
    return {
      agents,
      nearestAgent,
      nearestAgentVector,
      edibles,
      nearestEdible,
      nearestEdibleVector
    };
  }
}

class Edible {
  constructor({ isActive = true, position, groupId }) {
    this.isActive = isActive;
    this.groupId = groupId;
    this.position = position;
    this.size = 4;
    this.healthImpact = 0;
  }
  render(entities, renderer) {
    if (renderer && !this.shape) {
      this.shape = new createjs.Shape();
      renderer.stage.addChild(this.shape);
      this.shape.graphics.setStrokeStyle(2).beginStroke(renderer.theme.edibleOutlineColor).beginFill(this.getColor(renderer.theme)).drawCircle(0, 0, this.size);
    }
    if (this.isActive) {
      this.shape.x = this.position.x;
      this.shape.y = this.position.y;
    } else {
      renderer.stage.removeChild(this.shape);
    }
  }
  eat() {
    this.isActive = false;
    return this.healthImpact;
  }
}

class Food extends Edible {
  constructor(opts) {
    super(opts);
    this.healthImpact = opts.healthImpact;
    this.size = opts.size;
  }
  getColor(theme) {
    return theme.foodColor;
  }
}

class Poison extends Edible {
  constructor(opts) {
    super(opts);
    this.healthImpact = opts.healthImpact;
    this.size = opts.size;
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
    return entities.filter(e => e !== entity).reduce((prev, curr) => {
      const currentIsCloser = entity.position.dist(curr.position) < entity.position.dist(prev.position);
      return currentIsCloser ? curr : prev;
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
  static roundToDecimal(i) {
    return Math.round(i * 10) / 10;
  }
}

let Inputs = {
  nearestAgentX: {
    displayName: 'Nearest Agent X',
    process: (env, agent, entities) => {
      return env.nearestAgentVector ? env.nearestAgentVector.x : 0;
    }
  },
  nearestAgentY: {
    displayName: 'Nearest Agent Y',
    process: (env, agent, entities) => {
      return env.nearestAgentVector ? env.nearestAgentVector.y : 0;
    }
  },
  nearestAgentIsAgro: {
    displayName: 'Nearest Agent Agro/Peaceful',
    process: (env, agent, entities) => {
      return env.nearestAgent.isAgro ? 1 : -1;
    }
  },
  nearestEdibleX: {
    displayName: 'Nearest Edible X',
    process: (env, agent, entities) => {
      return env.nearestEdibleVector ? env.nearestEdibleVector.x : 0;
    }
  },
  nearestEdibleY: {
    displayName: 'Nearest Edible Y',
    process: (env, agent, entities) => {
      return env.nearestEdibleVector ? env.nearestEdibleVector.y : 0;
    }
  },
  nearestEdibleIsPoison: {
    displayName: 'Nearest Edible Food/Poison',
    process: (env, agent, entities) => {
      return env.nearestEdible instanceof Poison ? 1 : -1;
    }
  }
};

let Outputs = {
  desiredForceX: {
    displayName: 'Desired Force X',
    process: (val, agent) => {
      agent.applyForce(_p5.createVector(val, 0).mult(agent.maxSpeed));
    }
  },
  desiredForceY: {
    displayName: 'Desired Force Y',
    process: (val, agent) => {
      agent.applyForce(_p5.createVector(0, val).mult(agent.maxSpeed));
    }
  },
  acceleration: {
    displayName: 'Acceleration',
    process: (val, agent) => {
      agent.applyForce(agent.acceleration.mult(val));
    }
  },
  agro: {
    displayName: 'Agro',
    process: (val, agent) => {
      agent.isAgro = val < agent.agroRate;
    }
  }
};

class Theme {
  static get(theme) {
    const themes = {
      circus: {
        backgroundColor: '#000',
        foodColor: '#0da5bd',
        poisonColor: '#ff3838',
        agentBodyColor: '#72ff83',
        agentOutlineColor: '#000',
        edileOutlineColor: '#000',
        agroAgentBodyColor: '#ff803f'
      },
      bloop: {
        backgroundColor: '#223',
        foodColor: '#00f4b6',
        poisonColor: '#bf4fff',
        agentBodyColor: '#3de1ff',
        agentOutlineColor: '#000',
        edibleOutlineColor: '#000',
        agroAgentBodyColor: '#ff5588'
      }
    };
    return themes[theme];
  }
}

function init() {
  const eli = new Brain(JSON.parse('{"inputs":["nearestAgentX","nearestAgentY","nearestAgentIsAgro","nearestEdibleX","nearestEdibleY","nearestEdibleIsPoison"],"outputs":["desiredForceX","desiredForceY","acceleration","agro"],"midLayerNodes":8,"weights":[-0.6,-0.1,0.2,-0.1,0.9,0.2,-0.3,0,0.6,0.9,-0.9,0.5,0.8,-0.5,-0.3,-0.5,0,-0.3,0.6,-0.7,0.2,0.4,-0.3,-0.1,0.5,1,0.3,-0.1,0.8,0,-0.8,0.9,0.8,-0.3,0.8,0.3,0.9,0.4,-0.1,0.2,-0.9,0.1,0.5,-0.2,-0.6,0.4,0.4,0.2,-0.2,-0.2,0.7,-0.6,-0.3,-0.5,0.1,0.9,0.3,0.6,1,-0.5,-0.9,-0.6,0.5,-0.1,-0.8,-0.3,0.4,0.6,0.7,0.9,0.5,-0.2,0.8,-0.8,-0.5,-0.1,-0.7,-1,-0.4,-0.7,-0.1,0.2,0.9,0.4,-0.3,0.4,0.7,0.8,-1,-0.7,0,0.4]}'));
  const sim = new Simulation({
    canvasId: 'main-canvas',
    framerate: 30,
    theme: 'bloop',
    entityConfig: [
      { groupId: 'normies', Entity: Agent, count: 60, max: 100, min: 4, opts: { size: 8 } },
      { groupId: 'eli', Entity: Agent, count: 4, opts: { size: 8, brain: eli } },
      { groupId: 'poison', Entity: Poison, count: 25, opts: { healthImpact: -1000, size: 5 } },
      { groupId: 'food', Entity: Food, count: 60, opts: { healthImpact: 500, size: 4 } }
    ]
  });
  sim.run();
}

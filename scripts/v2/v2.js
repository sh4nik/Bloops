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
      this.entities.forEach(e => {
        if (e.render) e.render(this.entities, renderer);
      });
    }
    this.entities = this.entities.filter(e => e.isActive);
  }
  limitPopulation() {
    this.config.forEach(({ Entity, count, max, min, opts }) => {
      const existingEntities = this.entities.filter(e => e instanceof Entity);
      if (existingEntities.length >= max) {
        this.incubator = this.incubator.filter(e => !(e instanceof Entity));
      }
    });
    return this.incubator;
  }
  produceEntities() {
    const entities = [];
    this.config.forEach(({ Entity, count, max, min, opts }) => {
      let limit = min;
      if (!this.initialized) {
        limit = count;
      }
      const existingEntities = this.entities.filter(e => e instanceof Entity);
      for (let i = existingEntities.length; i < limit; i++) {
        opts.position = _p5.createVector(
          Util.random(this.dimensions.width),
          Util.random(this.dimensions.height)
        );
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
      return env.nearestAgent.isAgro ? 1 : 0;
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
      return env.nearestEdible instanceof Poison ? 1 : 0;
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
    age = 0,
    position,
    matingRate = 0.001,
    mutationRate = 0.001,
    health = 2000,
    healthDrain = 10,
    agroDrain = 3,
    healthImpact = 4000,
    size = 6,
    isAgro = true,
    agroRate = -0.8,
    brain
  }) {
    this.isActive = isActive;
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
      this.shape.graphics.clear().beginFill(bodyColor).drawCircle(0, 0, this.size);
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
    position.x += 10;
    position.y += 10;
    return new Agent({
      brain: this.brain.mate(partner.brain),
      position
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
    this.healthImpact = 500;
  }
  getColor(theme) {
    return theme.foodColor;
  }
}

class Poison extends Edible {
  constructor(opts) {
    super(opts);
    this.healthImpact = -1500;
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
      return currentIsCloser || entity === prev ? curr : prev;
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
        poisonColor: '#ff3838',
        agentBodyColor: '#96e7ac',
        agroAgentBodyColor: '#f47d42'
      },
      bloop: {
        backgroundColor: '#000006',
        foodColor: '#00f4b6',
        poisonColor: '#bf4fff',
        agentBodyColor: '#3de1ff',
        agroAgentBodyColor: '#bb1133'
      }
    };
    return themes[theme];
  }
}

function init() {

  const eli = new Brain(JSON.parse('{"inputs":["nearestAgentX","nearestAgentY","nearestAgentIsAgro","nearestEdibleX","nearestEdibleY","nearestEdibleIsPoison"],"outputs":["desiredForceX","desiredForceY","acceleration","agro"],"midLayerNodes":8,"weights":[-0.016921616876730106,-0.9116177007855297,-0.211088401735962,0.9482633087739698,-0.22002697148914763,-0.7164009222974115,0.2974481298887568,-0.7728861278867711,-0.4612727165602948,-0.9057482872474547,-0.22363014936397807,0.7174009574941094,-0.6689692559422378,0.8317849896681464,-0.4885913120909007,-0.4283681193725304,-0.7795324135563417,0.9423751063182837,-0.6470656902112277,0.7581232085104892,0.14253863514772158,-0.110957142924073,-0.3376012526147436,-0.49156799533720363,0.8089592329589084,0.01833418456635716,-0.22941111825040528,0.16233145095374057,0.22049675356778842,0.23567785958879428,0.3019420250403413,0.2896400965920689,-0.1595815642278735,0.7240772416655341,-0.25609900800835517,0.7086656923765218,0.8635936780186348,-0.6103115027109385,-0.22412521006165642,-0.5125590741706265,0.2613232101741225,-0.8866978719902416,-0.46443941118629173,0.3158716879690662,-0.4599018628655127,-0.5460333783690641,0.7788328198168863,-0.3256288618032279,0.8181425010325039,0.30925180901568927,-0.1921250445115934,0.1640716399917701,-0.1633802414940413,-0.6507926409659155,0.9508368354933934,0.28253375103549416,0.31335901237296415,0.597047269672554,0.8537715759321065,0.23118561198869614,0.6461099706816267,-0.43553447034887594,-0.41927151321281286,-0.3045660601097211,-0.23205889657640055,0.4168855082989884,0.34935986588556966,-0.5261242042300656,-0.8023747118581119,-0.9515244626950348,-0.9420707001497868,-0.06180084377183226,-0.24718400917238137,0.07874645513583989,0.9620120687590119,-0.3277365795950984,-0.3849325444703431,0.711674395650622,0.6329665823428194,-0.09073817869789336,0.7478626918676832,-0.5396312314903904,0.014052484739774496,0.6062487277411988,0.029952242507215843,0.9562756309021139,0.7977789935535946,0.2872239879558993,0.6491640971860329,-0.4946610410887633,-0.6253970299893301,0.22309945879802218]}'));

  const opts = {
    agent: {
      matingRate: 0.003,
      mutationRate: 0.001,
      size: 6
    },
    edible: {

    }
  };
  const sim = new Simulation({
    canvasId: 'main-canvas',
    framerate: 30,
    theme: 'circus',
    entityConfig: [
      { Entity: Agent, count: 50, max: 100, min: 2, opts: opts.agent },
      { Entity: Poison, count: 15, max: 15, min: 15, opts: opts.edible },
      { Entity: Food, count: 30, max: 30, min: 15, opts: opts.edible }
    ]
  });
  sim.run();
}

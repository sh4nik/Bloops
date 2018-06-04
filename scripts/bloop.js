let Bloop = function(position, dna) {

    this.id;
    this.age = 12;
    this.health = 550;
    this.size = 14;
    this.maxSpeed = 1.3;

    sim.mutationRate = 0.25;

    this.bodyColorO = sim.color(0,255,255);
    this.outlineColor = sim.color(20);

    this.r = sim.random(100, 255);
    this.g = sim.random(100, 255);
    this.b = sim.random(100, 255);

    this.position = position;
    this.velocity = sim.createVector(0, 0);
    this.acceleration = sim.createVector(0, 0);

    this.isAgro = false;
 
    this.brain = ENCOG.BasicNetwork.create([
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),6,1),
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),4,1),
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),4,0)
    ]);
    this.brain.randomize();

    if (dna) {
        this.brain.weights = dna;
    }

};

Bloop.prototype.sim;

Bloop.prototype.update = function() {
    this.bodyColor = this.bodyColorO;
    this.processNearestFood();
    this.processNearestBloop();
    this.acceleration.mult(0);
    this.calculateNext();
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.boundaries();
    this.updateStats();
};

Bloop.prototype.updateStats = function() {
    this.health = this.health - (this.isAgro ? 10 : 1);
    this.age += 0.005;
    this.size = this.age < 18 ? this.age : 18;
};

Bloop.prototype.clicked = function () {
    let d = sim.dist(sim.mouseX, sim.mouseY, this.position.x, this.position.y);
    if (d < this.size * 2) {
        console.log(this);
        return true;
    }
};

Bloop.prototype.calculateNext = function() {

    let nearestFoodVector;
    let nearestBloopVector;
    if(this.nearestFood && this.nearestBloop) {
        var desired = p5.Vector.sub(this.nearestFood.position, this.position);
        nearestFoodVector = p5.Vector.sub(desired, this.velocity);
        nearestFoodVector.normalize();

        var desiredB = p5.Vector.sub(this.nearestBloop.position, this.position);
        nearestBloopVector = p5.Vector.sub(desiredB, this.velocity);
        nearestBloopVector.normalize();

        let input = [
            nearestFoodVector.x,
            nearestFoodVector.y,
            this.nearestFood.isPoison ? 1 : -1,
            nearestBloopVector.x,
            nearestBloopVector.y,
            this.nearestBloop.isAgro ? 1 : -1
        ];

        let output = [];

        this.brain.compute(input, output);

        let outVector = sim.createVector(output[0], output[1]);
        outVector.setMag(output[2]);
        this.applyForce(outVector);

        this.r = sim.map(sim.map(this.health > 600 ? 600 : this.health, 0, 600, -1, 1), -1, 1, 80, 255);
        this.g = 80;
        this.b = sim.map(input[2], -1, 1, 80, 255);

        this.isAgro = output[3] > 0.8;

    }
};

Bloop.prototype.applyForce = function(force) {
    this.acceleration.add(force);
}

Bloop.prototype.processNearestFood = function() {
    this.nearestFood = null;
    let nearestFoodIndex = -1;
    let shortestDistance = sim.width;
    for(let i = 0; i < sim.food.length; i++) {
        let dist = this.position.dist(sim.food[i].position);
        if(dist < shortestDistance) {
            shortestDistance = dist;
            nearestFoodIndex = i;
        }
    }
    if(!this.isAgro && nearestFoodIndex !== -1 && (shortestDistance < ((this.size < sim.food[nearestFoodIndex].size) ? sim.food[nearestFoodIndex].size : this.size - sim.food[nearestFoodIndex].size))) {
        if(sim.food[nearestFoodIndex].isPoison) {
            this.health -= sim.food[nearestFoodIndex].health * 5;
        } else {
            this.health += sim.food[nearestFoodIndex].health;
        }
        sim.food.splice(nearestFoodIndex, 1);
    } else {
        this.nearestFood = sim.food[nearestFoodIndex];
    }
    
};

Bloop.prototype.processNearestBloop = function() {
    this.nearestBloop = null;
    let nearestBloopIndex = -1;
    let shortestDistance = sim.width;
    for(let i = 0; i < sim.bloops.length; i++) {
        let dist = this.position.dist(sim.bloops[i].position);
        if(dist < shortestDistance  && sim.bloops[i] != this) {
            shortestDistance = dist;
            nearestBloopIndex = i;
        }
    }

    this.nearestBloop = sim.bloops[nearestBloopIndex];

    if(nearestBloopIndex !== -1 && (shortestDistance < (this.size / 2 + sim.bloops[nearestBloopIndex].size / 2 ) * 1.4)) {
        if(this.isAgro) {
            let absorbtionRate = (this.age < 18 ? this.age  * 0.2 : 18  * 0.5);
            this.health += Food.prototype.health * 4 * absorbtionRate;
            this.nearestBloop.health -= Food.prototype.health * 6 * absorbtionRate;
        }

        if(this.nearestBloop.isAgro) {
            this.bodyColor = sim.color(200, 80, 80);
        }
    }
    
};

Bloop.prototype.boundaries = function() {
    if (this.position.x < 0) {
        this.position.x = sim.width;
    }
    if (this.position.y < 0) {
        this.position.y = sim.height;
    }
    if (this.position.x > sim.width) {
        this.position.x = 0;
    }
    if (this.position.y > sim.height) {
        this.position.y = 0;
    }
}

Bloop.prototype.mate = function(bloopPartner) {
    let dna1 = this.brain.weights;
    let dna2 = bloopPartner.brain.weights;

    let children = this.crossover(dna1, dna2);

    let child1 = children[0];
    let child2 = children[1];

    let child;
    let toss = sim.random(1);
    let childBrain = toss < 0.5 ? child1 : toss < 0.7 ? child2 : dna1;
    if(sim.random(1) < sim.mutationRate)  {
        this.mutate(childBrain);
        child = new Bloop(new p5.Vector(this.position.x + sim.random(-this.size * 2, this.size * 2), this.position.y + sim.random(-this.size * 2, this.size * 2)), childBrain);
        child.bodyColorO = sim.color(150);
    } else {
        child = new Bloop(new p5.Vector(this.position.x + sim.random(-this.size * 2, this.size * 2), this.position.y + sim.random(-this.size * 2, this.size * 2)), childBrain);
    }

    return child;
}

Bloop.prototype.crossover = function performCrossover(motherArray, fatherArray) {
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
    child1ArrayTemp = child1ArrayTemp.concat(fatherArray.slice(0,ca));
    child1ArrayTemp = child1ArrayTemp.concat(motherArray.slice(ca, cb));
    child1ArrayTemp = child1ArrayTemp.concat(fatherArray.slice(cb, len));

    var child2ArrayTemp = [];
    child2ArrayTemp = child2ArrayTemp.concat(motherArray.slice(0,ca));
    child2ArrayTemp = child2ArrayTemp.concat(fatherArray.slice(ca, cb));
    child2ArrayTemp = child2ArrayTemp.concat(motherArray.slice(cb, len));

    let children = [];
    children.push(child1ArrayTemp);
    children.push(child2ArrayTemp);

    return children;
};


Bloop.prototype.mutate = function performMutation(data) {
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
};
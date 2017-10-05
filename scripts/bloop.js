let Bloop = function(position) {

    this.id;
    this.health = 200;
    this.size = 14;
    this.maxSpeed = 1;

    this.bodyColor = sim.color(120, 150, 255);

    this.r = sim.random(100, 255);
    this.g = sim.random(100, 255);
    this.b = sim.random(100, 255);

    this.position = position;
    this.velocity = sim.createVector(0, 0);
    this.acceleration = sim.createVector(0, 0);

    this.brain = ENCOG.BasicNetwork.create([
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),2,1),
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),4,1),
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),6,0)
    ]);
    this.brain.randomize();

    this.update = function() {
        this.processNearestFood();
        this.calculateNext();
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
        this.boundaries();
        this.updateStats();
    };

    this.updateStats = function() {
        this.health--;
    };

    this.calculateNext = function() {

        let nearestFoodVector;
        if(this.nearestFood) {
            var desired = p5.Vector.sub(this.nearestFood.position, this.position);
            nearestFoodVector = p5.Vector.sub(desired, this.velocity);
            nearestFoodVector.normalize();
        } else {
            nearestFoodVector = sim.createVector(0, 0);
        }

        let input = [nearestFoodVector.x, nearestFoodVector.y];
        let output = [];
        this.brain.compute(input, output);

        let outVector = sim.createVector(output[0], output[1]);
        outVector.setMag(output[2]);
        this.applyForce(outVector);
        // this.velocity = outVector;

        this.r = sim.map(output[3], -1, 1, 100, 255);
        this.g = sim.map(output[4], -1, 1, 100, 255);
        this.b = sim.map(output[5], -1, 1, 100, 255);
    };

    this.applyForce = function(force) {
        this.acceleration.add(force);
    }

    this.processNearestFood = function() {
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
        if(nearestFoodIndex !== -1 && (shortestDistance < ((this.size < sim.food[nearestFoodIndex].size) ? sim.food[nearestFoodIndex].size : this.size - sim.food[nearestFoodIndex].size))) {
            this.health += sim.food[nearestFoodIndex].health;
            sim.food.splice(nearestFoodIndex, 1);
        } else {
            this.nearestFood = sim.food[nearestFoodIndex];
        }
        
    };

    this.boundaries = function() {
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

};

Bloop.prototype.sim;
Bloop.prototype.lastId = 0;
Bloop.prototype.deathRate = 0.8;
Bloop.prototype.foodHealth = 500;
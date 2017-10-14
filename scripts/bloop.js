let Bloop = function(position, dna) {

    this.id;
    this.age = 12;
    this.health = 550;
    this.size = 14;
    this.maxSpeed = 1;

    sim.mutationRate = 0.4;

    this.bodyColor = sim.color(120, 200, 255);

    this.r = sim.random(100, 255);
    this.g = sim.random(100, 255);
    this.b = sim.random(100, 255);

    this.position = position;
    this.velocity = sim.createVector(0, 0);
    this.acceleration = sim.createVector(0, 0);

    this.isAgro = false;

    this.brain = ENCOG.BasicNetwork.create([
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),7,1),
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),8,1),
        ENCOG.BasicLayer.create(ENCOG.ActivationTANH.create(),4,0)
    ]);
    this.brain.randomize();

    if (dna) {
        this.brain.weights = dna;
    }

    this.update = function() {
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

    this.updateStats = function() {
        this.health = this.health - (this.isAgro ? 4 : 1);
        this.age += 0.005;
        this.size = this.age < 18 ? this.age : 18;
    };

    this.calculateNext = function() {

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
                this.nearestBloop.isAgro ? 1 : -1,
                sim.map(this.health > 600 ? 600 : this.health, 0, 600, -1, 1)
            ];

            let output = [];

            this.brain.compute(input, output);

            let outVector = sim.createVector(output[0], output[1]);
            outVector.setMag(output[2]);
            this.applyForce(outVector);
            // this.velocity = outVector;

            this.r = sim.map(input[2], -1, 1, 80, 255);
            this.g = sim.map(input[6], -1, 1, 80, 255);
            this.b = sim.map(input[5], -1, 1, 80, 255);

            this.isAgro = output[3] > 0.8;

        }
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
        if(!this.isAgro && nearestFoodIndex !== -1 && (shortestDistance < ((this.size < sim.food[nearestFoodIndex].size) ? sim.food[nearestFoodIndex].size : this.size - sim.food[nearestFoodIndex].size))) {
            if(sim.food[nearestFoodIndex].isPoison) {
                this.health -= sim.food[nearestFoodIndex].health;
            } else {
                this.health += sim.food[nearestFoodIndex].health;
            }
            sim.food.splice(nearestFoodIndex, 1);
        } else {
            this.nearestFood = sim.food[nearestFoodIndex];
        }
        
    };

    this.processNearestBloop = function() {
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

        if(nearestBloopIndex !== -1 && (shortestDistance < ((this.size < sim.bloops[nearestBloopIndex].size) ? sim.bloops[nearestBloopIndex].size : this.size - sim.bloops[nearestBloopIndex].size))) {
            if(this.isAgro) {
                this.health += Food.prototype.health * 4;
                this.nearestBloop.health -= Food.prototype.health * 6;
            }
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

    this.mate = function(bloopPartner) {
        let dna1 = this.brain.weights;
        let dna2 = bloopPartner.brain.weights;

        let child1 = [];
        let child2 = [];

        this.crossover(dna1, dna2, child1, child2);

        let child;
        let toss = sim.random(1);
        let childBrain = toss < 0.2 ? child1 : toss < 0.4 ? child2 : dna1;
        if(sim.random(1) < sim.mutationRate)  {
            this.mutate(childBrain);
            child = new Bloop(new p5.Vector(this.position.x + sim.random(-this.size * 2, this.size * 2), this.position.y + sim.random(-this.size * 2, this.size * 2)), childBrain);
            child.bodyColor = sim.color(150);
        } else {
            child = new Bloop(new p5.Vector(this.position.x + sim.random(-this.size * 2, this.size * 2), this.position.y + sim.random(-this.size * 2, this.size * 2)), childBrain);
        }

        return child;
    }

    this.crossover = function performCrossover(motherArray, fatherArray, child1Array, child2Array) {
        // the chromosome must be cut at two positions, determine them
        var cutLength = motherArray.length / 5;
        var cutpoint1 = Math.floor(Math.random() * (motherArray.length - cutLength));
        var cutpoint2 = cutpoint1 + cutLength;
        // keep track of which genes have been taken in each of the two
        // offspring, defaults to false.
        var taken1 = {};
        var taken2 = {};
        // handle cut section
        for (var i = 0; i < motherArray.length; i++)
        {
            if (!((i < cutpoint1) || (i > cutpoint2)))
            {
                child1Array[i] = fatherArray[i];
                child2Array[i] = motherArray[i];
                taken1[fatherArray[i]] = true;
                taken2[motherArray[i]] = true;
            }
        }
        // handle outer sections
        for (var i = 0; i < motherArray.length; i++)
        {
            if ((i < cutpoint1) || (i > cutpoint2))
            {
                child1Array[i] = this.getNotTaken(motherArray,taken1);
                child2Array[i] = this.getNotTaken(fatherArray,taken2);
            }
        }
    };

    this.getNotTaken = function (source, taken)
        {
            for(var i=0;i<source.length;i++)
            {
                var trial = source[i];
                if( taken[trial] != true )
                {
                    taken[trial] = true;
                    return trial;
                }
            }
            return -1;
        }


    this.mutate = function performMutation(data) {
        var iswap1 = Math.floor(Math.random() * data.length);
        var iswap2 = Math.floor(Math.random() * data.length);
        // can't be equal
        if (iswap1 == iswap2)
        {
            // move to the next, but
            // don't go out of bounds
            if (iswap1 > 0)
            {
                iswap1--;
            } else {
                iswap1++;
            }
        }
        var t = data[iswap1];
        data[iswap1] = data[iswap2];
        data[iswap2] = t;
    };

};

Bloop.prototype.sim;
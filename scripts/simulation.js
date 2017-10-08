let simulation = function(sim) {

    sim.bloopCount = 2;
    sim.foodCount = 200;

    sim.matingRate = 0.002;
    sim.maxBloops = 100;
    sim.minBloops = 5;

    sim.bloops = [];
    sim.food = [];

    Bloop.sim = sim;
    Food.sim = sim;



    sim.setup = function() {
        let cnv = sim.createCanvas(sim.windowWidth, sim.windowHeight);
        cnv.parent('simulation-container');

        for(let i = 0; i < sim.bloopCount; i++) {
            sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }

        for(let i = 0; i < sim.foodCount; i++) {
            sim.food.push(new Food(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }
    };

    sim.draw = function() {
        sim.background(30);

        sim.bloops = sim.bloops.sort(function(a, b){
            return b.health - a.health;
        });

        if(sim.bloops.length < sim.minBloops) {
            sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }

        for (let i = sim.food.length; i < sim.foodCount; i++) {
            sim.food.push(new Food(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }

        sim.food.forEach(foodParticle => {
            sim.drawFood(foodParticle);
        });

        var i = sim.bloops.length;
        while (i--) {
            let bloop = sim.bloops[i];
            if(bloop.health > 0) {
                bloop.update();
                sim.drawBloop(bloop);
            } else {
                sim.bloops.splice(i, 1);
            }
        }

        if(sim.bloops.length < sim.maxBloops) {
            sim.bloops.forEach(bloop => {
                if(sim.random(1) < sim.matingRate) {
                    sim.bloops.push(bloop.mate(sim.bloops[0]));
                }
            });
        }

    };

    sim.drawFood = function(foodParticle) {
        sim.noStroke();
        if(foodParticle.isPoison) {
            sim.fill(200, 80, 80);
        } else {
            sim.fill(80, 200, 80);
        }
        sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size, foodParticle.size);
    };

    sim.drawBloop = function(bloop) {
        sim.push();
        sim.translate(bloop.position.x, bloop.position.y);

        var angle = bloop.velocity.heading() + sim.PI / 2;
        sim.rotate(angle);

        sim.stroke(20);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.bodyColor);
        sim.ellipse(0, 0, bloop.size, bloop.size);
        sim.line(0, 0, 0, -bloop.size / 2);

        sim.fill(bloop.health > 45 ? bloop.health : 45);
        sim.ellipse(0, -bloop.size / 2, bloop.size / 3, bloop.size / 3);


        sim.noStroke();
        sim.fill(200, 30);
        sim.rect(-bloop.size / 4, bloop.size / 2, bloop.size / 2, bloop.velocity.mag() * bloop.size * 0.6);

        sim.stroke(20);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.r, bloop.g, bloop.b);
        sim.rect(-bloop.size / 4, 0, bloop.size / 2, bloop.size / 2);


        sim.pop();
    };

};
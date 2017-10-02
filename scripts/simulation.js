let simulation = function(sim) {

    sim.bloopCount = 100;
    sim.foodCount = 30;

    sim.bloops = [];
    sim.food = [];

    Bloop.sim = sim;
    Food.sim = sim;

    sim.setup = function() {
        let cnv = sim.createCanvas(1000, 900);
        cnv.parent('simulation-container');

        for(let i = 0; i < sim.bloopCount; i++) {
            sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }

        for(let i = 0; i < sim.foodCount; i++) {
            sim.food.push(new Food(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }
    };

    sim.draw = function() {
        sim.background(50);

        for (let i = sim.food.length; i < sim.foodCount; i++) {
            sim.food.push(new Food(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }

        sim.food.forEach(foodParticle => {
            sim.drawFood(foodParticle);
        });

        sim.bloops.forEach(bloop => {
            bloop.update();
            sim.drawBloop(bloop);
        });
    };

    sim.drawFood = function(foodParticle) {
        sim.noStroke();
        sim.fill(100, 180, 100);
        sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size, foodParticle.size);
    };

    sim.drawBloop = function(bloop) {
        sim.push();
        sim.translate(bloop.position.x, bloop.position.y);

        var angle = bloop.velocity.heading() + sim.PI / 2;
        sim.rotate(angle);

        sim.stroke(40);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.bodyColor);
        sim.ellipse(0, 0, bloop.size, bloop.size);
        sim.line(0, 0, 0, -bloop.size / 2);

        sim.fill(255);
        sim.ellipse(0, -bloop.size / 2, bloop.size / 3, bloop.size / 3);


        sim.noStroke();
        sim.fill(200, 30);
        sim.rect(-bloop.size / 4, bloop.size / 2, bloop.size / 2, bloop.velocity.mag() * bloop.size * 0.6);

        sim.stroke(40);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.r, bloop.g, bloop.b);
        sim.rect(-bloop.size / 4, 0, bloop.size / 2, bloop.size / 2);


        sim.pop();
    };

};
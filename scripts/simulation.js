let simulation = function(sim) {

    sim.bloopCount = 500;
    sim.foodCount = 400;

    sim.matingRate = 0.04;
    sim.maxBloops = 50;
    sim.minBloops = 5;

    sim.bloops = [];
    sim.food = [];

    Bloop.sim = sim;
    Food.sim = sim;

    sim.selectedBloop = null;
    sim.selectionColor = '#ff9999';


    sim.setup = function() {
        let cnv = sim.createCanvas(sim.windowWidth, sim.windowHeight);
        cnv.parent('simulation-container');

        sim.frameRate(30);


        let sample = [-0.8, -0.1, -0.1, -0.9, 0.7, 0.1, -1, 0.9, -1, -0.3, -1, -0.5, -0.8, -0.7, -0.9, 0.6, -0.2, 0.4, -0, -0, 1, -0.3, -0.3, 0.6, -0.5, -0.9, -0.7, 0.1, 0.6, -1, -0, -0.1, 0.6, -0.5, -0.2, -0.9, -1, -0.7, 0.6, 0.4, -0.6, 0.7, 0.2, -0.4, -0.1, -0, -0.6, -0.5];
        for(let i = 0; i < sim.bloopCount; i++) {
            sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height)), sample));
        }

        for(let i = 0; i < sim.foodCount; i++) {
            sim.food.push(new Food(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }
    };

    sim.draw = function() {
        sim.background(30);

        console.log(sim.frameRate());

        sim.bloops = sim.bloops.sort(function(a, b){
            return b.health - a.health;
        });

        if(sim.bloops.length < sim.minBloops) {
            sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }

        if (sim.food.length < 50)
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

                if(bloop.size > 12.1) {
                    bloop.update();
                } else {
                    bloop.updateStats();
                }
                
                sim.drawBloop(bloop);
            } else {
                sim.food.push(new Food(new p5.Vector(sim.bloops[i].position.x, sim.bloops[i].position.y), false));
                sim.bloops.splice(i, 1);
            }
        }

        if(sim.bloops.length < sim.maxBloops) {
            sim.bloops.forEach(bloop => {
                if(sim.random(1) < sim.matingRate) {
                    sim.bloops.push(bloop.mate(sim.findPartner()));
                }
            });
        }

    };

    sim.findPartner = function() {
        let total = 0;
        sim.bloops.forEach(bloop => {
            total += bloop.health;
        });
        sim.bloops.forEach(bloop => {
            bloop.matingProbability = bloop.health / total;
        });

        let x = sim.random(1);
        let index = 0;

        while(x > 0) {
            x -= sim.bloops[index].matingProbability;
            index++;
        }

        index--;

        return sim.bloops[index];
    };

    sim.mousePressed = function() {
        sim.selectedBloop = null;
        sim.bloops.forEach(bloop => {
            if(bloop.clicked()) {
                sim.selectedBloop = bloop;
                return;
            }
        });
    };

    sim.drawFood = function(foodParticle) {
        sim.noStroke();
        if(foodParticle.isPoison) {
            sim.fill(182, 102, 255, 2);
            sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size * 30, foodParticle.size * 30);
        } else {
            sim.fill(0, 255, 204, 1);
            sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size * 30, foodParticle.size * 30);
        }

        sim.stroke(5);
        if(foodParticle.isPoison) {
            sim.fill(182, 102, 255, 150);
        } else {
            sim.fill(0, 255, 204, 150);
        }

        sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size, foodParticle.size);
    };

    sim.drawBloop = function(bloop) {
        sim.push();
        sim.translate(bloop.position.x, bloop.position.y);

        var angle = bloop.velocity.heading() + sim.PI / 2;
        sim.rotate(angle);

        sim.strokeWeight(bloop.size / 8);

        if (sim.selectedBloop && sim.selectedBloop === bloop) {
            sim.stroke(sim.selectionColor);
            sim.fill(0, 0, 0, 0);
            sim.ellipse(0, 0, bloop.size * 3.5, bloop.size * 3.5);
            sim.stroke(100, 100, 100);
            sim.ellipse(0, 0, bloop.size * 3, bloop.size * 3);
        }

        sim.stroke(bloop.outlineColor);
        
        if (bloop === sim.bloops[0]) {
            sim.fill(200, 100, 250);
        } else {
            sim.fill(bloop.bodyColor);
        }
        
        sim.ellipse(0, 0, bloop.size, bloop.size);

        if (bloop.size > 12.1) {

        sim.line(0, 0, 0, -bloop.size / 2);

        if(bloop.isAgro) {
            sim.fill(20);
            sim.stroke(255, 80, 80);
            sim.triangle(-bloop.size / 4, -bloop.size / 2, 0, -bloop.size / 2, -bloop.size / 4, -bloop.size / 5 * 3);
            sim.triangle(bloop.size / 4, -bloop.size / 2, 0, -bloop.size / 2, bloop.size / 4, -bloop.size / 5 * 3);
        }

        sim.stroke(bloop.outlineColor);

        sim.fill(bloop.health > 45 ? bloop.health : sim.color(45));
        
        sim.ellipse(0, -bloop.size / 2, bloop.size / 3, bloop.size / 3);


        sim.noStroke();
        sim.fill(200, 40);
        let tailScale = bloop.velocity.mag() * bloop.maxSpeed * 0.55;
        sim.triangle(0, 0, -bloop.size / 2 * tailScale, tailScale * bloop.size, bloop.size / 2 * tailScale, tailScale * bloop.size);

        sim.stroke(20);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.r, bloop.g, bloop.b);
        sim.rect(-bloop.size / 4, 0, bloop.size / 2, bloop.size / 2);

    }

        sim.pop();
    };

    sim.drawSymbol = function(bloop) {
        var bitmap = [
            [1, 0, 0, 0, 0, 0, 0, 1],
            [0, 1, 0, 0, 0, 0, 1, 1], 
            [0, 0, 1, 0, 0, 1, 1, 0], 
            [0, 0, 0, 1, 1, 1, 0, 0], 
            [0, 0, 0, 1, 1, 0, 0, 0], 
            [0, 0, 1, 1, 0, 1, 0, 0], 
            [0, 1, 1, 0, 0, 0, 1, 0], 
            [1, 1, 0, 0, 0, 0, 0, 1] 
        ];

        let cellSize = bloop.size / 16;
        for (let x = 0; x < bitmap.length; x++) {
            let row = bitmap[x];
            for (let y = 0; y < row.length; y++) {
                let cell = bitmap[x][y];
                if (cell) {
                    sim.fill(0);
                    sim.rect((-bloop.size / 4) + (cellSize * x), cellSize * y, cellSize, cellSize);
                } else {
                    sim.fill(bloop.r, bloop.g, bloop.b);
                    sim.rect((-bloop.size / 4) + (cellSize * x), cellSize * y, cellSize, cellSize);
                }
            }
        }
    };

};
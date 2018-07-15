let simulation = function(sim) {

    sim.bloopCount = 50;
    sim.foodCount = 400;

    sim.matingRate = 0.04;
    sim.maxBloops = 50;
    sim.minBloops = 5;

    sim.bloops = [];
    sim.food = [];

    Bloop.sim = sim;
    Food.sim = sim;

    sim.selectedBloop = null;
    sim.selectionColor = '#F25278';

    sim.focussed = false;

    let themes = {
        dark: {
            background: 10,
            foodGlowAlpha: 20,
            foodGlowSize: 3,
            tailColor: 200,
            tailAlpha: 40
        },
        light: {
            background: 240,
            foodGlowAlpha: 70,
            foodGlowSize: 3,
            tailColor: 20,
            tailAlpha: 100
        }
    };

    sim.theme = themes['light'];

    sim.changeTheme = function() {
        sim.theme = sim.theme === themes['light'] ? themes['dark'] : themes['light'];
    };

    sim.extract = function() {
        let dna = JSON.stringify(sim.selectedBloop.brain.weights.map(i=>i=Math.round( i * 10) / 10));
        document.getElementById('extraction-zone').innerHTML = dna;
        document.getElementById('extraction-zone').style.display = 'block';
    };

    sim.clone = function() {
        !sim.selectedBloop || sim.bloops.push(new Bloop(new p5.Vector(357, 15), sim.selectedBloop.brain.weights));
    };

    sim.toggleFocus = function() {
        sim.focussed = !sim.focussed;
        !sim.focussed || sim.background(sim.theme.background);
    };

    sim.setup = function() {
        let cnv = sim.createCanvas(sim.windowWidth, sim.windowHeight);
        cnv.parent('simulation-container');

        sim.frameRate(30);

        let omnivour = [-0.8, -0, 0.7, 0.6, 0.6, -0, -0.5, -1, -0.5, -0.2, -0, 0.7, 0.7, 0.7, -0, -0, -0.5, -0.1, -1, 0.6, 0.1, -1, -0.3, -0, -0.5, -0, -1, -0.5, -0, -0.5, 0.7, -0, -1, -0.5, 0.2, -0.7, 0.1, -0.4, 0.1, -0, 0.1, -0.8, 0.1, -0.5, -0, 0.6, -0.5, -1];
        let herbivour = [-0.8, -0.1, -0.1, -0.9, 0.7, 0.1, -1, 0.9, -1, -0.3, -1, -0.5, -0.8, -0.7, -0.9, 0.6, -0.2, 0.4, -0, -0, 1, -0.3, -0.3, 0.6, -0.5, -0.9, -0.7, 0.1, 0.6, -1, -0, -0.1, 0.6, -0.5, -0.2, -0.9, -1, -0.7, 0.6, 0.4, -0.6, 0.7, 0.2, -0.4, -0.1, -0, -0.6, -0.5];
        let carnivour = [-0.8, -0.5, 0.7, 0.6, 0.6, -0, -0.5, -1, -0.5, -0.2, -0, 0.7, 0.7, 0.7, -0, -0.7, 0.1, -0.1, -1, 0.6, 0.1, -1, -0.3, -0, -0, -0, -1, -0.5, -0.5, -0.5, 0.7, -0, -1, -0.5, 0.2, -0, 0.1, -0.4, 0.1, -0, 0.1, -0.8, 0.1, -0, -0, 0.6, -0.5, -1];

        let sample = [
            herbivour
        ];
        
        for(let j = 0; j < sample.length; j++) {
            for(let i = 0; i < sim.bloopCount / sample.length; i++) {
                sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height)), sample[j]));
            }
        }

        for(let i = 0; i < sim.foodCount; i++) {
            sim.food.push(new Food(new p5.Vector(sim.random(sim.width), sim.random(sim.height))));
        }
    };

    sim.draw = function() {

        if(!sim.focussed) {
            sim.background(sim.theme.background);
        } else {
            sim.noStroke();
            sim.fill(182, 102, 255);
            sim.ellipse(20, (sim.windowHeight - (sim.bloops[0].health / 20) % sim.windowHeight), 10, 10);
        }

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

        if(!sim.focussed) {
            sim.food.forEach(foodParticle => {
                sim.drawFood(foodParticle);
            });
        }
        var i = sim.bloops.length;
        while (i--) {
            let bloop = sim.bloops[i];
            if(bloop.health > 0) {

                if(bloop.size > 12.1) {
                    bloop.update();
                } else {
                    bloop.updateStats();
                }
                if(!sim.focussed) {
                    sim.drawBloop(bloop);
                }
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
        if(sim.mouseY > 27) {
            document.getElementById('extraction-zone').style.display = 'none';
            sim.selectedBloop = null;
            sim.bloops.forEach(bloop => {
                if(bloop.clicked()) {
                    sim.selectedBloop = bloop;
                    return;
                }
            });
        }
    };

    sim.drawFood = function(foodParticle) {
        sim.noStroke();
        if(foodParticle.isPoison) {
            sim.fill(182, 102, 255, sim.theme.foodGlowAlpha);
            sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size * sim.theme.foodGlowSize, foodParticle.size * sim.theme.foodGlowSize);
        } else {
            sim.fill(69,236,253, sim.theme.foodGlowAlpha);
            sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size * sim.theme.foodGlowSize, foodParticle.size * sim.theme.foodGlowSize);
        }

        sim.stroke(5);
        sim.strokeWeight(1);
        if(foodParticle.isPoison) {
            sim.fill(182, 102, 255);
        } else {
            sim.fill(69,236,253);
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
            sim.fill(182, 102, 255);
        } else {
            sim.fill(bloop.bodyColor);
        }
        
        sim.ellipse(0, 0, bloop.size, bloop.size);

        if (bloop.size > 12.1) {

        if(bloop.isAgro) {
            sim.fill(20);
            sim.stroke(255, 80, 80);
            sim.strokeWeight(bloop.size / 3);
            sim.line(0, 0, 0, -bloop.size / 2);
            sim.strokeWeight(bloop.size / 4);
            sim.triangle(-bloop.size / 4, -bloop.size / 2, 0, -bloop.size / 2, -bloop.size / 4, -bloop.size / 5 * 3);
            sim.triangle(bloop.size / 4, -bloop.size / 2, 0, -bloop.size / 2, bloop.size / 4, -bloop.size / 5 * 3);
        }
        
        sim.stroke(bloop.outlineColor);
        sim.line(0, 0, 0, -bloop.size / 2);

        sim.strokeWeight(bloop.size / 8);

        sim.fill(bloop.health > 45 ? bloop.health : sim.color(45));
        
        sim.ellipse(0, -bloop.size / 2, bloop.size / 3, bloop.size / 3);


        sim.noStroke();
        sim.fill(sim.theme.tailColor, sim.theme.tailAlpha);
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
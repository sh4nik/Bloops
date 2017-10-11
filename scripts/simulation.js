let simulation = function(sim) {

    sim.bloopCount = 10;
    sim.foodCount = 200;

    sim.matingRate = 0.002;
    sim.maxBloops = 100;
    sim.minBloops = 30;

    sim.bloops = [];
    sim.food = [];

    Bloop.sim = sim;
    Food.sim = sim;



    sim.setup = function() {
        let cnv = sim.createCanvas(sim.windowWidth, sim.windowHeight);
        cnv.parent('simulation-container');

        let sample = [0.39969901357139115,0.11306470020159232,0.05381404691854019,-0.4916456258705546,-0.5247823997574828,0.25042630127583543,0.31871085358625617,-0.44274014059445577,0.709815110710426,-0.7858587421448111,0.8884433343620568,0.16197484833920406,0.5074870531790774,-0.8432930505615368,0.20609917223329877,-0.5157868650478123,-0.7687085811727661,0.025580318525610046,0.6628226214168742,0.10112744836365106,-0.6294000857107642,-0.5714121894051982,-0.3894277110234321,0.07070140074669595,-0.8966888854428987,-0.775229080237235,0.9422590514018978,0.5296602038122944,-0.3613165705640693,0.9347875952443623,-0.5217105547411145,0.5819381596486597,-0.5129106478582619,0.09034560530706903,-0.6455343055516827,-0.3211725425230809,0.7107229997364128,-0.4100713755509018,-0.35055852451297653,0.5551708359474588,-0.7567437381790758,-0.41415618916839136,0.3357113547029993,0.5758582163775507,0.36321462363404944,-0.6781846957783846,-0.11527347718729253,-0.7263017211508394,-0.05347413814159285,-0.5540561645767639,0.06364153739232625,0.203042064397573,-0.27982939496377757,0.5097153286760179,0.32237511177743405,-0.5040244270583254,0.9872217370079146,-0.17483203175034623,-0.1712558295295561,0.6543621286593839,-0.29127815309622385,-0.28502254404370575,0.550039714987629,-0.6501596555860072,0.36280850149441024,0.4299815165541472,-0.4088790373391431,-0.6430001503603631,-0.5614702454573481,-0.6912613221341806,-0.6509762441196001,0.5500224301594816,0.5212216127132807,-0.9216508739277014,-0.956882659885411,0.3200817785907071,0.7288243118988027,-0.09276551540269384,-0.8396333520187853,-0.34271318656323446,0.5280695922460965,0.8173667102312581,0.7996480357734335,0.8460485980091432,0.9727080791932474,-0.7118856744604276,-0.08387476723189513,0.4637449601868444,-0.011198347050441537,-0.12902394448443744,-0.48129920642669655,-0.4046698827525903,-0.2377517159032938,-0.9038593823819427,-0.45632800163457254,-0.2890579311000403,0.9673218920077793,-0.08951350678399494,-0.36262483178719584,-0.852019240187488];
        for(let i = 0; i < sim.bloopCount; i++) {
            sim.bloops.push(new Bloop(new p5.Vector(sim.random(sim.width), sim.random(sim.height)), sample));
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
        sim.stroke(5);
        if(foodParticle.isPoison) {
            sim.fill(150, 80, 100);
        } else {
            sim.fill(80, 150, 100);
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
        if (bloop === sim.bloops[0]) {
            sim.fill(200, 100, 250);
        } else {
            sim.fill(bloop.bodyColor);
        }
        
        sim.ellipse(0, 0, bloop.size, bloop.size);
        sim.line(0, 0, 0, -bloop.size / 2);

        if(bloop.isAgro) {
            sim.fill(20);
            sim.stroke(255, 80, 80);
            sim.triangle(-bloop.size / 4, -bloop.size / 2, 0, -bloop.size / 2, -bloop.size / 4, -bloop.size / 5 * 3);
            sim.triangle(bloop.size / 4, -bloop.size / 2, 0, -bloop.size / 2, bloop.size / 4, -bloop.size / 5 * 3);
        }

        sim.stroke(20);

        sim.fill(bloop.health > 45 ? bloop.health : sim.color(45));
        
        sim.ellipse(0, -bloop.size / 2, bloop.size / 3, bloop.size / 3);


        sim.noStroke();
        sim.fill(200, 20);
        sim.triangle(0, 0, -bloop.size / 2 * bloop.velocity.mag(), bloop.velocity.mag() * bloop.size, bloop.size / 2 * bloop.velocity.mag(), bloop.velocity.mag() * bloop.size);

        sim.stroke(20);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.r, bloop.g, bloop.b);
        sim.rect(-bloop.size / 4, 0, bloop.size / 2, bloop.size / 2);


        sim.pop();
    };

};
let simulation = function(sim) {

    sim.bloopCount = 30;
    sim.foodCount = 400;

    sim.matingRate = 0.0008;
    sim.maxBloops = 50;
    sim.minBloops = 30;

    sim.bloops = [];
    sim.food = [];

    Bloop.sim = sim;
    Food.sim = sim;



    sim.setup = function() {
        let cnv = sim.createCanvas(sim.windowWidth, sim.windowHeight);
        cnv.parent('simulation-container');

        //let sample = [0.5017004960682581,0.4999151725818134,-0.21982131176508535,0.8780605218096813,-0.718896656756141,0.23681382334094758,0.571297988040079,0.7822120239895809,-0.31783578377620936,-0.9268051158477153,-0.03139014230904902,-0.7932834321930131,-0.5130215435545438,0.04298574456212112,-0.14825313420381026,-0.6526571826519234,-0.1425064366777833,0.24480572375367515,0.4874118744706144,-0.5996833989979367,-0.3424190870313324,0.4516849397049625,0.6185517184180576,-0.038386214824165155,-0.25261307725789806,0.09604114886817472,0.016431557072968506,-0.13648544851782285,0.871076945313479,-0.8326957780023965,-0.6378786307934274,0.5721567135631815,-0.6058321978607561,-0.1791019413447863,-0.03173954939786361,0.11142203884347168,-0.224505064110458,0.11716451999687916,-0.9669753498083344,0.03776429662007619,0.42723076731714293,0.8183111581997462,-0.4344684718616625,0.9891268063996517,0.11797680207426753,0.937633240799876,0.8319832123161532,-0.48186818960806166,0.07871552014948557,0.8154671939832405,-0.5037546020808432,-0.33179402304731687,-0.5062870675044508,-0.024474755260791792,0.3862169946678402,-0.7868782619549917,-0.9254026421127928,0.1598389040492636,0.40701574895198567,0.31824810524138014,0.029804761314772055,-0.9302687623523691,0.5729412428810146,0.7010054212011245,-0.34584633756355254,0.19040109230960933,0.9430654333793003,-0.3570411299066576,-0.7915552215020689,-0.7107510001786044,-0.5379862611459867,-0.3460418690455205,0.33926269849657587,0.5568726255771526,0.6157839214364378,-0.505928479660783,-0.5162474679877778,0.16674816806112558,0.11157924442505429,0.9458426463590999,0.5321205509773104,-0.7903652453247174,-0.38596077657207983,0.8784737069392068,0.4933977459026613,0.5426456626067626,0.013967594716254528,0.10295102296532743,0.412198982197435,0.1665052074847786,-0.1737268922611963,0.6478376381641602,0.7371576565330304,0.9053496933339344,-0.4006667396301582,-0.4366949887491609,-0.8210640408970233,0.09611579426783701,0.9083963625977778,-0.03743128039140187];
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
            sim.fill(250, 80, 200, 1.7);
            sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size * 10, foodParticle.size * 10);
        } else {
            sim.fill(80, 150, 140, 1);
            sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size * 30, foodParticle.size * 30);
        }

        sim.stroke(5);
        if(foodParticle.isPoison) {
            sim.fill(200, 80, 200);
        } else {
            sim.fill(80, 250, 240);
        }

        sim.ellipse(foodParticle.position.x, foodParticle.position.y, foodParticle.size, foodParticle.size);
    };

    sim.drawBloop = function(bloop) {
        sim.push();
        sim.translate(bloop.position.x, bloop.position.y);

        var angle = bloop.velocity.heading() + sim.PI / 2;
        sim.rotate(angle);

        sim.stroke(bloop.outlineColor);
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


        sim.pop();
    };

};
let simulation = function(sim) {

    sim.bloopCount = 30;
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

        // let sample = [-0.6022115048630949,-0.3776643402573385,0.8136857026264255,0.574964477090016,0.9859879930942315,0.3769296483978284,-0.8966328441368976,-0.8037723873758669,-0.1635045064171421,0.7903729224407083,-0.0982656575373797,-0.2689158734409758,0.0670565709958586,-0.6540701390123815,0.3591253696159473,0.8537609443964254,0.5261429749244462,0.5939273147686999,0.3105112003515864,-0.6091293375501965,-0.4742371038672557,0.21277725094561495,-0.7373549210975519,-0.805407675124838,0.8524505641936573,-0.19477602553590412,0.8242145642149961,-0.600533677564155,0.751473763245063,0.7742267399725082,0.7123291275062305,-0.8857900879545961,-0.6655509748050266,-0.49785569735328217,0.14681017404054586,0.9540182037460947,-0.512092751199833,-0.5818452965185372,-0.46832842017296183,-0.5757545613575212,0.9462220739343143,-0.4817537046677498,0.764131756327008,-0.10820476013033709,-0.8187951093990198,0.5705033579830783,-0.09008276080050681,-0.4927052671923078,0.9613752744754804,0.966401509734995,0.49077993776273177,-0.007399140936914073,-0.4553476619029735,-0.23619737018070763,-0.1083178696999294,-0.375289266547878,0.495935882564984,-0.15671754254640158,-0.372185557701731,-0.22039234681523512,0.7982089226882452,0.04767941981312118,0.17640256294297085,0.9446275311514016,-0.43484329499754715,-0.3136734857241419,-0.7500731447215512,0.45656229358243605,0.5245956991828074,-0.8112512133063499,-0.9462553798492039,0.27070267570874185,0.5784760222658654,0.8728693214071916,0.35190031923617004,0.3513295919534345,0.42315311388945354,0.7901649760837315,0.08624430616076229,-0.49832620718885146,-0.9434344306469336,0.016969968985690365,-0.3384353826508648,-0.1631647439544568,-0.36478858336716247,0.6700196707825583,0.9632128809713296,0.8906982634249783,-0.08879651264455424,-0.7188028979399581,-0.5699111353173598,0.19928705512838807,-0.25930906245545104,-0.21353015877111314,-0.4061495712366452,-0.22157015686934,0.727526037048388,0.5951361469629237,-0.07585513805118715,-0.7284775909868011];
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
            sim.fill(150, 80, 80);
        } else {
            sim.fill(80, 150, 80);
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

        let headColor = bloop.health > 45 ? bloop.isAgro ? sim.color(200, 80, 80) : bloop.health : sim.color(45);
        sim.fill(headColor);
        sim.ellipse(0, -bloop.size / 2, bloop.size / 3, bloop.size / 3);


        sim.noStroke();
        sim.fill(200, 20);
        sim.rect(-(bloop.size / 4 * 3) / 2, bloop.size / 2, bloop.size / 4 * 3, bloop.velocity.mag() * bloop.size * 0.6);

        sim.stroke(20);
        sim.strokeWeight(bloop.size / 8);
        sim.fill(bloop.r, bloop.g, bloop.b);
        sim.rect(-bloop.size / 4, 0, bloop.size / 2, bloop.size / 2);


        sim.pop();
    };

};
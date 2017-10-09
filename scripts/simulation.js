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

        let sample = [0.26827796681127225,0.8135559711592655,0.12106985897309652,-0.6662229713628061,-0.7782020650562944,0.2533118209475944,-0.4230997074480487,-0.714619280702574,-0.5074829149771274,-0.7921133007132499,-0.2384029523681015,0.6129404248576051,0.05302522805994858,0.3610497075329704,0.030630918358014014,-0.9519098214505393,0.40030594215118276,-0.3813693337949755,0.5789699404496194,0.6332357686547629,0.6685781025896609,0.2081588337822784,0.7392961401308753,-0.7526281208381049,-0.009719074684752194,-0.2810132421540046,-0.9033796327464314,0.5059423276997812,0.3617458361880401,0.913201086758455,0.936016368817778,-0.6743567234220689,-0.9485046923009288,0.6853499697639722,0.6064183765629472,0.7236737859532254,-0.12277403383883412,-0.7780960678724553,0.10903319393342059,-0.44004383185078133,-0.45553122977672267,0.349442402821595,0.6284474072457082,-0.23259478330618055,-0.23586894711922168,0.34416397120031705,0.7440923635880163,-0.5581769938396652,0.5450383220563264,0.22338341146608665,0.7279238728165556,-0.9126432100441098,-0.9042511257568995,0.9141945657804489,-0.4658015680943324,0.694639669656373,0.20072697955787744,0.4409923702735603,-0.17380073024185583,-0.6248510024583838,0.8408005717850537,-0.0045930720722218155,-0.8935092672193372,0.7082199612709692,0.45089127744043855,-0.17343104837113898,-0.1430510834741372,-0.7422268637484186,-0.29526171344941377,0.331450804805157,-0.9447889110034464,-0.5515398454238811,0.014447047371876298,-0.317962181430675,0.6361281533086531,-0.13498496326551068,-0.45020778091845104,-0.658094332265243,0.015383748748676318,-0.8664929215409884,-0.31570104550266676,-0.017069379546119645,0.35130368516937294,0.06836818321934324,-0.40799657306994375,-0.6233657029089077,-0.06675324104754576,-0.8303981740384261,-0.5395522744521561,-0.6762788309247227,0.6953444927523478,-0.1578766678788801,-0.5124451540015298,0.8683234156632382,-0.3662580591683069,0.4724333008086803,-0.8232040859662191,0.6648629856147688,-0.6695761006503198,-0.18129895159736975,0.8922614251625305,0.6171091196627931,0.30418436113374403,0.10941280421862443,-0.4927526530303714,-0.7638143097233825,0.8167781765732274,0.7367817396442695,-0.8371289702350375,0.20028289702719038,0.6334267360204842,0.832228702324084,0.3286662816557384,-0.5402405324863078,0.16435124859806027,0.16200237285566965,0.5707659481882863,0.2046535976998043,-0.9593915478691022,0.8332926006296368,-0.9829151318520735,-0.41863734189869106,0.43628476743549527,0.09192761750236222,0.6591157922743718,0.7076991955064496,-0.7199520265526238];
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
        sim.fill(bloop.bodyColor);
        sim.ellipse(0, 0, bloop.size, bloop.size);
        sim.line(0, 0, 0, -bloop.size / 2);

        let headColor = bloop.health > 45 ? bloop.isAgro ? sim.color(200, 80, 80) : bloop.health : sim.color(45);
        sim.fill(headColor);
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
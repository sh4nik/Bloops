let Food = function(position) {

    this.position = position;
    this.isPoison = sim.random(1) > 0.7;

    this.draw = function() {

    };

};

Food.prototype.sim;
Food.prototype.size = 5;
Food.prototype.health = 250;
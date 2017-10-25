let Food = function(position, isPoison) {

    this.position = position;
    this.isPoison = isPoison !== undefined ? isPoison : sim.food.filter(f => !f.isPoison).length / sim.food.length > 0.7;

    this.draw = function() {

    };

};

Food.prototype.sim;
Food.prototype.size = 5;
Food.prototype.health = 500;
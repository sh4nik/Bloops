let sim = new p5(simulation);

let config = {
    simulation: {
        seed: null,
        render: true,
        bloopConfig: {
            reproductionProbability: 0.004,
            maturityAge: 14,
            mutationRate: 0.3,
        },
        bloops: [],
        initBloopCount: 50,
        maxBloopCount: 150,
        minBloopCount: 20,
        foodConfig: {
            size: 5,
            foodHealthGain: 500,
            poisonHealthLoss: 1500,
            foodColor: 'green',
            poisonColor: 'red',
            poisonProbability: 0.2,
        },
        food: [],
        initFoodCount: 100,
    }
};
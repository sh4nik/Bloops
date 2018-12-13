Bloops are colorful autonomous agents with the ability to live and interact with their environment.  
Their brains consist of a simple Neural Network which is evolved over time using a continuous Genetic Algorithm.  

### [Demo](http://sh4nik.com/bloops)

### Food:

- Blue food particles add health while purple poison particles reduce health  

### Physical Appearance:

- **Head** : Gets darker as health reduces and lighter as health is gained  
- **Fangs** : Visible when in agro mode  
- **Body** : Normally blue. Grey if born with a mutated gene. Red when being eaten by another Bloop. The healthiest Bloop at any time is highlighted in purple.  
- **Expression Color** : Red: Relative to health, Blue: High if nearest food is poison  
- **Tail** : Expands relative to speed  

### Agro mode:

- Does not consume colliding food or poison  
- Absorbs health from colliding Bloops  
- Health drains faster than normal  

### Brain Function:

Inputs  
- X of desired vector to closest food  
- Y of desired vector to closest food  
- Is closest food poisonous?  
- X of desired vector to closest Bloop  
- Y of desired vector to closest Bloop  
- Is closest Bloop agro?  

Outputs  
- X of steering vector  
- Y of steering vector  
- Magnitude of steering vector  
- Should I be agro?  

### Mating:

- At any moment each Bloop has a predefined chance to mate and create offspring  
- Offspring will be created as a clone of itself or by crossing genes with a selected Bloop  
- A Bloop will be selected for mating based on a probability proportionate to its health  
- The genes of any offspring could be mutated based on a predefined probability  

### Population:

- If the population drops below a certain number, random Bloops will be generated to introduce variety  
- If the population rises above a certain number, mating will not be possible
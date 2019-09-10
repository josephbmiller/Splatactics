function main() {

  //Size, in tiles, of the grid
  var gridSize = 10;
  //Size, in pixels, of each tile
  var tileSize = 32;
  //Opacity of the color of the ink that covers the board
  var inkOpacity = 0.5;
  //Amount a squid heals each turn when on it's own ink.
  var unSubmergedHeal = 15;
  //Amount a squid heals each turn when submerged on its own ink.
  var submergedHeal = 45;
  //Amount of ink a squid regains when on its own ink
  var unSubmergedInkRefill = 15;
  //Amount of ink a squid regains when submerged on its own ink.
  var submergedInkRefill = 45;
  //Amount squids get damaged when on ink of a different color.
  var enemyInkDamage = 20;
  //Squad whose turn it is currently
  var activeSquad;
  //Squid who is selected/active
  var activeSquid;
  
  //Array of x and y coordinates for adjacent spaces
  const xs = [-1,0,1,0];
  const ys = [0,-1,0,1];
  
  //states for action flow.
  const selecting = 0;
  const selected = 1;
  const move = 2;
  const attack = 3;
  var mode = selecting;
  
  //Properties of each type's weapon. Not all properties are used.
  const squidProps = {
    shooter: {
      range: 4,
      shotsPerRound: 3,
      accuracy: 0.8,
      damage: 30,
      inkCost: 30,
      info: 'Shooters are inaccurage at long range, but are very lightweight, allowing any squid wielding one to slip in and out of the front lines'
    },
    blaster: {
      spread: 2,
      range: 3,
      directDamage: 100,
      splashDamage: 50,
      inkCost: 30,
      info: 'Blasters are slow, but very powerful. They shoot a glob of ink that explodes, dealing massive damage to any squid caught by a direct hit and additional damage in an area around the impact'
    },
    roller: {
      width: 3,
      rollSpeed: 3,
      damage: 200,
      inkCost: 50,
      flickRange: 3,
      flickSpread: 5,
      flickGlobs: 3,
      flickGlobDamage: 75,
      flickInkCost: 50,
      info: 'Rollers are massive weapons that can cover large areas of the battlefield with ink. However, they are cumbersome to wield, and leave any squid using one exposed to attacks'
    },
    charger: {
      minRange: 3,
      maxRange: 7,
      chargeSpeed: 2,
      damageMin: 40,
      damageMax: 120,
      inkCost: 10,
      minInkCost: 10,
      maxInkCost: 50,
      info: 'Chargers are long-range weapons that fire compressed ink blasts, taking time to charge up. Any squid with a fully charged blast must step carefully, but can unleash massive damage'
    }
  };
  
  //Default spawn positions for each squad. These are used when squids are initially spawning
  //Also used to find a unoccupied spot for a squid to respawn in
  const defaultSpawnPositions = [
    //[[0,1],[1,0],[1,1],[0,0]],
    //[[gridSize-1,gridSize-2],[gridSize-2,gridSize-1],[gridSize-2,gridSize-2],[gridSize-1,gridSize-1]]
    [[1,0],[5,5],[1,1],[0,0]],
    [[gridSize-2,gridSize-1],[6,6],[gridSize-2,gridSize-2],[gridSize-1,gridSize-1]]
  ]

  //Constructor function for squad objects.
  //name - string - name of the squad. Mostly arbitrary, just used for html class names
  //color - array[3] - RGB value of the squad's color. Should probably be unique among squads
  function createSquad(name, color) {
    var squad = {};
    squad.name = name;
    squad.colorRGB = color.slice();
    //this will be filled with squids as they are created
    squad.squids = [];
    //push the squad onto the global squad array
    squads.push(squad);
    //remove the provided squid from the squad
    squad.removeSquid = function(squid){
      squid.squad.squids.splice(squid.squad.squids.indexOf(squid), 1);
    };
    //returns a string representing the rgba representation of a squad's rgb color array
    //opacity - float - optional alpha value
    squad.rgbaString = function(alpha){
      if(alpha===undefined) alpha = 1;
      return 'rgba('+this.colorRGB[0]+','+this.colorRGB[1]+','+this.colorRGB[2]+','+alpha+')';
    }
    return squad;
  }
  
  //Constructor function to create squid objects.
  //type - string corresponding to a type of squid.
  //squad - squad object to add the squid to
  function createSquid(type, squad) {
    var squid = {};
    //the type of squid (shooter, roller, etc.)
    squid.type = type;
    //Add the squid to the provided squad
    squid.squad = squad;
    squad.squids.push(squid);
    //give the squid a unique id based on its squad name and its position in the squad
    squid.id = "squid"+squad.name+squad.squids.indexOf(squid);
    //Initialize position to the 'unspawned' location
    squid.x = -1;
    squid.y = -1;
    //jquery object of div that displays the squid onscreen
    squid.div = null;
    //rounds before respawn
    squid.respawnTimer = 0;
    //sets all of the values to be that of a freshly spawned squid
    squid.fresh = function() {
      //its current health, max 100.
      squid.health = 100;
      //its current ink, max 100.
      squid.ink = 100;
      //its default move budget, determines how far it can move under various conditions
      squid.moveBudget = 6;
      //Whether the squid can move this turn
      squid.canMove = true;
      //Whether the squid can attack this turn
      squid.canAttack = true;
      //Whether the squid is submerged
      squid.submerged = false;
    };
    squid.fresh();
    //Properties of the squid's weapon
    squid.props = Object.assign({}, squidProps[type]);
    //attackType is a special property that only applies to rollers and chargers. sort of a hack.
    if(squid.type === 'charger') {
      squid.attackType = 'uncharged';
    }
    else {
      squid.attackType = '';
    }
    //Populates the squid info panel for the squid.
    //This function checks the squid state and displays information and controls based on that state
    squid.displayInfo = function() {
      $('#info').show();
      var squidInfoDiv = $('#squidInfo');
      squidInfoDiv.html('');
      var weaponInfoDiv = $('#weaponInfo');
      weaponInfoDiv.html('');
      if(!squid) return;
      squidInfoDiv.append($('<h4>').html('Squid Stats'));
      squidInfoDiv.append($('<p>').html('Type: '+this.type));
      squidInfoDiv.append($('<p>').html('Health: '+this.health));
      squidInfoDiv.append($('<p>').html('Ink: '+this.ink));
      if(this.submerged)
        squidInfoDiv.append($('<p>').html('Submerged'));
      if(this.squad === activeSquad) {
        if(this.canMove)
          squidInfoDiv.append($('<p>').append($('<button>').html('Move').click(setMoveMode)));
        if(this.canAttack && this.ink >= this.props.inkCost)
          squidInfoDiv.append($('<p>').append($('<button>').html('Attack').click(setAttackMode)));
        if(this.type === 'roller' && this.canAttack && this.canMove && this.ink >= this.props.inkCost)
          squidInfoDiv.append($('<p>').append($('<button>').html('Roll').click(setRollMode)));
        if(!this.submerged && getTileControl(this.x, this.y) === this.squad && (this.canAttack || this.type === 'shooter' || this.type === 'charger'))
          squidInfoDiv.append($('<p>').append($('<button>').html('Submerge').click(submerge)));
        if(this.submerged)
          squidInfoDiv.append($('<p>').append($('<button>').html('Emerge').click(emerge)));
      }
      squidInfoDiv.css('background', this.squad.rgbaString(inkOpacity));
      weaponInfoDiv.append($('<img>').attr('src', 'img/'+this.type+'.png'));
      weaponInfoDiv.append(($('<p>').html(this.props.info)));
    }
    //sets the position of the squid. Sets the squid to be a child of the proper tile div
    squid.setPosition = function(x, y) {
      this.x = x;
      this.y = y;
      //if the squid is here, it is dead or not spawned, that's ok.
      if(x === -1 && y === -1) return;
      if(this.x >= gridSize) this.x = gridSize - 1;
      if(this.x < 0) this.x = 0;
      if(this.y >= gridSize) this.y = gridSize - 1;
      if(this.y < 0) this.y = 0;
      if (this.div) {
        getTile(this.x, this.y).append(this.div);
      }
    };
    //submerges the squid. cancels charge if the squid is a charger, otherwise just adds the class and updates the info pane
    squid.submerge = function() {
      this.submerged = true;
      if(this.type === 'charger') {
        this.attackType = 'uncharged';
        this.moveBudget = 6;
        this.props.inkCost = this.props.minInkCost;
      }
      this.div.addClass('submerged');
      this.displayInfo();
    };
    //causes the squid to emerge from the ink. Can occur voluntarily or involuntarily when the tile under a squid's feet is inked by the enemy squad.
    squid.emerge = function() {
      this.submerged = false;
      this.div.removeClass('submerged');
      this.div.show();
      //only update info pane if it is the active squid (aka don't update if this is called by revealing an enemy squid)
      if(this === activeSquid) this.displayInfo();
    };
    //Main attack function. Large switch block on the type of squid it is. Takes a square adjacent to the squid as input, squids can only fire in 4 directions
    //TODO: split into subclasses
    squid.attack = function(xtar, ytar) {
      var xdir, ydir, i, xshots, yshots;
      //get directions for spray calculations. one will be +/- 1 and the other will be 0
      xdir = xtar - this.x;
      ydir = ytar - this.y;
      //deduct the cost of this move from the ink tank
      this.spendInk(this.props.inkCost);
      //if the squid is submerged, pop it out. squids cant fire if they are submerged.
      if(this.submerged) {
        this.emerge();
      }
      if(this.type === 'shooter') {
        //reset squid's move ability, allowing it to move/submerge after shooting
        this.canMove = true;
        //If there is a squid in the first 2 squares in front of us, all globs will hit it.
        if(this.inkTile(this.x+(xdir), this.y+(ydir), this.props.damage*this.props.shotsPerRound)) { return; }
        if(this.inkTile(this.x+(xdir*2), this.y+(ydir*2), this.props.damage*this.props.shotsPerRound)) { return; }
        //otherwise, we need to calculate the spray. We have 4 possible glob locations with a 3 round burst, so randomly choose the empty spot
        var emptySpace = Math.floor(Math.random() * 4);
        //separate processing for shots in the x direction vs shots in the y direction
        if(xdir) {
          //all possible glob locations
          xshots = [
            [[1,0],[2,0]],
            [[3,1],[4,1]],
            [[3,0],[4,0]],
            [[3,-1],[4,-1]]
          ];
          for(i = 0; i < 4; i++) {
            //skip it if this came up as the empty space
            if(emptySpace === i) continue;
            //paint the spaces, reversing based on xdir if necessary. if the front shot hits, the back one won't.
            if(this.inkTile(this.x+xshots[i][0][0]*xdir, this.y+xshots[i][0][1], this.props.damage)) { continue; }
            this.inkTile(this.x+xshots[i][1][0]*xdir, this.y+xshots[i][1][1], this.props.damage);
          }
        }
        else {
          yshots = [
            [[0,1],[0,2]],
            [[1,3],[1,4]],
            [[0,3],[0,4]],
            [[-1,3],[-1,4]]
          ];
          for(i = 0; i < 4; i++) {
            if(emptySpace === i) continue;
            if(this.inkTile(this.x+yshots[i][0][0], this.y+yshots[i][0][1]*ydir, this.props.damage)) { continue; }
            this.inkTile(this.x+yshots[i][1][0], this.y+yshots[i][1][1]*ydir, this.props.damage);
          }
        }
      }
      else if(this.type === 'blaster') {
        //Blaster explodes on the first target contacted, so we paint each square on the path using the direct damage property.
        //Then if something is hit, we apply the splash damage using xs and ys arrays for adjacency
        //First paint our square
        this.inkTile(this.x, this.y, this.props.directDamage);
        //This could be a loop based on the props blaster range
        if(this.inkTile(this.x+(xdir), this.y+(ydir), this.props.directDamage)) {
          for(i = 0; i < 4; i ++) {
            this.inkTile(this.x+(xdir)+xs[i], this.y+(ydir)+ys[i], this.props.splashDamage);
          }
          return;
        }
        if(this.inkTile(this.x+(xdir*2), this.y+(ydir*2), this.props.directDamage)) {
          for(i = 0; i < 4; i ++) {
            this.inkTile(this.x+(xdir*2)+xs[i], this.y+(ydir*2)+ys[i], this.props.splashDamage);
          }
          return;
        }
        this.inkTile(this.x+(xdir*3), this.y+(ydir*3), this.props.directDamage);
        for(i = 0; i < 4; i ++) {
          this.inkTile(this.x+(xdir*3)+xs[i], this.y+(ydir*3)+ys[i], this.props.splashDamage);
        }
      }
      else if(this.type === 'roller') {
        if(this.attackType === 'roll') {
          //Roll is a special attack
          //We just paint a 4x3 area in front of the squid and then move the squid
          for(i = 1; i <= 4; i++) {
            for(j = -1; j < 2; j++) {
              if(xdir) {
                this.inkTile(this.x+(xdir*i), this.y+j, this.props.damage);
              }
              else {
                this.inkTile(this.x+j, this.y+(ydir*i), this.props.damage);
              }
            }
          }
          this.setPosition(this.x + (3*xdir), this.y + (3*ydir));
          //rolling consumes the move resource
          this.canMove = false;
          //reset attack type after we finish rolling
          this.attackType = '';
        }
        else {
          //default roller attack is the flick. highly random attack, so we shoot 6 globs, each of whose position is randomly chosen from the array.
          //Overlaps are possible, causing any squid hit to take multiple instances of damage.
          var shot;
          if(xdir) {
            //possible shot offsets
            xshots = [
                  [1,-1],[1,0],[1,1],
                  [2,-2],[2,-1],[2,0],[2,1],[2,2]
                 ];
            //choose 6 random shots and paint them
            for(i = 0; i < 6; i++) {
              shot = Math.floor(Math.random() * 8);
              this.inkTile(this.x+(xshots[shot][0]*xdir), this.y+xshots[shot][1], this.props.flickGlobDamage);
            }
          }
          else {
            yshots = [
                  [-1,1],[0,1],[1,1],
                  [-2,2],[-1,2],[0,2],[1,2],[2,2]
                 ];
            for(i = 0; i < 6; i++) {
              shot = Math.floor(Math.random() * 8);
              this.inkTile(this.x+yshots[shot][0], this.y+(yshots[shot][1]*ydir), this.props.flickGlobDamage);
            }
          }
          
        }
      }
      else if(this.type === 'charger') {
        //If the charger is uncharged, no globs are fired. instead it is considered charged and its move is reduced. we also change ink cost to that of the charged shot
        if(this.attackType === 'uncharged') {
          this.attackType = 'charged';
          this.moveBudget = 2;
          this.props.inkCost = this.props.maxInkCost;
        }
        //If the charger is charged, we release the blast. consider it uncharged, set its move budget and ink cost back to normal, and paint the squares
        else if(this.attackType === 'charged') {
          this.attackType = 'uncharged';
          this.moveBudget = 6;
          this.props.inkCost = this.props.minInkCost;
          for(i = 0; i <= this.props.maxRange; i++) {
            if(this.inkTile(this.x+(xdir*i), this.y+(ydir*i), this.props.damageMax)) {
              return;
            }
          }
        }
      }
    };
    //Inks a tile, applying damage to enemy squids
    //damage - int - damage to be applied if the squid found is an enemy
    //returns - boolean - whether an enemy squid was hit
    squid.inkTile = function(x, y, damage) {
      //set the controlling squad for the tile
      setTileControl(x, y, this.squad);
      //find any squid on the tile
      var victim = getSquidAtPosition(x, y);
      //if the squid isn't friendly, apply damage
      if(victim && victim.squad !== this.squad) {
        victim.damage(damage, this.squad);
        return true;
      }
      return false;
    }
    //Causes this squid to take damage
    //amount - int - amount of damage to take
    //attackingSquad - squad - squad that is dealing the damage
    squid.damage = function(amount, attackingSquad){
      this.modifyResources(-1*amount, 0);
      if(this.health === 0) {
        //squid killed!
        this.die(attackingSquad);
        return true;
      }
      return false;
    };
    //heals the squid.
    squid.heal = function(amount){
      this.modifyResources(amount, 0);
    };
    //checks if the squid has the required amount of ink. If so, deducts the ink and returns true.
    squid.spendInk = function(amount){
      if(this.ink < amount) return false;
      this.modifyResources(0, -1*amount);
      return true;
    };
    //refills the squid's ink tank
    squid.refillInk = function(amount){
      this.modifyResources(0, amount)
    };
    squid.healAndRefillInk = function(health, ink){
      this.modifyResources(health, ink);
    }
    //Kills a squid.
    //Sets its position at -1,-1 and inks the 8 adjacent squares but dealing no damage
    squid.die = function(killingSquad){
      //killed squids splat an area around them, dealing no damage
      for(var i = -1; i <= 1; i++) {
        for(var j = -1; j <= 1; j++) {
          setTileControl(this.x+i, this.y+j, killingSquad);
        }
      }
      var splatDiv = $('<div>');
      splatDiv.html('SPLAT');
      splatDiv.addClass('damage');
      createFloatingText(this.x, this.y, splatDiv)
      $('#graveyard').append(this.div);
      this.setPosition(-1, -1);
      this.respawnTimer = 1;
      //if that was the last squid, trigger end game.
      //TODO: different wincons
      if(this.squad.squids.length <= 0) {
        gameOver(killingSquad);
      }
    };
    //Called for all squids on a squad when their turn begins
    //heals squids on friendly ink and refills their ink tanks
    //damages squids on enemy ink
    //reveals all friendly submerged squids so the player can see them
    //also resets the canMove and canAttack values
    squid.beginTurn = function(){
      if(this.health <= 0) {
        if(this.respawnTimer > 0) this.respawnTimer--;
        else this.spawn();
      }
      var controllingSquad = getTileControl(this.x, this.y);
      if(controllingSquad === this.squad) {
        if(this.submerged) {
          this.healAndRefillInk(submergedHeal, submergedInkRefill);
        }
        else {
          this.healAndRefillInk(unSubmergedHeal, unSubmergedInkRefill);
        }
      }
      else if(controllingSquad) {
        this.damage(enemyInkDamage, controllingSquad);
      }
      this.canMove = true;
      this.canAttack = true;
      this.div.show();
    };
    //Called for all squids of a squad when their turn ends
    //Hides any submerged squids so the enemy player cannot see them
    squid.endTurn = function(){
      if(this.submerged) this.div.hide();
    };
    //Spawns a squid.
    //Finds an unoccupied location to spawn the squid, sets its position there and reveals the div
    //Returns the location the squid spawned at, or null if a position was not found
    squid.spawn = function(){
      var spawnPosition = null;
      defaultSpawnPositions[squads.indexOf(this.squad)].forEach(function(position){
        if(!getSquidAtPosition(position[0], position[1])) spawnPosition = position.slice();
      });
      if(spawnPosition) {
        this.setPosition(spawnPosition[0], spawnPosition[1]);
        this.div.show();
        setTileControl(this.x, this.y, this.squad);
        this.fresh();
      }
      return spawnPosition;
    };
    //Creates the div object to display a squid.
    //Consists of a parent div.squid that gets added to a tile div
    //parent div.squid contains all of the other parts of the squid display.
    squid.createDiv = function(){
      var div = $('<div>');
      div.hide();
      div.attr('id', this.id);
      div.addClass('squid');
      var iconDiv = $('<div>');
      iconDiv.addClass('squidIcon');
      iconDiv.css('font-size', tileSize);
      iconDiv.css('color', this.squad.rgbaString());
      iconDiv.html(this.type.substring(0,1).toUpperCase());
      div.append(iconDiv);
      var healthDiv = $('<div>');
      healthDiv.addClass('health resource');
      div.append(healthDiv);
      var inkDiv = $('<div>');
      inkDiv.addClass('ink resource');
      div.append(inkDiv);
      this.div = div;
      this.resizeResourceBars();
    };
    squid.modifyResources = function(health, ink) {
      this.health += health;
      if(this.health < 0) this.health = 0;
      if(this.health > 100) this.health = 100;
      this.ink += ink;
      if(this.ink < 0) this.ink = 0;
      if(this.ink > 100) this.ink = 100;
      var floatingTextDiv = $('<div>');
      if(health > 0) {
        var healthDiv = $('<div>');
        healthDiv.addClass('heal');
        healthDiv.html(health);
        floatingTextDiv.append(healthDiv);
      }
      else if(health < 0) {
        var healthDiv = $('<div>');
        healthDiv.addClass('damage');
        healthDiv.html(health);
        floatingTextDiv.append(healthDiv);
      }
      if(ink > 0) {
        var inkDiv = $('<div>');
        inkDiv.addClass('inkRefill');
        inkDiv.html(ink);
        floatingTextDiv.append(inkDiv);
      }
      createFloatingText(this.x, this.y, floatingTextDiv);
      this.resizeResourceBars();
    };
    squid.resizeResourceBars = function() {
      squid.div.find('.health').height(squid.health+'%');
      squid.div.find('.ink').height(squid.ink+'%');
    };
    //Removes the squid from its squad and removes its div from the dom
    squid.cleanup = function(){
      this.squad.removeSquid(squid);
      this.div.remove();
    };
    //Create the squid's div
    squid.createDiv();
    //Try and spawn the squid, if we could not find a spot, bail and clean up the squid
    if(!squid.spawn()) {
      squid.cleanup();
      return null;
    }
    return squid;
  }
  
  //called when the game is over. Displays a message and a reset button.
  function gameOver(winningSquad) {
    $('#main').html('<h1>'+winningSquad.name+' squad wins</h1>').css('color', winningSquad.rgbaString());
    $('#controls').html($('<button>').html('Reset').click(function(){
      window.location.href='index.html';
    }));
  }
  

  //Sets a tile to be under the control of a given squad.
  //if squad is not supplied, set the tile to be uncontrolled
  //reveals a squid on the tile if they are not a member of the supplied squad
  function setTileControl(x, y, squad) {
    var tile = getTile(x, y);
    if(!tile.length) { return; }
    //remove any existing "___Control" classes
    Array.from(tile.attr('class').matchAll(/\b\w+Control\b/g)).forEach(function(match){
      tile.removeClass(match[0]);
    });
    //if we weren't supplied a squad, be content to remove the background color
    if(!squad) {
      tile.css('background-color', '');
    }
    //otherwise we need to add the class, set the background color, and reveal any enemy squids
    else {
      tile.addClass(squad.name+'Control');
      tile.css('background-color', squad.rgbaString(inkOpacity));
      var squid = getSquidAtPosition(x, y);
      if(squid && squid.squad !== squad) squid.emerge();
    }
  }
  
  //return what squad, if any, controls the tile in question
  //returns undefined otherwise
  //returns null if we couldnt find the tile
  function getTileControl(x, y) {
    var tile = getTile(x, y);
    if(!tile.length) { return null; }
    var match = tile.attr('class').match(/\b(\w+)Control\b/);
    if(!match) return undefined;
    var controllingSquadName = match[1];
    return squads.find(function(squad){return squad.name == controllingSquadName});
  }
  
  //returns the id property for a tile at a location
  function tileId(x, y) {
    return 'tile'+x+'-'+y;
  }
  
  //returns the jquery object for a tile at location
  function getTile(x, y) {
    return $('#'+tileId(x,y));
  }
  
  //Create the divs that make up the grid
  function initGrid() {
    var mainDiv = $('#grid');
    for(var i = 0; i < gridSize; i++) {
      for(var j = 0; j < gridSize; j++) {
        mainDiv.append($('<div>')
          .attr('id', tileId(i,j))
          .addClass('tile')
          .width(tileSize)
          .height(tileSize)
          .css('left', i*tileSize)
          .css('top', j*tileSize));
      }
    }
    mainDiv.append($('<div>').attr('id', 'graveyard').hide());
    $('#grid').width(gridSize*tileSize).height(gridSize*tileSize);
  }
  
  function createFloatingText(x, y, div) {
    div.addClass('floatingText');
    var tile = getTile(x, y);
    var anchor = tile.find('.floatingTextAnchor');
    if(!anchor.length) tile.append($('<div>').addClass('floatingTextAnchor'));
    anchor = tile.find('.floatingTextAnchor');
    anchor.find('.floatingText').remove();
    anchor.append(div);
  }

  //checks if there is a squid at the specified location and returns it, returns null otherwise
  function getSquidAtPosition(x, y) {
    var foundSquid = null;
    squads.forEach(function(squad){
      squad.squids.forEach(function(squid){
        if(squid.x === x && squid.y === y) { foundSquid = squid; }
      });
    });
    return foundSquid;
  }
  
  
  //Performs actions that happen at the beginning of each turn. Most notably, applying healing or damage based on ink and refilling ink canisters
  function beginTurn(squad) {
    squad.squids.forEach(function(squid){squid.beginTurn();});
    mode = selecting;
  }
  
  function endTurn(squad) {
    squad.squids.forEach(function(squid){squid.endTurn()});
    clearPossibleMoves();
    clearPossibleAttacks();
    hideInfo();
    activeSquid = null;
  }
  
  //Function called when the end turn button is clicked.
  //Performs all actions to switch control to the other squad, including hiding squids and replenishing moves, etc.
  function turnButtonClick(e) {
    endTurn(activeSquad);
    activeSquad = squads[(squads.indexOf(activeSquad)+1)%squads.length];
    $('#turnIndicator').html(activeSquad.name+' squad\'s turn').css('color', activeSquad.rgbaString());
    beginTurn(activeSquad);
  }
  $('#turnButton').click(turnButtonClick);
  
  //hides the info pane
  function hideInfo() {
    $('#info').hide();
  }

  //recursive function that computes all possible moves from the given point
  //decrements the movebudget as it passes through tiles
  //adds available tiles to the 'moves' array
  function getPossibleMovesR(squid, x, y, moveBudget, moves) {
    if(moveBudget < 0) { return; }
    if(!moves.includes(x+'-'+y) && getSquidAtPosition(x, y) === null) moves.push(x+'-'+y);
    var tile;
    for(var i = 0; i < 4; i ++) {
      controller = getTileControl(x+xs[i], y+ys[i]);
      if(controller === null) {} //invalid tile
      else if(controller === undefined) { //uncontrolled tile
        getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-2, moves);
      }
      else if(controller === squid.squad) {//friendly tile
        if(squid.submerged) getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-1, moves);
        else getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-2, moves);
      }
      else { //enemy tile
        getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-4, moves);
      }
    }
  }
  
  //Function that calls the recursive function to display all the possible moves.
  //Adds a class that colors tiles to represent that they can be moved to
  function displayPossibleMoves(squid) {
    //array that collects all available tiles to move to
    var moves = [];
    //copy default movebudget, will decrement this as we traverse
    moveBudget = squid.moveBudget;
    //call the helper
    getPossibleMovesR(squid, squid.x, squid.y, moveBudget, moves);
    //add the class to all of the available tiles
    for(var i = 0; i < moves.length; i++) {
      var coords = moves[i].split('-');
      getTile(coords[0], coords[1]).addClass('possibleMove');
    }
  }
  
  //Clears all tiles of the possibleMove class
  function clearPossibleMoves() {
    for(var i = 0; i < gridSize; i++) {
      for(var j = 0; j < gridSize; j++) {
        getTile(i, j).removeClass('possibleMove');
      }
    }
  }
  
  //Displays available attack directions for the active squid
  function displayAttackSquares() {
    for(var i = 0; i < 4; i ++) {
      tile = getTile(activeSquid.x+xs[i], activeSquid.y+ys[i]);
      tile.addClass('possibleAttack');
    }
  }
  
  //Clears all tiles of the possibleAttack class
  function clearPossibleAttacks() {
    for(var i = 0; i < gridSize; i++) {
      for(var j = 0; j < gridSize; j++) {
        getTile(i, j).removeClass('possibleAttack');
      }
    }
  }
  
  //Called when the move button is pressed. Displays all possible moves for the active squid and sets the mode to move
  function setMoveMode() {
    clearPossibleMoves();
    clearPossibleAttacks();
    mode = move;
    displayPossibleMoves(activeSquid);
  }
  //Called when the attack button is pressed. Displays all possible attacks and sets the mode to attack.
  function setAttackMode() {
    clearPossibleMoves();
    clearPossibleAttacks();
    mode = attack;
    displayAttackSquares(activeSquid);
  }
  //Called when the submerge button is pressed. submerges the active squid
  function submerge() {
    clearPossibleMoves();
    clearPossibleAttacks();
    activeSquid.submerge();
  }
  //Called when the emerge button is pressed. causes the active squid to emerge from the ink
  function emerge() {
    clearPossibleMoves();
    clearPossibleAttacks();
    activeSquid.emerge();
  }
  //Special function for rollers, sets the mode to attack and the activeSquids attack type to roll.
  function setRollMode() {
    clearPossibleMoves();
    clearPossibleAttacks();
    mode = attack;
    activeSquid.attackType = 'roll';
    displayAttackSquares(activeSquid);
  }


  //Call all initialization functions
  initGrid();
  
  squads = [];
  createSquad('alpha', [255,0,0]);
  createSquid('shooter', squads[0]);
  createSquid('blaster', squads[0]);
  createSquid('roller', squads[0]);
  createSquid('charger', squads[0]);
  createSquad('bravo', [0,255,0]);
  createSquid('shooter', squads[1]);
  createSquid('blaster', squads[1]);
  createSquid('roller', squads[1]);
  createSquid('charger', squads[1]);
  
    //Set the active squad to the first one
  activeSquad = squads[0];
  //Update the turn indicator to signify which squad has the current turn
  $('#turnIndicator').html(activeSquad.name+' squad\'s turn').css('color', activeSquad.rgbaString());
  
  //Click function for main div. This is where the action happens.
  var mainDiv = $('#grid');
  mainDiv.click(function(e) {
    //Only take action if we clicked on a tile
    if(e.target.id.indexOf('tile') !== 0) {
      console.log("FATAL ERROR: thing we clicked was not a tile");
      return;
    }
    //find where we clicked
    coords = e.target.id.substring(4).split('-');
    coords[0] = parseInt(coords[0]);
    coords[1] = parseInt(coords[1]);
    //Get the squid, if any, at the tile.
    var squid = getSquidAtPosition(coords[0], coords[1]);
    //if we are selecting
    if(mode === selecting) {
      //and there is a squid, set it to active
      if(squid) {
        squid.displayInfo();
        activeSquid = squid;
        mode = selected;
      }
      //otherwise, deselect any selected squid
      else {
        hideInfo();
        activeSquid = null;
      }
    }
    //if we have a squid selected
    else if(mode === selected) {
      //and we click on a squid, select that one
      if(squid) {
        squid.displayInfo();
        activeSquid = squid;
      }
      //otherwise deselect the selected squid
      else {
        hideInfo();
        activeSquid = null;
        mode = selecting;
      }
    }
    //if we are moving, aka we pressed the move button and there are possibleMove tiles displayed
    else if(mode === move) {
      //if it is a valid move
      if(getTile(coords[0], coords[1]).hasClass('possibleMove')) {
        //move the squid there
        activeSquid.setPosition(coords[0], coords[1]);
        //if we move onto an enemy tile, emerge
        if(!getTile(coords[0], coords[1]).hasClass(activeSquid.squad.name+'Control')) {
          if(activeSquid.submerged) {
            activeSquid.emerge();
          }
        }
        //clear the board of the possibleMoves
        clearPossibleMoves();
        //remove the squid's move resource
        activeSquid.canMove = false;
        //go back to selected mode
        mode = selected;
        //refresh the squidinfo window
        activeSquid.displayInfo();
      }
      //otherwise, it is not a valid move, so behave like select
      else if(squid) {
        //set the new squid as active
        activeSquid = squid;
        //clear the board of the possibleMoves
        clearPossibleMoves();
        //go to selected mode
        mode = selected;
        //refresh the squidinfo window
        activeSquid.displayInfo();
      }
      //otherwise deselect
      else {
        clearPossibleMoves();
        hideInfo();
        activeSquid = null;
        mode = selecting;
      }
      
    }
    //if we are attacking, we have possibleAttack squares displayed
    else if(mode === attack) {
      //if we click on one, do the attack
      if(getTile(coords[0], coords[1]).hasClass('possibleAttack')) {
        //call the attack method
        activeSquid.attack(coords[0], coords[1]);
        //then go back to selected mode and remove the attack resource
        clearPossibleAttacks();
        activeSquid.canAttack = false;
        mode = selected;
        activeSquid.displayInfo();
      }
      //otherwise, behave like select/deselect
      else if(squid) {
        squid.displayInfo();
        activeSquid = squid;
        clearPossibleMoves();
        clearPossibleAttacks();
        mode = selected;
        activeSquid.displayInfo();
      }
      else {
        clearPossibleMoves();
        clearPossibleAttacks();
        hideInfo();
        activeSquid = null;
        mode = selecting;
      }
    }
    else {
      console.log('Mode should not be here, something went horribly wrong');
    }
  });
}

$(document).ready(main);

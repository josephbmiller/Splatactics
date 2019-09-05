function main() {

  //Size, in tiles, of the grid
  var gridSize = 10;
  //Size, in pixels, of each tile
  var tileSize = 32;
  //Opacity of the color of the ink that covers the board
  var inkOpacity = 0.5;
  //Amount a squid heals each turn when on it's own ink. Also the amount squids get damaged when on ink of a different color.
  var unSubmergedHeal = 15;
  //Bonus heal each turn for being submerged
  var submergedHeal = 45;
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
   
  //Types of squids available
  var squidTypes = [ 'shooter', 'blaster', 'roller', 'charger' ];
  //Properties of each type's weapon. Not all properties are used.
  var squidProps = {
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
  
  //Default squads
  var squads = [
    {
      name: 'alpha',
      color: '#FF0000',
      colorRGB: [255,0,0,0],
      squids: [],
      startingPositions: [[0,1],[1,0],[1,1],[0,0]]
    },
    {
      name: 'bravo',
      color: '#FF0000',
      colorRGB: [0,255,0],
      squids: [],
      startingPositions: [[gridSize-1,gridSize-2],[gridSize-2,gridSize-1],[gridSize-2,gridSize-2],[gridSize-1,gridSize-1]]
    }
  ];
  //Set the active squad to the first one
  activeSquad = squads[0];
  //Update the turn indicator to signify which squad has the current turn
  $('#turnIndicator').html(activeSquad.name+' squad\'s turn').css('color', rgbaStringFromSquadRGB(activeSquad, 1));
  
  //Constructor function to create squid objects.
  //type - string corresponding to a type of squid.
  //squad - squad object to add the squid to
  function createSquid(type, squad) {
    var squid = {};
    //the type of squid
    squid.type = type;
    //what squad it belongs to
    squid.squad = squad;
    //its x position
    squid.x = 0;
    //its y position
    squid.y = 0;
    //its current health, max 100
    squid.health = 100;
    //its current ink, max 100
    squid.ink = 100;
    //its default move budget, determines how far it can move under various conditions
    squid.moveBudget = 6;
    //jquery object of div that displays the squid onscreen
    squid.div = null;
    //Whether the squid can move this turn
    squid.canMove = true;
    //Whether the squid can attack this turn
    squid.canAttack = true;
    //Whether the squid is submerged
    squid.submerged = false;
    //Properties of the squid's weapon
    squid.props = squidProps[type];
    //attackType is a special property that only applies to rollers and chargers. sort of a hack.
    if(squid.type === 'charger') {
      squid.attackType = 'uncharged';
    }
    else {
      squid.attackType = '';
    }
    //called at the beginning of the turn, resets the squid's resources
    squid.replenishMoves = function() {
      this.canMove = true;
      this.canAttack = true;
    };
    //sets the position of the squid. used when moving and when rolling. Sets the position of the squid's div.
    squid.setPosition = function(x, y) {
      this.x = x;
      this.y = y;
      if(this.x >= gridSize) this.x = gridSize - 1;
      if(this.x < 0) this.x = 0;
      if(this.y >= gridSize) this.y = gridSize - 1;
      if(this.y < 0) this.y = 0;
      if (this.div) {
        this.div.css('left', this.x * tileSize + tileSize/2 - this.div.width()/2);
        this.div.css('top', this.y * tileSize + tileSize/2 - this.div.height()/2);
      }
    };
    //submerges the squid. cancels charge if the squid is a charger, otherwise just adds the css property and updates the info pane
    squid.submerge = function() {
      this.submerged = true;
      if(this.type === 'charger') {
        this.attackType = 'uncharged';
        this.moveBudget = 6;
        this.props.inkCost = this.props.minInkCost;
      }
      this.div.addClass('submerged');
      displaySquidInfo(this);
    };
    //causes the squid to emerge from the ink. removes the hidden class, thus revealing enemy squids.
    squid.emerge = function() {
      this.submerged = false;
      this.div.removeClass('submerged');
      this.div.removeClass('hidden');
      //only update info pane if it is the active squid (aka don't update if this is called by revealing an enemy squid)
      if(this === activeSquid) displaySquidInfo(this);
    };
    //Main attack function. Large switch block on the type of squid it is. Takes a square adjacent to the squid as input, squids can only fire in 4 directions
    squid.attack = function(xtar, ytar) {
      var xdir, ydir, i, xshots, yshots;
      //get directions for spray calculations. one will be +/- 1 and the other will be 0
      xdir = xtar - this.x;
      ydir = ytar - this.y;
      //deduct the cost of this move from the ink tank
      this.ink -= this.props.inkCost;
      //if the squid is submerged, pop it out. squids cant fire if they are submerged.
      if(this.submerged) {
        this.emerge();
      }
      if(this.type === 'shooter') {
        //reset squid's move ability, allowing it to move/submerge after shooting
        this.canMove = true;
        //If there is a squid in the first 2 squares in front of us, all globs will hit it.
        if(paintSquare(this.x+(xdir), this.y+(ydir), this.squad, this.props.damage*this.props.shotsPerRound)) { return; }
        if(paintSquare(this.x+(xdir*2), this.y+(ydir*2), this.squad, this.props.damage*this.props.shotsPerRound)) { return; }
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
            if(paintSquare(this.x+xshots[i][0][0]*xdir, this.y+xshots[i][0][1], this.squad, this.props.damage)) { continue; }
            paintSquare(this.x+xshots[i][1][0]*xdir, this.y+xshots[i][1][1], this.squad, this.props.damage);
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
            if(paintSquare(this.x+yshots[i][0][0], this.y+yshots[i][0][1]*ydir, this.squad, this.props.damage)) { continue; }
            paintSquare(this.x+yshots[i][1][0], this.y+yshots[i][1][1]*ydir, this.squad, this.props.damage);
          }
        }
      }
      else if(this.type === 'blaster') {
        //Blaster explodes on the first target contacted, so we paint each square on the path using the direct damage property.
        //Then if something is hit, we apply the splash damage using xs and ys arrays for adjacency
        //First paint our square
        paintSquare(this.x, this.y, this.squad, this.props.directDamage);
        //This could be a loop based on the props blaster range
        if(paintSquare(this.x+(xdir), this.y+(ydir), this.squad, this.props.directDamage)) {
          for(i = 0; i < 4; i ++) {
            paintSquare(this.x+(xdir)+xs[i], this.y+(ydir)+ys[i], this.squad, this.props.splashDamage);
          }
          return;
        }
        if(paintSquare(this.x+(xdir*2), this.y+(ydir*2), this.squad, this.props.directDamage)) {
          for(i = 0; i < 4; i ++) {
            paintSquare(this.x+(xdir*2)+xs[i], this.y+(ydir*2)+ys[i], this.squad, this.props.splashDamage);
          }
          return;
        }
        paintSquare(this.x+(xdir*3), this.y+(ydir*3), this.squad, this.props.directDamage);
        for(i = 0; i < 4; i ++) {
          paintSquare(this.x+(xdir*3)+xs[i], this.y+(ydir*3)+ys[i], this.squad, this.props.splashDamage);
        }
      }
      else if(this.type === 'roller') {
        if(this.attackType === 'roll') {
          //Roll is a special attack
          //We just paint a 4x3 area in front of the squid and then move the squid
          for(i = 1; i <= 4; i++) {
            for(j = -1; j < 2; j++) {
              if(xdir) {
                paintSquare(this.x+(xdir*i), this.y+j, this.squad, this.props.damage);
              }
              else {
                paintSquare(this.x+j, this.y+(ydir*i), this.squad, this.props.damage);
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
              paintSquare(this.x+(xshots[shot][0]*xdir), this.y+xshots[shot][1], this.squad, this.props.flickGlobDamage);
            }
          }
          else {
            yshots = [
                  [-1,1],[0,1],[1,1],
                  [-2,2],[-1,2],[0,2],[1,2],[2,2]
                 ];
            for(i = 0; i < 6; i++) {
              shot = Math.floor(Math.random() * 8);
              paintSquare(this.x+yshots[shot][0], this.y+(yshots[shot][1]*ydir), this.squad, this.props.flickGlobDamage);
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
            if(paintSquare(this.x+(xdir*i), this.y+(ydir*i), this.squad, this.props.damageMax)) {
              return;
            }
          }
        }
      }
    };
    return squid;
  }
  
  //Paints a square, applying damage to squids
  //x - int - position
  //y - int - position
  //squad - squad object - ink type to paint with
  //damage - int - damage to apply to any squids on the square
  //returns - boolean - whether a squid was hit
  function paintSquare(x, y, squad, damage) {
    //set the ink color for the square
    setTileControl(x, y, squad);
    //find any squid on the square
    var victim = getSquidAtPosition(x, y);
    //if the squid isn't friendly, apply damage
    if(victim && victim.squad !== squad) {
      //reveal the squid
      victim.emerge();
      //damage the squid
      damageSquid(victim, damage, squad);
      return true;
    }
    return false;
  }
  
  //Damages a squid, removing it from the game if the damage is fatal
  //squid - object - squid to damage
  //damage - int - damage to apply
  //attackingSquad - object - squad attacking
  //returns - boolean - whether the squid was killed
  function damageSquid(squid, damage, attackingSquad) {
    //deduct the health points
    squid.health -= damage;
    if( squid.health <= 0 ) {
      //squid killed! remove it's div
      squid.div.remove();
      //killed squids splat an area around them, dealing no damage
      for(var i = -1; i <= 1; i++) {
        for(var j = -1; j <= 1; j++) {
          setTileControl(squid.x+i, squid.y+j, attackingSquad);
        }
      }
      //remove the squid from it's squad
      squid.squad.squids.splice(squid.squad.squids.indexOf(squid), 1);
      //if that was the last squid, trigger end game.
      if(squid.squad.squids.length <= 0) {
        var winningSquad = squads[(squads.indexOf(squid.squad)+1)%squads.length];
        $('#main').html('<h1>'+winningSquad.name+' squad wins</h1>').css('color', rgbaStringFromSquadRGB(winningSquad, 1));
        $('#controls').html($('<button>').html('Reset').click(function(){
          window.location.href='index.html';
        }));
      }
      return true;
    }
    return false;
  }

  //Initialize a squad with squids, one of each type
  function initSquids(squad) {
    squad.squids.push(createSquid('shooter', squad));
    squad.squids.push(createSquid('blaster', squad));
    squad.squids.push(createSquid('roller', squad));
    squad.squids.push(createSquid('charger', squad));
  }
  
  //returns a string representing the rgba representation of a squad's rgb color array
  function rgbaStringFromSquadRGB(squad, opacity) {
    return 'rgba('+squad.colorRGB[0]+','+squad.colorRGB[1]+','+squad.colorRGB[2]+','+opacity+')';
  }

  //Create the divs for the squids of a squad and set the squid's div property
  function createSquidDivs(squad) {
    squidsDiv = $('#squids');
    for(var i = 0; i < squad.squids.length; i++) {
      var div = $('<div>');
      div.attr('id', 'squid'+squad.name+i);
      div.addClass('squid');
      div.css('font-size', tileSize);
      div.css('color', rgbaStringFromSquadRGB(squad, 1));
      div.css('text-shadow', '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black');
      div.html(squad.squids[i].type.substring(0,1).toUpperCase());
      squad.squids[i].div = div;
      squidsDiv.append(div);
    }
  }
  
  //Sets a tile to be under the control of a given squad
  function setTileControl(x, y, squad) {
    tile = getTile(x, y);
    if(tile.length === 0 || tile.hasClass(squad.name+'Control')) return;
    for(var i = 0; i < squads.length; i++) {
      if(tile.hasClass(squads[i].name+'Control')) {
        tile.removeClass(squads[i].name+'Control');
      }
    }
    if(tile.hasClass('noControl')) tile.removeClass('noControl');
    tile.addClass(squad.name+'Control');
    tile.css('background-color', rgbaStringFromSquadRGB(squad, inkOpacity));
  }

  //set initial squid positions from the squad starting positions
  function setSquidStartingPositions(squad) {
    for(var i = 0; i < squad.squids.length; i++) {
      squad.squids[i].setPosition(squad.startingPositions[i][0], squad.startingPositions[i][1]);
      setTileControl(squad.startingPositions[i][0], squad.startingPositions[i][1], squad);
    }
  }
  
  //returns the id property for a tile at a location
  function tileId(x, y) {
    return 'tile'+x+'-'+y;
  }
  
  //Create the divs that make up the grid
  function initGrid() {
    var mainDiv = $('#tiles');
    for(var i = 0; i < gridSize; i++) {
      for(var j = 0; j < gridSize; j++) {
        mainDiv.append($('<div>').attr('id', tileId(i,j)).addClass('tile').addClass('noControl').width(tileSize-2).height(tileSize-2).css('left', i*tileSize).css('top', j*tileSize));
      }
    }
    $('#grid').width(gridSize*tileSize).height(gridSize*tileSize);
  }
  
  //returns the jquery object for a tile at location
  function getTile(x, y) {
    return $('#'+tileId(x,y));
  }

  //checks if there is a squid at the specified location and returns it, returns null otherwise
  function getSquidAtPosition(x, y) {
    for(var i = 0; i < squads.length; i++) {
      for(var j = 0; j < squads[i].squids.length; j++) {
        if(squads[i].squids[j].x == x && squads[i].squids[j].y == y) {
          return squads[i].squids[j];
        }
      }
    }
    return null;
  }
  
  //Populates the squid info panel for the specified squid. This panel also controls what actions a squid can perform
  //This function checks the squid state and displays information and controls based on that state
  function displaySquidInfo(squid) {
    var squidInfoDiv = $('#squidInfo');
    squidInfoDiv.html('');
    var weaponInfoDiv = $('#weaponInfo');
    weaponInfoDiv.html('');
    if(!squid) return;
    squidInfoDiv.append($('<h4>').html('Squid Stats'));
    squidInfoDiv.append($('<p>').html('Type: '+squid.type));
    squidInfoDiv.append($('<p>').html('Health: '+squid.health));
    squidInfoDiv.append($('<p>').html('Ink: '+squid.ink));
    if(squid.submerged)
      squidInfoDiv.append($('<p>').html('Submerged'));
    if(squid.squad === activeSquad) {
      if(squid.canMove)
        squidInfoDiv.append($('<p>').append($('<button>').html('Move').click(setMoveMode)));
      if(squid.canAttack && squid.ink >= squid.props.inkCost)
        squidInfoDiv.append($('<p>').append($('<button>').html('Attack').click(setAttackMode)));
      if(squid.type === 'roller' && squid.canAttack && squid.canMove && squid.ink >= squid.props.inkCost)
        squidInfoDiv.append($('<p>').append($('<button>').html('Roll').click(setRollMode)));
      if(!squid.submerged && (squid.canAttack || squid.type === 'shooter' || squid.type === 'charger'))
        squidInfoDiv.append($('<p>').append($('<button>').html('Submerge').click(submerge)));
      if(squid.submerged)
        squidInfoDiv.append($('<p>').append($('<button>').html('Emerge').click(emerge)));
    }
    squidInfoDiv.css('background', rgbaStringFromSquadRGB(squid.squad, 0.5));
    weaponInfoDiv.append($('<img>').attr('src', 'img/'+squid.type+'.png').width(200));
    weaponInfoDiv.append(($('<p>').html(squid.props.info)));
  }
  
  //Performs actions that happen at the beginning of each turn. Most notably, applying healing or damage based on ink and refilling ink canisters
  function beginTurn(squad) {
    for(var i = 0; i < squad.squids.length; i++) {
      var tile = getTile(squad.squids[i].x, squad.squids[i].y);
      if(tile.hasClass('noControl')) {}
      else if(tile.hasClass(squad.name+'Control')) {
        squad.squids[i].health += unSubmergedHeal;
        squad.squids[i].ink += unSubmergedHeal;
        if(squad.squids[i].submerged) {
          squad.squids[i].health += submergedHeal;
          squad.squids[i].ink += submergedHeal;
        }
      }
      else {
        for (var j = 0; j < squads.length; j++) {
          if(tile.hasClass(squads[j].name+'Control')) {
            damageSquid(squad.squids[j], unSubmergedHeal, squads[j]);
          }
        }
      }
      if(squad.squids[i].health > 100) squad.squids[i].health = 100;
      if(squad.squids[i].ink > 100) squad.squids[i].ink = 100;
    }
  }
  
  //Function called when the end turn button is clicked.
  //Performs all actions to switch control to the other squad, including hiding squids and replenishing moves, etc.
  function turnButtonClick(e) {
    clearPossibleMoves();
    clearPossibleAttacks();
    hideSquad(activeSquad);
    activeSquad = squads[(squads.indexOf(activeSquad)+1)%squads.length];
    $('#turnIndicator').html(activeSquad.name+' squad\'s turn').css('color', rgbaStringFromSquadRGB(activeSquad, 1));
    revealSquad(activeSquad);
    mode = selecting;
    displaySquidInfo(null);
    activeSquid = null;
    replenishSquadMoves(activeSquad);
    beginTurn(activeSquad);
  }
  $('#turnButton').click(turnButtonClick);
  
  //reveals submerged squids for a squad
  function revealSquad(squad) {
    for(var i = 0; i < squad.squids.length; i++) {
      squad.squids[i].div.removeClass('hidden');
    }
    $('#hide'+squad.name).removeClass('hidden');
    $('#reveal'+squad.name).addClass('hidden');
  }
  
  //hides submerged squids for a squad
  function hideSquad(squad) {
    for(var i = 0; i < squad.squids.length; i++) {
      if(squad.squids[i].submerged) {
        squad.squids[i].div.addClass('hidden');
      }
    }
    $('#reveal'+squad.name).removeClass('hidden');
    $('#hide'+squad.name).addClass('hidden');
  }
  
  //recursive function that computes all possible moves from the given point, decrementing the movebudget as it passes through terrain
  function getPossibleMovesR(squid, x, y, moveBudget, moves, squadName) {
    if(moveBudget < 0) { return; }
    if(!moves.includes(x+'-'+y) && getSquidAtPosition(x, y) === null) moves.push(x+'-'+y);
    var tile;
    for(var i = 0; i < 4; i ++) {
      tile = getTile(x+xs[i], y+ys[i]);
      if(tile.length > 0) {
        if(tile.hasClass(squadName+'Control')) {
          if(squid.submerged) getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-1, moves, squadName);
          else getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-2, moves, squadName);
        }
        else if(tile.hasClass('noControl')) getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-2, moves, squadName);
        else getPossibleMovesR(squid, x+xs[i], y+ys[i], moveBudget-4, moves, squadName);
      
      }
    }
  }
  
  //Function that calls the recursive function to display all the possible moves.
  //Adds a class that colors tiles to represent that they can be moved to
  function displayPossibleMoves(squid) {
    var moves = [];
    
    moveBudget = squid.moveBudget;
    
    getPossibleMovesR(squid, squid.x, squid.y, moveBudget, moves, squid.squad.name);
    
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
  
  //Replenishes all moves for the squids of a squad
  function replenishSquadMoves(squad) {
    for(var i = 0; i < squad.squids.length; i++) {
      squad.squids[i].replenishMoves();
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
  for(var i = 0; i < squads.length; i++) {
    initSquids(squads[i]);
  }
  for(i = 0; i < squads.length; i++) {
    createSquidDivs(squads[i]);
  }
  for(i = 0; i < squads.length; i++) {
    setSquidStartingPositions(squads[i]);
  }
  
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
        displaySquidInfo(squid);
        activeSquid = squid;
        mode = selected;
      }
      //otherwise, deselect any selected squid
      else {
        displaySquidInfo(null);
        activeSquid = null;
      }
    }
    //if we have a squid selected
    else if(mode === selected) {
      //and we click on a squid, select that one
      if(squid) {
        displaySquidInfo(squid);
        activeSquid = squid;
      }
      //otherwise deselect the selected squid
      else {
        displaySquidInfo(null);
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
        displaySquidInfo(activeSquid);
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
        displaySquidInfo(activeSquid);
      }
      //otherwise deselect
      else {
        clearPossibleMoves();
        displaySquidInfo(null);
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
        displaySquidInfo(activeSquid);
      }
      //otherwise, behave like select/deselect
      else if(squid) {
        displaySquidInfo(squid);
        activeSquid = squid;
        clearPossibleMoves();
        clearPossibleAttacks();
        mode = selected;
        displaySquidInfo(activeSquid);
      }
      else {
        clearPossibleMoves();
        clearPossibleAttacks();
        displaySquidInfo(null);
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

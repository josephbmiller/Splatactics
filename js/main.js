function main() {

    var gridSize = 10;
    var tileSize = 32;
    var inkOpacity = 0.5;
    var unSubmergedHeal = 15;
    var submergedHeal = 45;
    var activeSquad;
    var activeSquid;
    
    
    const xs = [-1,0,1,0];
    const ys = [0,-1,0,1];
    
    const selecting = 0;
    const selected = 1;
    const move = 2;
    const attack = 3;
    var mode = selecting;
     
     
    var squidTypes = [ 'shooter', 'blaster', 'roller', 'charger' ];
    var squidProps = {
        shooter: {
            range: 4,
            shotsPerRound: 3,
            accuracy: 0.8,
            damage: 30,
            inkCost: 30
        },
        blaster: {
            spread: 2,
            range: 3,
            directDamage: 100,
            splashDamage: 50,
            inkCost: 30
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
            flickInkCost: 50
        },
        charger: {
            minRange: 3,
            maxRange: 7,
            chargeSpeed: 2,
            damageMin: 40,
            damageMax: 120,
            inkCost: 10,
            minInkCost: 10,
            maxInkCost: 50
        }
    };
    
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
    activeSquad = squads[0];
    
    function createSquid(type, squad) {
        var squid = {};
        squid.type = type;
        squid.squad = squad;
        squid.x = 0;
        squid.y = 0;
        squid.health = 100;
        squid.ink = 100;
        squid.moveBudget = 6;
        squid.div = null;
        squid.canMove = true;
        squid.canAttack = true;
        squid.submerged = false;
        squid.props = squidProps[type];
        if(squid.type === 'charger') {
            squid.attackType = 'uncharged';
        }
        else {
            squid.attackType = '';
        }
        squid.replenishMoves = function() {
            this.canMove = true;
            this.canAttack = true;
        };
        squid.setPosition = function(x, y) {
            this.x = x;
            this.y = y;
            if (this.div) {
                this.div.css('left', x * tileSize + tileSize/2 - this.div.width()/2);
                this.div.css('top', y * tileSize + tileSize/2 - this.div.height()/2);
            }
        };
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
        squid.emerge = function() {
            this.submerged = false;
            this.div.removeClass('submerged');
            this.div.removeClass('hidden');
            displaySquidInfo(this);
        };
        squid.attack = function(xtar, ytar) {
            this.props = squidProps[this.type];
            var xdir, ydir, i, xshots, yshots;
            xdir = xtar - this.x;
            ydir = ytar - this.y;
            this.ink -= this.props.inkCost;
            if(this.submerged) {
                this.emerge();
            }
            if(this.type === 'shooter') {
                this.canMove = true;
                if(paintSquare(this.x+(xdir), this.y+(ydir), this.squad, this.props.damage*this.props.shotsPerRound)) { return; }
                if(paintSquare(this.x+(xdir*2), this.y+(ydir*2), this.squad, this.props.damage*this.props.shotsPerRound)) { return; }
                var emptySpace = Math.floor(Math.random() * 4);
                if(xdir) {
                    xshots = [
                        [[1,0],[2,0]],
                        [[3,1],[4,1]],
                        [[3,0],[4,0]],
                        [[3,-1],[4,-1]]
                    ];
                    for(i = 0; i < 4; i++) {
                        if(emptySpace === i) continue;
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
                paintSquare(this.x, this.y, this.squad, this.props.directDamage);
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
                    this.canMove = false;
                    this.attackType = '';
                }
                else {
                    var shot;
                    if(xdir) {
                        xshots = [
                                  [1,-1],[1,0],[1,1],
                                  [2,-2],[2,-1],[2,0],[2,1],[2,2]
                                 ];
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
                if(this.attackType === 'uncharged') {
                    this.attackType = 'charged';
                    this.moveBudget = 2;
                    this.props.inkCost = this.props.maxInkCost;
                }
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
    
    function paintSquare(x, y, squad, damage) {
        setTileControl(x, y, squad);
        var victim = getSquidAtPosition(x, y);
        if(victim && victim.squad !== squad) {
            victim.emerge();
            if(damageSquid(victim, damage)) {
                console.log('squid killed');
                for(i = -1; i <= 1; i++) {
                    for(j = -1; j <= 1; j++) {
                        setTileControl(x+i, y+j, squad);
                    }
                }
            }
            return true;
        }
        return false;
    }
    
    function damageSquid(squid, damage) {
        console.log('damaging squid: '+damage);
        squid.health -= damage;
        if( squid.health <= 0 ) {
            console.log(squid.div);
            squid.div.remove();
            squid.squad.squids.splice(squid.squad.squids.indexOf(squid), 1);
            console.log('returning true');
            return true;
        }
        return false;
    }

    function initRandomSquids(squad) {
        for (var i = 0; i < squidTypes.length; i++) {
            squad.add(createSquid(squidTypes[Math.floor(Math.random() * squidTypes.length)], squad));
        }
    }

    function initSquids(squad) {
        squad.squids.push(createSquid('shooter', squad));
        squad.squids.push(createSquid('blaster', squad));
        squad.squids.push(createSquid('roller', squad));
        squad.squids.push(createSquid('charger', squad));
    }
    
    function rgbaStringFromSquadRGB(squad, opacity) {
        return 'rgba('+squad.colorRGB[0]+','+squad.colorRGB[1]+','+squad.colorRGB[2]+','+opacity+')';
    }

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

    function setSquidStartingPositions(squad) {
        for(var i = 0; i < squad.squids.length; i++) {
            squad.squids[i].setPosition(squad.startingPositions[i][0], squad.startingPositions[i][1]);
            setTileControl(squad.startingPositions[i][0], squad.startingPositions[i][1], squad);
        }
    }
    
    function tileId(x, y) {
        return 'tile'+x+'-'+y;
    }
    
    function initGrid() {
        var mainDiv = $('#tiles');
        for(var i = 0; i < gridSize; i++) {
            for(var j = 0; j < gridSize; j++) {
                mainDiv.append($('<div>').attr('id', tileId(i,j)).addClass('tile').addClass('noControl').width(tileSize-2).height(tileSize-2).css('left', i*tileSize).css('top', j*tileSize));
            }
        }
        $('#grid').width(gridSize*tileSize).height(gridSize*tileSize);
    }
    
    function getTile(x, y) {
        return $('#'+tileId(x,y));
    }

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
    
    function displaySquidInfo(squid) {
        var squidInfoDiv = $('#squidInfo');
        squidInfoDiv.html('');
        if(!squid) return;
        squidInfoDiv.append($('<h4>').html('Squid Stats'));
        squidInfoDiv.append($('<p>').html('Type: '+squid.type));
        squidInfoDiv.append($('<p>').html('Health: '+squid.health));
        squidInfoDiv.append($('<p>').html('Ink: '+squid.ink));
        if(squid.submerged) 
            squidInfoDiv.append($('<p>').html('Submerged'));
        if(squid.canMove)
            squidInfoDiv.append($('<p>').append($('<button>').html('Move').click(setMoveMode)));
        if(squid.canAttack && squid.ink >= squid.props.inkCost)
            squidInfoDiv.append($('<p>').append($('<button>').html('Attack').click(setAttackMode)));
        if(squid.type === 'roller' && squid.canAttack && squid.canMove)
            squidInfoDiv.append($('<p>').append($('<button>').html('Roll').click(setRollMode)));
        if(!squid.submerged && (squid.canAttack || squid.type === 'shooter' || squid.type === 'charger'))
            squidInfoDiv.append($('<p>').append($('<button>').html('Submerge').click(submerge)));
        if(squid.submerged)
            squidInfoDiv.append($('<p>').append($('<button>').html('Emerge').click(emerge)));
        squidInfoDiv.css('background', rgbaStringFromSquadRGB(squid.squad, 0.5));
    }
    
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
                squad.squids[i].health -= unSubmergedHeal;
            }
            if(squad.squids[i].health > 100) squad.squids[i].health = 100;
            if(squad.squids[i].ink > 100) squad.squids[i].ink = 100;
        }
    }
    
    function squadButtonClick(e) {
        for(var i = 0; i < squads.length; i++) {
            if(squads[i].name == e.target.innerHTML) {
                clearPossibleMoves();
                clearPossibleAttacks();
                activeSquad = squads[i];
                mode = selecting;
                displaySquidInfo(null);
                activeSquid = null;
                replenishSquadMoves(activeSquad);
                beginTurn(activeSquad);
            }
        }
    }
    
    function revealSquad(e) {
        var squad = e.data;
        for(var i = 0; i < squad.squids.length; i++) {
            squad.squids[i].div.removeClass('hidden');
        }
        $('#hide'+squad.name).removeClass('hidden');
        $('#reveal'+squad.name).addClass('hidden');
    }
    
    function hideSquad(e) {
        var squad = e.data;
        for(var i = 0; i < squad.squids.length; i++) {
            if(squad.squids[i].submerged) {
                squad.squids[i].div.addClass('hidden');
            }
        }
        $('#reveal'+squad.name).removeClass('hidden');
        $('#hide'+squad.name).addClass('hidden');
    }
    
    function createSquadSwapButtons() {
        for(var i = 0; i < squads.length; i++) {
            $('#squadButtons').append(
                $('<button>').html(squads[i].name).click(squadButtonClick)
                ).append(
                $('<button>').html('reveal '+squads[i].name).attr('id', 'reveal'+squads[i].name).addClass('hidden').click(squads[i], revealSquad)
                ).append(
                $('<button>').html('hide '+squads[i].name).attr('id', 'hide'+squads[i].name).click(squads[i], hideSquad)
            );
        }
    }
    
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
    
    function displayPossibleMoves(squid) {
        var moves = [];
        
        moveBudget = squid.moveBudget;
        
        getPossibleMovesR(squid, squid.x, squid.y, moveBudget, moves, squid.squad.name);
        
        for(var i = 0; i < moves.length; i++) {
            var coords = moves[i].split('-');
            getTile(coords[0], coords[1]).addClass('possibleMove');
        }
    }
    
    function clearPossibleMoves() {
        for(var i = 0; i < gridSize; i++) {
            for(var j = 0; j < gridSize; j++) {
                getTile(i, j).removeClass('possibleMove');
            }
        }
    }
    
    function displayAttackSquares() {
        for(var i = 0; i < 4; i ++) {
            tile = getTile(activeSquid.x+xs[i], activeSquid.y+ys[i]);
            tile.addClass('possibleAttack');
        }
    }
    
    function clearPossibleAttacks() {
        for(var i = 0; i < gridSize; i++) {
            for(var j = 0; j < gridSize; j++) {
                getTile(i, j).removeClass('possibleAttack');
            }
        }
    }
    
    function replenishSquadMoves(squad) {
        for(var i = 0; i < squad.squids.length; i++) {
            squad.squids[i].replenishMoves();
        }
    }
    
    function setMoveMode() {
        clearPossibleMoves();
        clearPossibleAttacks();
        mode = move;
        displayPossibleMoves(activeSquid);
    }
    function setAttackMode() {
        clearPossibleMoves();
        clearPossibleAttacks();
        mode = attack;
        displayAttackSquares(activeSquid);
    }
    function submerge() {
        clearPossibleMoves();
        clearPossibleAttacks();
        activeSquid.submerge();
    }
    function emerge() {
        clearPossibleMoves();
        clearPossibleAttacks();
        activeSquid.emerge();
    }
    function setRollMode() {
        clearPossibleMoves();
        clearPossibleAttacks();
        mode = attack;
        activeSquid.attackType = 'roll';
        displayAttackSquares(activeSquid);
    }



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
    createSquadSwapButtons();

    var mainDiv = $('#grid');
    mainDiv.click(function(e) {
        if(e.target.id.indexOf('tile') !== 0) {
            console.log("FATAL ERROR: thing we clicked was not a tile");
            return;
        }
        coords = e.target.id.substring(4).split('-');
        coords[0] = parseInt(coords[0]);
        coords[1] = parseInt(coords[1]);
        var squid = getSquidAtPosition(coords[0], coords[1]);
        if(mode === selecting) {
            if(squid) {
                displaySquidInfo(squid);
                activeSquid = squid;
            }
            else {
                displaySquidInfo(null);
                activeSquid = null;
            }
        }
        
        else if(mode === selected) {
            if(squid) {
                displaySquidInfo(squid);
                activeSquid = squid;
            }
            else {
                displaySquidInfo(null);
                activeSquid = null;
                mode = selecting;
            }
        }
        else if(mode === move) {
            if(getTile(coords[0], coords[1]).hasClass('possibleMove')) {
                activeSquid.setPosition(coords[0], coords[1]);
                if(!getTile(coords[0], coords[1]).hasClass(activeSquid.squad.name+'Control')) {
                    if(activeSquid.submerged) {
                        activeSquid.emerge();
                    }
                }
                clearPossibleMoves();
                activeSquid.canMove = false;
                mode = selected;
                displaySquidInfo(activeSquid);
            }
            else if(squid) {
                displaySquidInfo(squid);
                activeSquid = squid;
                clearPossibleMoves();
                mode = selected;
                displaySquidInfo(activeSquid);
            }
            else {
                clearPossibleMoves();
                displaySquidInfo(null);
                activeSquid = null;
                mode = selecting;
            }
            
        }
        else if(mode === attack) {
            if(getTile(coords[0], coords[1]).hasClass('possibleAttack')) {
                activeSquid.attack(coords[0], coords[1]);
                clearPossibleAttacks();
                activeSquid.canAttack = false;
                mode = selected;
                displaySquidInfo(activeSquid);
            }
            else if(squid) {
                displaySquidInfo(squid);
                activeSquid = squid;
                clearPossibleMoves();
                mode = selected;
                displaySquidInfo(activeSquid);
            }
            else {
                clearPossibleMoves();
                displaySquidInfo(null);
                activeSquid = null;
                mode = selecting;
            }
        }
        else {
            
            console.log('Not implemented yet lol');
        }
        
        //console.log(tile);
    });
    
    
}


$(document).ready(main);
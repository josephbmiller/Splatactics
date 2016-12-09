function main() {

    var gridSize = 10;
    var tileSize = 32;
    var inkOpacity = 0.5;
    var activeSquad;

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
            damage: 100,
            inkCost: 30
        },
        roller: {
            width: 3,
            rollSpeed: 3,
            damage: 200,
            inkCost: 30,
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
            minInkCost: 30,
            maxInkCost: 60
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
        squid.div = null;
        squid.setPosition = function(x, y) {
            this.x = x;
            this.y = y;
            if (this.div) {
                this.div.css('left', x * tileSize + tileSize/2 - this.div.width()/2);
                this.div.css('top', y * tileSize + tileSize/2 - this.div.height()/2);
            }
        };
        return squid;
    }

    function initRandomSquids(squad) {
        for (var i = 0; i < squidTypes.length; i++) {
            squad.add(createSquid(squidTypes[Math.floor((Math.random() * squidTypes.length) + 1)], squad));
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
        if(tile.hasClass(squad.name+'Control')) return;
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
        //squidInfoDiv.append($('<p>').append($('<button>').
        squidInfoDiv.css('background', rgbaStringFromSquadRGB(squid.squad, 0.5));
    }
    
    function squadButtonClick(e) {
        for(var i = 0; i < squads.length; i++) {
            if(squads[i].name == e.target.innerHTML) {
                activeSquad = squads[i];
            }
        }
    }
    
    function createSquadSwapButtons() {
        for(var i = 0; i < squads.length; i++) {
            $('#squadButtons').append(
                $('<button>').html(squads[i].name).click(squadButtonClick)
            );
        }
    }
    
    function getPossibleMovesR(x, y, moveBudget, moves, squadName) {
        if(moveBudget < 0) { return; }
        if(!moves.includes(x+'-'+y)) moves.push(x+'-'+y);
        var tile;
        var xs = [-1,0,1,0];
        var ys = [0,-1,0,1];
        for(var i = 0; i <= 4; i ++) {
            tile = getTile(x+xs[i], y+ys[i]);
            if(tile.length > 0) {
                if(tile.hasClass(squadName+'Control')) getPossibleMovesR(x+xs[i], y+ys[i], moveBudget-1, moves, squadName);
                else if(tile.hasClass('noControl')) getPossibleMovesR(x+xs[i], y+ys[i], moveBudget-2, moves, squadName);
                else getPossibleMovesR(x+xs[i], y+ys[i], moveBudget-4, moves, squadName);
            
            }
        }
    }
    
    function getPossibleMoves(squid) {
        var moves = [];
        
        moveBudget = 6;
        
        getPossibleMovesR(squid.x, squid.y, moveBudget, moves, squid.squad.name);
        
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
        var squid = getSquidAtPosition(coords[0], coords[1]);
        if(squid) {
            displaySquidInfo(squid);
            var moves = getPossibleMoves(squid);
        }
        else {
            clearPossibleMoves();
            //setTileControl(coords[0], coords[1], activeSquad);
        }
        
        //console.log(tile);
    });
    
    
}


$(document).ready(main);
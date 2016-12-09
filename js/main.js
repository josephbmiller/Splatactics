function main() {

    var gridSize = 10;
    var tileSize = 64;

    var squidTypes = [ 'shooter', 'blaster', 'roller', 'charger' ];
    var squidProps = {
        shooter: {
            range: 4,
            shotsPerRound: 3,
            accuracy: .8,
            damage: 30,
            inkCost: 30
        },
        blaster: {
            spread: 2,
            range: 2,
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
            squids: [],
            startingPositions: [[0,0],[0,1],[0,2],[0,3]]
        },
        {
            name: 'bravo',
            color: '#FF0000',
            squids: [],
            startingPositions: [[gridSize-1,gridSize-1],[gridSize-1,gridSize-2],[gridSize-1,gridSize-3],[gridSize-1,gridSize-4]]
        }
    ];
    
    function createSquid(type) {
        var squid = {};
        squid.type = type;
        squid.x = 0;
        squid.y = 0;
        squid.ink = 100;
        squid.div = null;
        squid.setPosition = function(x, y) {
            this.x = x;
            this.y = y;
            if (this.div) {
                this.div.css('left', x * tileSize);
                this.div.css('top', y * tileSize);
            }
        };
        return squid;
    }

    function initRandomSquids(squad) {
        for (var i = 0; i < squidTypes.length; i++) {
            squad.add(createSquid(squidTypes[Math.floor((Math.random() * squidTypes.length) + 1)]));
        }
    }

    function initSquids(squad) {
        squad.squids.push(createSquid('shooter'));
        squad.squids.push(createSquid('blaster'));
        squad.squids.push(createSquid('roller'));
        squad.squids.push(createSquid('charger'));
    }

    function createSquidDivs(squad) {
        squidsDiv = $('#squids');
        for(var i = 0; i < squad.squids.length; i++) {
            var div = $('<div>');
            div.attr('id', 'squid'+squad.name+i);
            div.addClass('squid');
            div.html(squad.squids[i].type.substring(0,1).toUpperCase());
            squad.squids[i].div = div;
            squidsDiv.append(div);
        }
    }

    function setSquidStartingPositions(squad) {
        for(var i = 0; i < squad.squids.length; i++) {
            squad.squids[i].setPosition(squad.startingPositions[i][0], squad.startingPositions[i][1]);
            setTileColor(getTile(squad.startingPositions[i][0], squad.startingPositions[i][1]), squad.color);
        }
    }
    
    function tileId(x, y) {
        return 'tile'+x+'-'+y;
    }
    
    function initGrid() {
        var mainDiv = $('#grid');
        for(var i = 0; i < gridSize; i++) {
            for(var j = 0; j < gridSize; j++) {
                mainDiv.append($('<div>').attr('id', tileId(i,j)).addClass('tile').width(tileSize-1).height(tileSize-1).css('left', i*tileSize).css('top', j*tileSize));
            }
        }
    }
    
    function getTile(x, y) {
        return $('#'+tileId(x,y));
    }
    
    function setTileColor(tile, color) {
        tile.css('border', '1px solid '+color);
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
    



    initGrid();
    for(var i = 0; i < squads.length; i++) {
        initSquids(squads[i])
    }
    for(i = 0; i < squads.length; i++) {
        createSquidDivs(squads[i]);
    }
    for(i = 0; i < squads.length; i++) {
        setSquidStartingPositions(squads[i]);
    }

    var mainDiv = $('#grid');
    mainDiv.click(function(e) {
        if(e.target.id.indexOf('tile') != 0) {
            console.log("FATAL ERROR: thing we clicked was not a tile");
            return;
        }
        coords = e.target.id.substring(4).split('.');
        var squid = getSquidAtPosition(coords[0], coords[1]);
        var tile = getTile(coords[0], coords[1]);

        console.log(tile);
    })
}


$(document).ready(main);
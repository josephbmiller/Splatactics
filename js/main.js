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
        squid.i = 0;
        squid.j = 0;
        squid.ink = 100;
        squid.div = null;
        squid.setPosition = function(i, j) {
            this.i = i;
            this.j = j;
            if (this.div) {
                this.div.css('left', i * tileSize);
                this.div.css('top', j * tileSize);
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
        }
    }
    
    function tileId(i, j) {
        return 'tile'+i+'.'+j;
    }
    
    function initGrid() {
        var mainDiv = $('#grid');
        for(var i = 0; i < gridSize; i++) {
            for(var j = 0; j < gridSize; j++) {
                mainDiv.append($('<div>').attr('id', tileId(i,j)).addClass('tile').width(tileSize).height(tileSize).css('left', i*tileSize).css('top', j*tileSize));
            }
        }
    }
    
    function getTile(i, j) {
        return $('#'+tileId(i,j));
    }
    
    function setTileColor(tile, color) {
        tile.style('color', color);
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

    alphaColor = '#FF0000';
    bravoColor = '#00FF00';
    console.log('hello');
}


$(document).ready(main);
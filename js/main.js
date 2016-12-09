function main() {
    var gridSize = 10;
    var tileSize = 32;
    var mainDiv = $('#grid');
    
    var squidTypes = [ 'splattershot', 'blaster',  ]
    
    var alphaSquad = [];
    var bravoSquad = [];
    
    function createSquid(type) {
        var squid = {};
        squid.type = type;
        squid.i = 0;
        squid.j = 0;
        squid.setPosition = function(i, j) {
            this.i = i;
            this.j = j;
        };
    }
    
    function setSquidPosition(squid, i, j) {
        squid.i = i;
        squid.j = j;
    }
    
    function tileId(i, j) {
        return 'tile'+i+'.'+j;
    }
    
    function initGrid() {
        for(var i = 0; i < gridSize; i++) {
            for(var j = 0; j < gridSize; j++) {
                mainDiv.append($('<div/>').id(tileId(i,j)).width(tileSize).height(tileSize));
            }
        }
    }
    initGrid();
    
    function getTile(i, j) {
        return $('#'+tileId(i,j));
    }
    
    function setTileColor(tile, color) {
        tile.style('color', color);
    }
    
    
    
    
}


$(document).ready(main);
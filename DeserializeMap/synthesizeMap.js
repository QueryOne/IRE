
synthesizeMap = function(datum) {
  /* Areas */
  var areas = {}
  var t;
  for (var i = datum.areas.length - 1; i > -1; i--) {
    t = {}
    var area   = datum.areas[i]
    t.areaID   = area.key
    t.areaName = area.value
    for (var j = 0; j < datum.details.list.length; j++) {
      var areaDetail = datum.details.list[j]
      if (areaDetail.id == area.key) {
        t.rooms = areaDetail.rooms
        t.exits = areaDetail.exits
        // Boundaries
        var dimensions = {}
        // xMin
        for (var k = 0; k < areaDetail.vectorBounds.xminForZ.length; k++) {
          var zLevel = areaDetail.vectorBounds.xminForZ[k][0]
          var value  = areaDetail.vectorBounds.xminForZ[k][1]
          dimensions[zLevel] = dimensions[zLevel] || {}
          dimensions[zLevel].x = dimensions[zLevel].x || []
          dimensions[zLevel].x.push(value)
        }
        // xMax
        for (var k = 0; k < areaDetail.vectorBounds.xmaxForZ.length; k++) {
          var zLevel = areaDetail.vectorBounds.xmaxForZ[k][0]
          var value  = areaDetail.vectorBounds.xmaxForZ[k][1]
          dimensions[zLevel] = dimensions[zLevel] || {}
          dimensions[zLevel].x = dimensions[zLevel].x || []
          dimensions[zLevel].x.push(value)
        }
        // yMin
        for (var k = 0; k < areaDetail.vectorBounds.yminForZ.length; k++) {
          var zLevel = areaDetail.vectorBounds.yminForZ[k][0]
          var value  = areaDetail.vectorBounds.yminForZ[k][1]
          dimensions[zLevel] = dimensions[zLevel] || {}
          dimensions[zLevel].y = dimensions[zLevel].y || []
          dimensions[zLevel].y.push(value)
        }
        // yMax
        for (var k = 0; k < areaDetail.vectorBounds.ymaxForZ.length; k++) {
          var zLevel = areaDetail.vectorBounds.ymaxForZ[k][0]
          var value  = areaDetail.vectorBounds.ymaxForZ[k][1]
          dimensions[zLevel] = dimensions[zLevel] || {}
          dimensions[zLevel].y = dimensions[zLevel].y || []
          dimensions[zLevel].y.push(value)
        }
        t.dimensions = dimensions
        break
      }
    }
    areas[area.key] = t
  }
  
  /* Rooms */
  var rooms = {}
  var transpose = {sw: 'southwest', s: 'south', se: 'southeast', nw: 'northwest', n: 'north', ne: 'northeast', w: 'west', e: 'east'}
  for (var r in map.rooms) {
    var room = map.rooms[r]
    rooms[r] = {}
    rooms[r].id     = room.id
    rooms[r].name   = room.name
    rooms[r].area   = room.area
    rooms[r].coordinates = room.coords
    rooms[r].environment = room.env
    
    rooms[r].indoors = room.userData['indoors'] == 'y' ? true : false

    rooms[r].weight  = room.weight
    rooms[r].symbol  = room.mSymbol

    // Handle exits
    rooms[r].exits = {}
    for (var dir in room.dirs) {
      rooms[r].exits[dir.replace('_','')] = {
        target : room.dirs[dir],
        door   : false,
        locked : false,
        special: false,
      }
    }
    // 0=no door 1=open 2=closed 3=locked
    for (var x in room.doors) {
      var d   = room.doors[x][0]
      var dir = transpose[d] ? transpose[d] : d
      rooms[r].exits[dir] = rooms[r].exits[dir] || {}
      rooms[r].exits[dir].door = room.doors[x][1]
    }
    
    rooms[r].exitLocks = room.exitLocks
    rooms[r].exitStubs = room.exitStubs
    rooms[r].exitWeights = room.exitWeights

    rooms[r].additional = {}
    for (var k in room.userData) {
      if (k != 'indoors') {
        rooms[r].additional[k] = room.userData[k]
      }
    }
    for (var k in room.others) {
      rooms[r].additional[k] = room.others[k]
    }

    rooms[r].gameArea = typeof room.userData['Game Area'] == 'string' ? room.userData['Game Area'] : ''
  }
  
  // console.log(areas)
  var data = JSON.stringify(areas)
  var size = new TextEncoder().encode(data).length
  var kB   = size / 1024
  var MB   = size / (1024 * 1024)
  console.log('Size of areas data is ' + kB + ' kB.')

  var rdata = JSON.stringify(rooms)
  var rsize = new TextEncoder().encode(rdata).length
  var rkB   = rsize / 1024
  var rMB   = rsize / (1024 * 1024)
  console.log('Size of rooms data is ' + rkB + ' kB.')
  return {areas: areas, rooms: rooms}
}

/*
    To turn off debugging, 
        debugState = false
    To print all messages,
        debugState = 0

    As an example,
      at __debugState == 1, we print only the highest priority messages
      at __debugState == 10, we print messages including lower priority messages
    Usage:
      __debug("Error message here.", 5)
 */
let debugState   = 3
let debugDefault = 9
let __debug = function(msg, threshold) {
  if (typeof debugState != 'number') { return }
  if (debugState === 0) {
    if (typeof msg == 'string') {
      console.log('(debug): ' + msg)
    } else { console.log('(debug) >> '); console.log(msg) }
  } else {
    var t = threshold ? threshold : debugDefault
    if (t < debugState) {
      if (typeof msg == 'string') {
        console.log('(debug): ' + msg)
      } else { console.log('(debug) >> '); console.log(msg) }
    }
  }
}

parseQt = function(datum) {
  const enc     = new TextDecoder("utf-8")
  const dataV   = new DataView(datum.buffer)
  const pngSpec = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  let position  = 0

  var decode = function(arr) { return enc.decode(arr.filter(function(e){return e !== 0})) }
  var readString = function(v) {
    // would like to make this a single line function but fucking hell the variability in encoding needs debug lines
    var L = read('int32')
    if (L < 0) { return '' }
    return decode(grab(v, L)) 
  }
  var readIntString = function(v) { return decode(grab(v, read('int32'))) }

  var grab = function(g, len) {
    __debug(len, 15)
    let h = g.slice(position, position + len)
    position += len
    return h
  }
  var read = function(g) {
    let out;
    switch(g) {
      case 'int8'  : out =      dataV.getInt8( position, false ); position += 1; break;
      case 'uint8' : out =     dataV.getUint8( position, false ); position += 1; break;
      case 'int16' : out =     dataV.getInt16( position, false ); position += 2; break;
      case 'uint16': out =    dataV.getUint16( position, false ); position += 2; break;
      case 'int32' : out =     dataV.getInt32( position, false ); position += 4; break;
      case 'uint32': out =    dataV.getUint32( position, false ); position += 4; break;
      case 'int64' : out =  dataV.getBigInt64( position, false ); position += 8; break;
      case 'uint64': out = dataV.getBigUint64( position, false ); position += 8; break;
      case 'float' : out =   dataV.getFloat64( position, false ); position += 8; break;

      case 'double': out = (new Uint64BE(datum, position)).toNumber(); position += 8; break;
      default: break;
    }
    return out
  }
  // PNG Handling
  var equalBytes = function(a, b) {
	if (a.length != b.length) return false;
	for (var l = a.length; l--;) if (a[l] != b[l]) return false;
	return true;
  }
  
  let map = {}
      map.envColors = []
      map.areas     = []
      map.customEnvColors = {}
      map.hash      = {}
      map.userData  = {}
      map.userFont  = {}
      map.details   = {}

  // V: mVersion, T: int, S: quint32??
  map.version = read('uint32')

  // V: envColors, T: QMap, S: quint32
  // V: envColors.key, envColors.value, T: QMap<int, int> envColors;
  let list = [];
  for (var i = 0, len = read('uint32'); i < len; i++) {
    map.envColors.push({key: read('uint32'), value: read('uint32')})
  }

  // V: areas, T: QMap, S: quint32, then quint32, string
  // QMap<int, QString> areaNamesMapWithPossibleEmptyOrDuplicateItems;
  list = []
  for (var i = 0, len = read('uint32'); i < len; i++) {
    map.areas.push({key: read('uint32'), value: readString(datum)})
  }

  // V: customEnvColors, T: QMap<int, QColor> customEnvColors;
  map.customEnvColors.size = read('uint32')
  list = []
  let use255  = true
  let channel = use255 ? 257 : 1
  for (var i = 0; i < map.customEnvColors.size; i++) {
    let key = read('uint32')
    let spec  = read('int8')
    // spec 1, should write code for other specs in future
    let alpha = read('uint16') / channel
    let red   = read('uint16') / channel
    let green = read('uint16') / channel
    let blue  = read('uint16') / channel
    let pad   = read('uint16') / channel
    list.push({key: key, value: {spec: spec, alpha: alpha, red: red, green: green, blue: blue, pad: pad}})
  }
  map.customEnvColors.list = list

  // V: mpRoomDB, hashToRoomID; T: QMap<QString, int> hashToRoomID;, ifs >> mpRoomDB->hashToRoomID;
  map.hash.size = read('uint32')
  list = []
  for (var i = 0; i < map.hash.size; i++) {
    let hash = decode(grab(datum, read('uint32')))
    let id   = read('uint32')
    list.push({hash: hash, id: id})
  }
  map.hash.list = list

  // ifs >> mUserData; QMap<QString, QString> mUserData;
  list = []
  for (var i = 0, len = read('uint32'); i < len; i++) {
    list.push({key: readString(datum), val: readString(datum)})
  }
  map.userData.list = list
  
  // console.log(read('uint32'))

  // ifs >> mMapSymbolFont; QFont mMapSymbolFont; QString + qint16 + quint8 x 4
  // family, pointsize, stylehint, char set, weight, font bits
  /*
   , mMapSymbolFont(QFont(QStringLiteral("Bitstream Vera Sans Mono"), 12, QFont::Normal))
   , mMapSymbolFontFudgeFactor(1.0)
   , mIsOnlyMapSymbolFontToBeUsed(false)
   */
  map.userFont.family = readString(datum) // decode(grab(datum, read('int32')))

  map.userFont.styleName = read('int32')  // -1
  map.userFont.pointSize = read('float')  // 12
  map.userFont.pixelSize = read('int32')  // -1
  map.userFont.styleHint = read('int8')   // 5 >> QFont::AnyStyle
  map.userFont.styleStrategy  = read('int16') // 4296 ?? 
  map.userFont.charSet   = read('uint8')  // 0
  map.userFont.weight    = read('uint8')  // 50 >> Normal
  map.userFont.bits      = read('int8')   // 16
  map.userFont.stretch   = read('uint16') // 0 >> AnyStretch
  map.userFont.extendedBits   = read('uint8')  // 1
  map.userFont.letterSpacing  = read('uint32') // 0
  map.userFont.wordSpacing    = read('uint32') // 0
  map.userFont.hintingPref    = read('uint8')  // 0 >> PreferDefaultHinting
  map.userFont.capitalization = read('uint8')  // 0 >> MixedCase
  
  let unknown  = grab(datum, 0) // 35
  let unknownL = unknown.length
      unknown  = decode(unknown)
  console.log('Unresolved bits in QFont: ' + unknown + ' (' + unknownL + ')')

  map.userFont.fudgeFactor   = read('float')

  // map.userFont.fudgeFactor   = bufferToHex(grab(datum, 8)) // read('int32') + read('int32')
  map.userFont.mapSymbolFont = read('int8')  // grab(datum, 2)

  // console.log(map.userFont) //; console.log(map.userFont.family)
  
  map.details = {}
  map.details.size = read('uint32')
  // console.log('Map Count: ' + map.details.size + ' vs ' + datum.length + ' total file size.')
  map.details.list = []
  var n = map.details.size // ???
  for (var i = 0; i < n; i++) {
    // integer for RoomID
    let key = read('int32')

    // QSet<int> rooms; // rooms of this area
    let roomCount = read('uint32')
    let roomList  = []
    for (var j = 0; j < roomCount; j++) {
      let roomKey = read('uint32')
      roomList.push(roomKey)
    }

    // QList<int> zLevels;
    let zCount = read('int32')
    let zList  = []
    for (var j = 0; j < zCount; j++) {
      zList.push(read('int32'))
    }

    // QMultiMap<int, QPair<int, int>> exits;
    let exCount = read('int32')
    let exList  = []
    for (var j = 0; j < exCount; j++) {
      exList.push([read('int32'),read('int32'),read('int32')])
    }

    // bool gridMode;
    let gridMode = read('int8')

    // max X,Y,Z & min X,Y,Z
    // x: -2 to 30, y: -84 to 0, z : 0 to 2 for [1]
    let maxX = read('int32')
    let maxY = read('int32')
    let maxZ = read('int32')
    let minX = read('int32')
    let minY = read('int32')
    let minZ = read('int32')
    let coordinates = {max_x: maxX, max_y: maxY, max_z: maxZ, min_x: minX, min_y: minY, min_z: minZ}

    // QVector3D span; double, double, double
    let Vector3D = {
      x: read('double'),
      y: read('double'),
      z: read('double'),
    }

    // xmaxForZ; ymaxForZ; xminForZ; yminForZ; QMap<int, int> xminForZ;
    // n + n*QMap<int, int> xmaxForZ; n + n*QMap<int, int> ymaxForZ; n + n*QMap<int, int> xminForZ; n + n*QMap<int, int> yminForZ;
    let boundsDefined = ['xmaxForZ','ymaxForZ','xminForZ','yminForZ']
    let bounds = {}
    for (var j = 0; j < boundsDefined.length; j++) {
      var e = read('int32')
      var t = []
      for (var k = 0; k < e; k++) {
        t.push([read('int32'), read('int32')])
      }
      bounds[boundsDefined[j]] = t
    }

    // QVector3D pos; 
    let pos = {
      x: read('double'),
      y: read('double'),
      z: read('double'),
    }
   
    let isZone = read('int8')
    let zoneAreaRef = read('uint32')

    // mUserData; QMap<QString, QString> mUserData;
    let userDataLength = read('uint32')
    let userData       = []
    for (var j = 0; j < userDataLength; j++) {
      userData.push([decode(grab(datum,read('uint32'))), decode(grab(datum,read('uint32')))])
    }
    
    let area = {
      id: key,
      rooms       : roomList,
      zLevels     : zList,
      exits       : exList,
      grid        : gridMode,

      coordinates : coordinates,
      vector      : Vector3D,
      vectorBounds: bounds,
      pos         : pos,
      isZone      : isZone,
      zoneAreaRef : zoneAreaRef,

      userData    : userData,
    }
    map.details.list.push(area) // console.log(area)
  }

  // QHash<QString, int> mRoomIdHash;
  let hashLength = read('uint32')
  list = []
  for (var i = 0; i < hashLength; i++) {
    list.push([decode(grab(datum,read('uint32'))), read('int32')])
  }
  map.mRoomIdHash = list

  // Labels loop
  let labelLength = read('uint32')
  let labels = {}
  for (var i = 0; i < labelLength; i++) {
    var size = read('uint32')
    var area = read('uint32')
    var chan  = 257
    var label = {}
    labels[area] = labels[area] || []

    for (var j = 0; j < size; j++) {
      label = {}
      // QVector3D pos; QPointF pointer; QSizeF size; QString text; QColor fgColor;
      // QColor bgColor; QPixmap pix; >>>> QImage image;
      label.id       = read('uint32')
      label.position = {x: read('float'), y: read('float'), z: read('float')}
      label.pointer  = [read('float'), read('float')]
      label.size     = {w: read('float'), h: read('float')}
      label.text     = decode(grab(datum,read('uint32')))
      label.fgColor  = {
        spec : read('int8'), 
        alpha: read('uint16') / chan, 
        red  : read('uint16') / chan, 
        green: read('uint16') / chan, 
        blue : read('uint16') / chan, 
        pad  : read('uint16') / chan,
      }
      label.bgColor  = {
        spec : read('int8'), 
        alpha: read('uint16') / chan, 
        red  : read('uint16') / chan, 
        green: read('uint16') / chan, 
        blue : read('uint16') / chan, 
        pad  : read('uint16') / chan,
      }
      
      // test QPixmap(that is, QImage)
      var testImage = read('uint32')
      if (testImage == 0) {
        // do nothing
      } else {
        // console.log('There is a picture to read (' + (testImage ? 'true' : 'ERR') + ' @ ' + position + '): Label-' + label.id) 
        var header = grab(datum, 8)
        var png    = {}
        if (equalBytes(header,pngSpec)) {
            var chunkLength  = read('uint32')
            var chunkType    = decode(grab(datum,4))
            var chunkContent = grab(datum, chunkLength)
            var chunkCRC     = grab(datum,4)
            png.width       = chunkContent.slice(0, 4)
            png.height      = chunkContent.slice(4, 4 + 4)
            png.bitDepth    = chunkContent.slice(8, 8 + 1)
            png.colorType   = chunkContent.slice(9, 9 + 1)
            png.compression = chunkContent.slice(10, 10 + 1)
            png.filter      = chunkContent.slice(11, 11 + 1)
            png.interlace   = chunkContent.slice(12, 12 + 1)
          
            var temp = position
            while (temp < datum.length) {
              var len = dataV.getUint32(temp, false)
              var type = decode(datum.slice( temp + 4, temp + 8 ))
              var content = ''
              if (len > 0) { content = datum.slice( temp + 8, temp + 8 + len ) }
              var crc = datum.slice( temp + 8 + len, 4 )
              temp += 8 + len + 4
              if (type == 'IEND') { break }
            }
            position = temp // IEND's position
        } 
      }
      label.noScaling = read('int8')
      label.showOnTop = read('int8')
      labels[area].push(label)
    }
  }
  map.labels = labels

  console.log('Leftover bytes to read into rooms: ' + (datum.length - position) + '.')

  // void TRoom::restore(QDataStream& ifs, int roomID, int version)
  rooms = {}
  c = 0
  while(position < datum.length) {
    var roomid = read('uint32')
    __debug('Now parsing room  ' + roomid + ' in cycle ' + c + '.', 4)
    var area   = read('uint32')
    var x      = read('int32')
    var y      = read('int32')
    var z      = read('int32')
    var dirs   = {
         north    : read('int32'),
         northeast: read('int32'),
         east     : read('int32'),
         southeast: read('int32'),
         south    : read('int32'),
         southwest: read('int32'),
         west     : read('int32'),
         northwest: read('int32'),
         up       : read('int32'),
         down     : read('int32'),
         INN      : read('int32'),
         OUTT     : read('int32'),
         env      : read('int32'),
         weight   : read('int32'),
    }
    var name  = readString(datum)
    var isLocked = read('int8')

    // Other
    var otherL = read('uint32')
    var otherK = {}
    if (otherL > 0) {
      for (var j = 0; j < otherL; j++) {
        var key = read('uint32')
        var val = readString(datum)
        otherK[key] = val
      }
    }
    
    // mSymbol === QString
    var mSymbolL = read('int32') // can't do single line because this evaluates to -1...
    var mSymbol = ''
    if (mSymbolL > 0) { 
      __debug('mSymbol encountered while parsing room ' + roomid + '.', 6)
      mSymbol = decode(grab(datum, mSymbolL))
    }

    // userData === QMap<QString, QString>
    var userDataL = read('int32')
    var userData = {}
    for (var j = 0; j < userDataL; j++) {
      var key = readString(datum)
      var val = readString(datum)
      userData[key] = val
    }
    __debug(userData, 8)

    // customLines === QMap<QString, QList<QPointF>>
    var customLinesL = read('int32')
    var customLines  = {}
    if (customLinesL > 0) {
      __debug('customLines encountered while parsing room ' + roomid + '.', 6)
      for (var j = 0; j < customLinesL; j++) {
        var key = readString(datum)
        customLines[key] = []
        var count = read('uint32')
        for (var k = 0; k < count; k++) {
          customLines[key].push([read('float'),read('float')])
        }
      }
      __debug(customLines, 7)
    }
    // customLinesArrow === QMap<QString, bool>
    var customLinesArrowL = read('int32')
    var customLinesArrow  = {}
    if (customLinesArrowL > 0) {
      __debug('customLinesArrow encountered while parsing room ' + roomid + '. Count = ' + customLinesArrowL, 6)
      for (var j = 0; j < customLinesArrowL; j++) {
        var key = readString(datum)
        var dir = read('int8')
        customLinesArrow[key] = dir
      }
      __debug(customLinesArrow, 7)
    }
    // customLinesColor === QMap<QString, QColor>
    var customLinesColorL = read('int32')
    var customLinesColor  = {}
    if (customLinesColorL > 0) {
      __debug('customLinesColor encountered while parsing room ' + roomid + '. Count = ' + customLinesColorL, 6)
      for (var j = 0; j < customLinesColorL; j++) {
        var key = readString(datum)
        var chan = 257
        customLinesColor[key] = {
          spec : read('int8'),
          alpha: read('uint16') / chan, 
          red  : read('uint16') / chan, 
          green: read('uint16') / chan, 
          blue : read('uint16') / chan, 
          pad  : read('uint16') / chan,
        }
      }
      __debug(customLinesColor, 7)
    }
    // customLinesStyle === QMap<QString, Qt::PenStyle>  ** uint8, uint16, QColor (style, width, color)
    var customLinesStyleL = read('int32')
    var customLinesStyle  = {}
    if (customLinesStyleL > 0) {
      __debug('customLinesStyle encountered while parsing room ' + roomid + '. Count = ' + customLinesStyleL, 6)
      for (var j = 0; j < customLinesStyleL; j++) {
        var key = readString(datum)
        var r = read('int16')
        var s = read('int8')
        var lineStyle = read('int8')
        customLinesStyle[key] = [lineStyle, r, s]
// console.log(read('int8'))
      }
      __debug(customLinesStyle, 3)
    }

    // exitLocks === QList<int>
    var exitLocksL = read('int32')
    var exitLocks  = []
    if (exitLocksL > 0) {
      __debug('exitLocks encountered while parsing room ' + roomid + '.', 6)
      for (var j = 0; j < exitLocksL; j++) {
        exitLocks.push(read('uint32'))
      }
      __debug(exitLocks, 3)
    }
    // exitStubs === QList<int>
    var exitStubsL = read('int32')
    var exitStubs  = []
    if (exitStubsL > 0) {
      __debug('exitStubs encountered while parsing room ' + roomid + '.', 6)
      for (var j = 0; j < exitStubsL; j++) {
        exitStubs.push(read('int32'))
      }
      __debug(exitStubs, 3)
    }
    // exitWeights === QMap<QString, int>
    var exitWeightsL = read('int32')
    var exitWeights  = []
    if (exitWeightsL > 0) {
      __debug('exitWeights encountered while parsing room ' + roomid + '.', 6)
      for (var j = 0; j < exitWeightsL; j++) {
        var key = readString(datum)
        var val = read('uint32')
        exitWeights.push([key, val])
      }
      __debug(exitWeights, 3)
    }
    // doors === QMap<QString, int>
    var doorsL = read('int32')
    var doors  = []
    if (doorsL > 0) {
      __debug('doors encountered while parsing room ' + roomid + '.', 6)
      for (var j = 0; j < doorsL; j++) {
        var key = readString(datum)
        var val = read('int32')
        doors.push([key, val])
      }
      __debug(doors, 3)
    }

    rooms[roomid] = {
       id: roomid, name: name, area: area, coords: {x: x, y: y, z: z}, dirs: dirs, 
       isLocked: isLocked,
       others: otherK,
       userData: userData,
       mSymbol : mSymbol,
       customLines     : customLines,
       customLinesArrow: customLinesArrow, 
       customLinesColor: customLinesColor,
       customLinesStyle: customLinesStyle,
       exitLocks       : exitLocks,
       exitStubs       : exitStubs,
       exitWeights     : exitWeights,
       doors           : doors,
    }
    __debug('Completed read of ' + roomid + ' in cycle ' + c + '. Next >> ', 4)
    c += 1
  }
  map.rooms = rooms

  // console.log(rooms)
  // console.log(decode(grab(datum, 133)))
  
  console.log('Map:')
  console.log('  Map Version is ' + map.version + '.')
  console.log('  Area Count: ' + map.areas.length + '.')
  var str = '  Some areas defined so far:'
  for (var i = 0; i < 15; i++) {
    let area = map.areas[i]
    str += ' ' + area.value + ' (' + area.key + '),'
  }

  return map
}

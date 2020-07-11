// replace Q.core.send when ready

talismans = (function(){
  var print     = Q.core.print
  var lpad      = Utilities.lpad
  var rpad      = Utilities.rpad
  
  var active    = false
  var cmd_list  = 'talisman pieces'
  var trg_more  = '\\[Type MORE if you wish to continue reading\\. \\(\\d+\\% shown\\)\\]'
  var trg_end   = '----------------------------------------------------------------------------------'
  var trg_head  = '^[ ]+(\\w+)dragonpieces'
  var trg_eachA = `^(?:B|P)[ ]+(\\d+)[ ]+a (\\w+) Dragon's (\\w+)[ ]+(\\d+)[ ]+Dragon[ ]+(\\w+)$`
  var trg_eachB = `^(?:B|P)[ ]+(\\d+)[ ]+a (\\w+) Dragon (\\w+)[ ]+(\\d+)[ ]+Dragon[ ]+(\\w+)$`
  var trg_eachC = `^(?:B|P)[ ]+(\\d+)[ ]+(\\w+) Dragon (leather)[ ]+(\\d+)[ ]+Dragon[ ]+(\\w+)$`
  var trg_eachD = `^(?:B|P)[ ]+(\\d+)[ ]+a (Black|Gold|Green) Dragon's (acid sac|brain stem|poison sac)[ ]+(\\d+)[ ]+Dragon[ ]+(\\w+)$`

  var dragons   = ['Black','Blue','Gold','Green','Red','Silver']
  var pieces    = ['bone','claw','eye','heart','leather','tooth','scale','special']
  var specials  = {Black: 'acid sac', Blue: 'lung', Gold: 'brain stem', Green: 'poison sac', Red: 'belly', Silver: 'larynx'}
  var inventory = {}
  
  var setup = function() {
    dataset()
    
    active = true
    Triggers.make(trg_more, `if (talismans.active()) { Q.core.send("more") }`, 'talismans.more')
    Triggers.make(trg_end,  `if (talismans.active()) { console.log(talismans.data()) }`, 'talismans.off') // talismans.active(false); Triggers.deactivate("talismans.more"); 
    Triggers.make(trg_head, `console.log(matches)`, 'talismans.header')
    Triggers.make(trg_eachA, `talismans.parse(matches)`, 'talismans.line') // console.log(matches); 
    Triggers.make(trg_eachB, `talismans.parse(matches)`, 'talismans.line')
    Triggers.make(trg_eachC, `talismans.parse(matches)`, 'talismans.line')
    Triggers.make(trg_eachD, `talismans.parse(matches)`, 'talismans.line')
  
    var inject = function(rule) { $('body').append('<div class="tls-rules">&shy;<style>' + rule + '</style></div>') }
    if ( $('.tls-rules').length ) { $('.tls-rules').remove() }
    inject('.BlackDragon   { color: rgba(165,175,185,1); }')
    inject('.BlackDragon   { color: rgba(165,175,185,1); }')
    inject('.BlueDragon    { color: rgba(135,165,210,1); }')
    inject('.GoldDragon    { color: rgba(180,165, 85,1); }')
    inject('.GreenDragon   { color: rgba(155,185, 85,1); }')
    inject('.RedDragon     { color: rgba(200, 25, 25,1); }')
    inject('.SilverDragon  { color: rgba(140,140,140,1); }')
  }
  
  var dataset = function() {
    for (var type in specials) {
      inventory[type] = {}
      for (var i = 0; i < pieces.length; i++) {
        var piece = pieces[i]
        var special = false
        if (piece == 'special') { piece = specials[type]; special = true; }
        inventory[type][piece] = {}
        if (special) {
          for (var j = 1; j < 4; j++) { inventory[type][piece]['L'+j] = 0 }
        } else {
          for (var j = 1; j < 8; j++) { inventory[type][piece]['L'+j] = 0 }
        }
      }
    }
  }
  
  var parse = function(m) {
    var t = {}
    t.count = m[1]
    t.type  = m[2]
    t.piece = m[3]
    t.level = m[4]
    inventory[t.type] = inventory[t.type] || {}
    inventory[t.type][t.piece] = inventory[t.type][t.piece] || {}
    inventory[t.type][t.piece]['L'+t.level] = parseInt(t.count)
  }
  
  var write = function() {
    var str = '<span class="QO-line mute">'
        str += rpad('', 30) + ' '
        str += 'L1    '
        str += 'L2    '
        str += 'L3    '
        str += 'L4    '
        str += 'L5    '
        str += 'L6    '
        str += 'L7    '
        str += '</span>\n<span class="QO-line mute">' + rpad('+',83,'-') + '+</span>'
    for (var k in inventory) {
      for (var n in inventory[k]) {
        str += '\n'
        str += '<span class="QO-line mute">|<span class="' + k + 'Dragon"> ' + rpad(lpad(k, 7) + ' Dragon ' + n, 28) + '</span>'
        var sum = 0
        var special = false
        for (var v in specials) { var e = specials[v]; if (e == n) { special = true } }
        for (var o in inventory[k][n]) {
          var count = inventory[k][n][o]
          var rank  = parseInt(o.replace('L',''))
          sum += count * Math.pow(2, rank - 1)
          if (count != 0) { str += '<span class="' + k + 'Dragon">' }
          str += rpad('  ' + count, 6)
          if (count != 0) { str += '</span>' }
        }
        if (special) {
          str += rpad('', 25) + '  <span class="' + k + 'Dragon">' + lpad(sum, 2, ' ') + '</span> / 4 '
        } else {
          str += '  <span class="' + k + 'Dragon">' + lpad(sum, 3, ' ') + '</span> / 64'
        }
        str += ' |</span></span>'
      }
    }
    str += '\n<span class="QO-line mute">' + rpad('+',83,'-') + '+</span>'
    // console.log(str)
    print(str)
    fastdom.measure(function() { var h = document.getElementById('output').scrollHeight;
      fastdom.mutate(function() { $('#output').scrollTop(h) })
    })
  }
  
  var activate = function(v) { if (typeof v != 'undefined') { active = v }; return active }

  return {
    active: activate,
    parse : parse,
    setup : setup,
    write : write,
    data  : function() { return inventory },
  }
})()

talismans.setup()

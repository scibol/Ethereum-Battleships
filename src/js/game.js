App = {
  web3Provider: null,
  contracts: {},
  moves: 1,
  turn: 0,
  currentShip: {},
  grid: [],
  gridCommitment: [],
  fleet: [0, 0, 0, 0, 0],
  fleetCommitment: [],
  crypto: window.library,
  instance: null,
  account: null,
  myFleet: null,
  randoms: [],
  mr: null,
  lastMove: null,
  nOfPlayers: 0,

  init: function() {
    App.initGrid();
    return App.initWeb3();
  },

  initGrid: function() {

    for (let index = 0; index < 100; index++) {
      App.grid.push(0)
    }
  },

  initGridShips: function() {
    let secret;
    let nonce;

    if (localStorage.getItem('PRESENTATION')) {
      secret = localStorage.getItem('secret')
      nonce = localStorage.getItem('nonce')
    } else {
      secret = $('#secret').val()
      nonce = $('#nonce').val()
    }

    localStorage.setItem('nonce', nonce)
    localStorage.setItem('secret', secret)

    App.randoms = App.generateCommitments(secret, nonce)

    const el = App.gridCommitment.map(e => App.crypto.hexToBuf(e, 'hex'))

    App.mr = App.crypto.bufToHex(App.crypto.merkleRoot(el, false)).substring(2)

  },

  reInitGridShips: function() {
    let secret;
    let nonce;

    if (localStorage.getItem('PRESENTATION')) {
      secret = localStorage.getItem('secret')
      nonce = localStorage.getItem('nonce')
    } else {
      secret = $('#secret').val()
      nonce = $('#nonce').val()
    }



    App.randoms = App.generateCommitments(secret, nonce)

    const el = App.gridCommitment.map(e => App.crypto.hexToBuf(e, 'hex'))

    App.mr = App.crypto.bufToHex(App.crypto.merkleRoot(el, false)).substring(2)

    for (let index = 0; index < App.gridCommitment.length; index++) {
      if (App.myFleet.includes(App.gridCommitment[index])) {
        if (index > 9) {
          $('#game-grid-1').find('tr').eq(App.getDigit(index, 0)).find('td').eq(App.getDigit(index, 1)).css('background-color', 'green')
        } else {
          $('#game-grid-1').find('tr').eq(1).find('td').eq(index + 1).css('background-color', 'green')
        }
      }
    }

    $('#secret').addClass('hidden')
    $('#nonce').addClass('hidden')
    $('#reinit-grid').addClass('hidden')
  },

  initTurn: function() {
    App.contracts.Battleship.deployed().then(function(instance) {
      battleshipInstance = instance;
      return battleshipInstance.getPlayerTurn()
    }).then(function(result) {
      return App.changeTurn(result)
    })
  },

  changeTurn: function(address) {
    if(address == '0x0000000000000000000000000000000000000000') {
      return
    }

    App.turn = address

    if (App.account == address) {
      $('#me').addClass('turn')
      $('#opponent').removeClass('turn')
    } else {
      $('#opponent').addClass('turn')
      $('#me').removeClass('turn')
    }
  },

  getDigit: function(number, idx) {
    if (number > 9) return parseInt(number.toString()[idx]) + 1;
  },

  getDigit2: function(number, idx) {
    let p = parseInt(number.toString()[idx])
    if (p == 0) return 10
    return p
  },

  initContract: function() {
    $.getJSON(`Battleship.json`, function(data) {
      // Read the compilied contract which is in JSON file, then get access to the compiled code by utilising the TruffleContract method.
      const BattleshipArtifact = data;
      App.contracts.Battleship = TruffleContract(BattleshipArtifact);

      // Set the provider for our contract
      App.contracts.Battleship.setProvider(App.web3Provider);

      App.initTurn()

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }

        App.account = accounts[0];


        App.contracts.Battleship.deployed().then(function(instance) {
          battleshipInstance = instance;
          battleshipInstance.PlayerInit({}, {
            fromBlock: 0,
            toBlock: 'latest'
          }).get((error, eventResult) => {
            if (error) return;
            else {
              App.nOfPlayers = eventResult.length;
              const myEvents = eventResult.filter(e => e.args.addr == App.account)
              if (myEvents.length > 0) {
                App.myFleet = myEvents[0].args.f;
                $('#fleet-select').addClass('hidden')
                $('#start-game').addClass('hidden')
                $('#reinit-grid').removeClass('hidden')
                $('#init-grid').addClass('hidden')
                $('#game-grid-2').removeClass('disabled-table')
                App.reInitGridShips()
              }
              if (eventResult.length == 2 && myEvents.length == 0) {
                swal(
                  'Game is already initialized!',
                  'You can\' join the game, 2 players are already playing.',
                  'info'
                )
              }
              if (eventResult.length == 1) {
                $('.panel-body').append("Waiting for another player to join ...")
              }
              if (eventResult.length == 2) {
                $('.panel-body').append("Waiting for first move!")
              }
            }
          })

          battleshipInstance.NextMove({}, {
            fromBlock: 'latest',
          }).watch((error, eventResult) => {


            if (error) console.log(error)
            App.moves = ++eventResult.length
            const myMoves = eventResult.args.nextPlayer != App.account ? [eventResult.args] : []
            const opponentMoves = eventResult.args.nextPlayer == App.account ? [eventResult.args] : []


            for (var i = 0; i < opponentMoves.length; i++) {
              if (opponentMoves[i].cell.c[0] == 100) {
                $('#game-grid-1').find('tr').eq(10).find('td').eq(10).css('background-color', 'yellow')
              } else if (opponentMoves[i].cell.c[0] > 9) {
                if(opponentMoves[i].cell.c[0] % 10 == 0) {
                    $('#game-grid-1').find('tr').eq(App.getDigit2(opponentMoves[i].cell.c[0], 0)).find('td').eq(App.getDigit2(opponentMoves[i].cell.c[0], 1)).css('background-color', 'yellow')
                } else {
                    $('#game-grid-1').find('tr').eq(App.getDigit2(opponentMoves[i].cell.c[0], 0) + 1).find('td').eq(App.getDigit2(opponentMoves[i].cell.c[0], 1)).css('background-color', 'yellow')
                }
              } else {
                $('#game-grid-1').find('tr').eq(1).find('td').eq(opponentMoves[i].cell.c[0]).css('background-color', 'yellow')
              }
            }

            for (var i = 0; i < myMoves.length; i++) {
              if (myMoves[i].cell.c[0] == 100) {
                $('#game-grid-2').find('tr').eq(10).find('td').eq(10).css('background-color', 'yellow')
              } else if (myMoves[i].cell.c[0] > 9) {
                if(myMoves[i].cell.c[0] % 10 == 0) {
                    $('#game-grid-2').find('tr').eq(App.getDigit2(myMoves[i].cell.c[0], 0)).find('td').eq(App.getDigit2(myMoves[i].cell.c[0], 1)).css('background-color', 'yellow')
                } else {
                    $('#game-grid-2').find('tr').eq(App.getDigit2(myMoves[i].cell.c[0], 0) + 1).find('td').eq(App.getDigit2(myMoves[i].cell.c[0], 1)).css('background-color', 'yellow')
                }
              } else {
                $('#game-grid-2').find('tr').eq(1).find('td').eq(myMoves[i].cell.c[0]).css('background-color', 'yellow')
              }
            }
            if (opponentMoves[opponentMoves.length - 1] != undefined) App.lastMove = opponentMoves[opponentMoves.length - 1].cell.c[0]
          })
        }).then(_ => {
          return App.initTurn()
        }).then(_ => {
          battleshipInstance.NextMove({}, {
            fromBlock: 0,
            toBlock: 'latest'
          }).get((error, eventResult) => {
            console.log(eventResult)
            if (error) console.log(error)
            App.moves = ++eventResult.length
            const myMoves = eventResult.filter(e => e.args.nextPlayer != App.account)
            const opponentMoves = eventResult.filter(e => e.args.nextPlayer == App.account)


            for (var i = 0; i < opponentMoves.length; i++) {
              if (opponentMoves[i].args.cell.c[0] == 100) {
                $('#game-grid-1').find('tr').eq(10).find('td').eq(10).css('background-color', 'yellow')
              } else if (opponentMoves[i].args.cell.c[0] > 9) {
                if(opponentMoves[i].args.cell.c[0] % 10 == 0) {
                    $('#game-grid-1').find('tr').eq(App.getDigit2(opponentMoves[i].args.cell.c[0], 0)).find('td').eq(App.getDigit2(opponentMoves[i].args.cell.c[0], 1)).css('background-color', 'yellow')
                } else {
                    $('#game-grid-1').find('tr').eq(App.getDigit2(opponentMoves[i].args.cell.c[0], 0) + 1).find('td').eq(App.getDigit2(opponentMoves[i].args.cell.c[0], 1)).css('background-color', 'yellow')
                }
              } else {
                $('#game-grid-1').find('tr').eq(1).find('td').eq(opponentMoves[i].args.cell.c[0]).css('background-color', 'yellow')
              }
            }

            for (var i = 0; i < myMoves.length; i++) {
              if (myMoves[i].args.cell.c[0] == 100) {
                $('#game-grid-2').find('tr').eq(10).find('td').eq(10).css('background-color', 'yellow')
              } else if (myMoves[i].args.cell.c[0] > 9) {
                if(myMoves[i].args.cell.c[0] % 10 == 0) {
                    $('#game-grid-2').find('tr').eq(App.getDigit2(myMoves[i].args.cell.c[0], 0)).find('td').eq(App.getDigit2(myMoves[i].args.cell.c[0], 1)).css('background-color', 'yellow')
                } else {
                    $('#game-grid-2').find('tr').eq(App.getDigit2(myMoves[i].args.cell.c[0], 0) + 1).find('td').eq(App.getDigit2(myMoves[i].args.cell.c[0], 1)).css('background-color', 'yellow')
                }
              } else {
                $('#game-grid-2').find('tr').eq(1).find('td').eq(myMoves[i].args.cell.c[0]).css('background-color', 'yellow')
              }
            }
            if (opponentMoves[opponentMoves.length - 1] != undefined) App.lastMove = opponentMoves[opponentMoves.length - 1].args.cell.c[0]
          })
        });
      })
      return App.bindEvents()
    })
  },


  initBattleshipPlayer: function() {

    // create merkleTree
    const el = App.gridCommitment.map(e => App.crypto.hexToBuf(e, 'hex'))

    const mr = App.crypto.bufToHex(App.crypto.merkleRoot(el, false)).substring(2)

    const fc = App.fleetCommitment


    let battleshipInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function(instance) {
        battleshipInstance = instance;
        return battleshipInstance.initPlayer('0x' + mr, '0x' + fc.join(''), fc.map(e => '0x' + e), {
          from: account
        })
      }).then(function(result) {
        battleshipInstance.PlayerInit().watch((err, response) => {
          if (response.args.n.c[0] == 1) {
            swal({
              title: "Player initialized",
              text: "Your grid have been initialized! Waiting for player 2 ...",
              icon: "success",
            })

          } else {
            swal({
              title: "Player initialized",
              text: "Your grid have been initialized! Waiting for first move ...",
              icon: "success",
            })
          }
          App.myFleet = response.args.f;
          $('#fleet-select').addClass('hidden')
          $('#start-game').addClass('hidden')
          $('#reinit-grid').removeClass('hidden')
          $('#init-grid').addClass('hidden')
          $('#game-grid-2').removeClass('disabled-table')
          // App.reInitGridShips()
        });
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  initWeb3: function() {
    // Is there is an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:9545');
    }

    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  shoot: function() {
    if (App.nOfPlayers != 2) return;
    var col = $(this).parent().children().index($(this));
    var row = $(this).parent().parent().children().index($(this).parent());
    // dont hit first row or first column
    if (row == 0 || col == 0) return false

    const cell = row * 10 + col - 10;


    // MAKE TRANSACTION AND DRAW A CROSS

    App.contracts.Battleship.deployed().then(function(instance) {
      battleshipInstance = instance;
      if (App.moves == 1) {
        return battleshipInstance.play(cell - 1, '0x', '0x', {
          from: App.account
        })
      } else {

        const el = App.gridCommitment.map(e => App.crypto.hexToBuf(e, 'hex'))

        const mr = App.crypto.MerkleTree(el, false)

        const proof = mr.getProof(el[App.lastMove])

        const proofHex = proof.map(e => e.toString('hex')).join('')


        return battleshipInstance.play(cell - 1, '0x' + App.randoms[App.lastMove], '0x' + proofHex, {
          from: App.account
        })
      }
    }).then(res => {
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  receiveShoot: function(col, row, hit) {
    App.logReceivedEvent(col, row);
    App.logReceivedShoot(hit);

    element = $('#game-grid-1')
    element.find('tr').eq(row).find('td').eq(col).addClass('crossed')
  },

  drawCross: function(col, row) {
    element = $('#game-grid-2')
    element.find('tr').eq(row).find('td').eq(col).addClass('crossed')

  },

  hitShip: function(col, row) {
    element = $('#game-grid-2')
    element.find('tr').eq(row).find('td').eq(col).addClass('crossed').css('background-color', 'green')
  },


  bindEvents: function() {
    $('.ship').on('click', App.setupShip)
    $('#fleet-rotate').on('click', App.rotateShip)
    $('#game-grid-1 td').on('click', App.colorCells)
    $('#game-grid-2').find('td').on('click', App.shoot)
    $('#init-grid').on('click', App.initGridShips)
    $('#start-game').on('click', App.initBattleshipPlayer)
    $('#reinit-grid').on('click', App.reInitGridShips)
  },

  logReceivedEvent: function(col, row, hit) {
    cell = App.numToLet(row) + col;
    result = App.hitToStr(hit);
    toWrite = "<p> Turn " + App.moves + '. Your opponent shot <b>' + cell + "</b></p>"
    $('.panel-body').prepend(toWrite)
  },

  logReceivedShoot: function(hit) {
    result = App.hitToStr(hit);
    $('.panel-body').find("p").first().append(' and he <b>' + result + "</b></br>")
  },

  logEvent: function(col, row, hit) {
    cell = App.numToLet(row) + col;
    result = App.hitToStr(hit);
    toWrite = "<p> Turn " + App.moves + '. You shot <b>' + cell + "</b></p>"
    $('.panel-body').prepend(toWrite)
  },

  logEventShoot: function(hit) {
    result = App.hitToStr(hit);
    $('.panel-body').find("p").first().append(' and you <b>' + result + "</b></br>")
  },

  generateCommitments: function(_secret, _nonce) {
    const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']


    const nonce = _nonce;
    const secret = _secret;

    App.gridCommitment = App.grid.map(function(cell, index) {
      return parseInt(index);
    })



    let randoms = []
    let nonces = []
    let last = web3.sha3(nonce)
    hashSecret = web3.sha3(secret).substring(2)

    // create all the nonces
    for (let index = 0; index < 100; index++) {
      nonces.push(last.substring(2))
      randoms.push(web3.sha3(hashSecret + nonces[index]).substring(2))
      last = web3.sha3(nonces[index])
    }

    for (let index = 0; index < App.gridCommitment.length; index++) {
      App.gridCommitment[index] = App.keccak256(parseInt(App.gridCommitment[index]), randoms[index]);
    }

    App.fleetCommitment = App.grid.map(function(e, index) {
      if (e == 1) return App.gridCommitment[index]
    }).filter(e => e != undefined)

    return randoms;

  },

  padding_right: function(s, c, n) {
    if (!s || !c || s.length >= n) {
      return s;
    }
    var max = (n - s.length) / c.length;
    for (var i = 0; i < max; i++) {
      s += c;
    }
    return s;
  },

  keccak256: function(...args) {
    args = args.map(arg => {
      if (typeof arg === 'string') {
        if (arg.substring(0, 2) === '0x') {
          return arg.slice(2)
        } else {
          return arg
        }
      }

      if (typeof arg === 'number') {
        return App.leftPad((arg).toString(16), 2, 0)
      } else {
        return ''
      }
    })

    args = App.padding_right(args.join(''), 32, 0)
    return web3.sha3(args, {
      encoding: 'hex'
    }).substring(2)
  },

  leftPad: function(str, len, ch) {
    str = String(str);
    var i = -1;
    if (!ch && ch !== 0) ch = ' ';
    len = len - str.length;
    while (++i < len) {
      str = ch + str;
    }
    return str;
  },

  hitToStr: function(hit) {
    switch (hit) {
      case true:
        return "HIT A SHIP!"
        break;
      case false:
        return "MISSED!"
        break;
    }
  },

  numToLet: function(number) {
    switch (number) {
      case 1:
        return "A"
        break;
      case 2:
        return "B"
        break;
      case 3:
        return "C"
        break;
      case 4:
        return "D"
        break;
      case 5:
        return "E"
        break;
      case 6:
        return "F"
        break;
      case 7:
        return "G"
        break;
      case 8:
        return "H"
        break;
      case 9:
        return "I"
        break;
      case 10:
        return "J"
        break;
    }
  },

  setupShip: function() {
    const self = $(this)
    App.currentShip = App.getShip(self)
  },

  getShip: function(self) {
    if (self.hasClass('btn-success')) {
      // disable placing selected ship
      $('.btn').removeClass('btn-success')
      return {}
    } else {
      // remove success style
      $('.btn').removeClass('btn-success')
      // add success style to selected btn
      self.addClass('btn-success')
      // get selected ship data
      const shipName = self.data('name')
      const shipLength = self.data('length')
      const direction = $('#fleet-rotate').data('direction')
      return {
        name: shipName,
        size: shipLength,
        direction: direction
      }
    }
  },

  rotateShip: function() {
    const directionNow = $(this).data('direction')
    const directionNew = directionNow == 1 ? 0 : 1
    $(this).data('direction', directionNew)
    const text = directionNew == 1 ? "Rotate: V" : "Rotate: H"
    $(this).text(text)
    if (App.currentShip != {}) App.currentShip.direction = directionNew;
  },

  colorCells: function() {
    var col = $(this).parent().children().index($(this));
    var row = $(this).parent().parent().children().index($(this).parent());
    i = 0;

    const idx = App.getShipIndex()

    if (!App.checkBoundaries(col, row, App.currentShip.direction, App.currentShip.size) ||
      !App.checkOverlap(col, row, App.currentShip.direction, App.currentShip.size) ||
      App.fleet[idx] > 0) return

    while (i < App.currentShip.size) {
      // horizontal
      App.setGridShip(col, row)
      if (App.currentShip.direction == 0) {
        $(this).parent().parent().parent().find('tr').eq(row).find('td').eq(col++).css('background-color', 'green')
      }
      // vertical
      else {
        $(this).parent().parent().parent().find('tr').eq(row++).find('td').eq(col).css('background-color', 'green')

      }
      i++;
    }
    $('*[data-name="' + App.currentShip.name + '"]').addClass('disabled')
    App.fleet[idx] = 1

    const canStartGame = App.checkStartGame();
    if (canStartGame == true) {
      $('#secret').attr('disabled', false)
      $('#nonce').attr('disabled', false)
    }
  },

  checkInput: function() {
    if ($('#secret').val().length > 5 && $('#nonce').val().length > 1) {
      $('#start-game').removeClass('disabled')
      $('#download-grid').removeClass('disabled')
    }
  },

  checkStartGame: function() {
    for (let index = 0; index < App.fleet.length; index++) {
      if (App.fleet[index] == 0) {
        return false;
      }
    }
    return true
  },

  checkBoundaries: function(col, row, direction, shipSize) {
    if (row == 0 || col == 0) return false
    if (direction == 0) {
      return shipSize + col < 12 ? true : false
    } else {
      return shipSize + row < 12 ? true : false
    }
  },

  checkOverlap: function(col, row, direction, shipSize) {
    col--
    row--
    if (direction == 0) {
      for (let index = 0; index < shipSize; index++) {
        if (App.grid[(row * 10) + col++] > 0) {
          return false;
        }
      }
    } else {
      for (let index = 0; index < shipSize; index++) {
        if (App.grid[(row++ * 10) + col] > 0) {
          return false;
        }
      }
    }
    return true
  },

  setGridShip: function(col, row) {
    App.grid[(--row * 10) + --col] = 1
  },

  getShipIndex: function() {
    switch (App.currentShip.name) {
      case 'carrier':
        return 0
        break;
      case 'battleship':
        return 1
        break;
      case 'cruiser':
        return 2
        break;
      case 'destroyer':
        return 3
        break;
      case 'frigate':
        return 4
        break;
    }
  },
};




$(function() {
  $(window).load(function() {
    App.init();
  });

  var account = web3.eth.accounts[0];
  var accountInterval = setInterval(function() {
    if (web3.eth.accounts[0] !== account) {
      account = web3.eth.accounts[0];
      location.reload();
    }
  }, 1500);

});

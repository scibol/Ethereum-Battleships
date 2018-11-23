App = {
  web3Provider: null,
  contracts: {},
  currentShip: {},
  grid: [],
  gridCommitment: [],
  fleet: [0, 0, 0, 0, 0],
  fleetCommitment: [],
  crypto: window.library,
  instance: null,
  account: null,

  init: function() {
    // App.bindEvents();
    App.initGrid();
    return App.initWeb3();
  },

  /**
   * Initialise Web3 instance.
   */
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

  /**
   * Loads the Battleship contract, using TruffleContract.
   */
  initContract: function() {
    $.getJSON(`Battleship.json`, function(data) {
      // Read the compilied contract which is in JSON file, then get access to the compiled code by utilising the TruffleContract method.
      const BattleshipArtifact = data;
      App.contracts.Battleship = TruffleContract(BattleshipArtifact);

      // Set the provider for our contract
      App.contracts.Battleship.setProvider(App.web3Provider);

      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }

        var account = accounts[0];


        App.contracts.Battleship.deployed().then(function(instance) {
          battleshipInstance = instance;

          const events = battleshipInstance.allEvents({ fromBlock: 0, toBlock: 'latest' })

          battleshipInstance.PlayerInit({}, { fromBlock: 0, toBlock: 'latest' }).get((error, eventResult) => {
            if (error) {
              console.log(err);
              return
            } else {
              const myEvents = eventResult.filter(e => e.args.addr == account)
              if(myEvents.length > 0) {
                if(window.location.href != "http://localhost:3000/game.html") window.location.href = '/game.html';
              } else {
                if(window.location.href != "http://localhost:3000/") window.location.href = '/';
              }
              if(eventResult.length == 2 && myEvents.length == 0) {
                swal(
                    'Game is already initialized!',
                    'You can\' join the game, 2 players are already playing.',
                    'info'
                  )
              }
            }
          });
        }).catch(function(err) {
          console.log(err.message);
        });
      });

      return App.bindEvents()
    })
  },

  generateCommitments: function() {
    const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

    const nonce = $('#nonce').val()
    const secret = $('#secret').val()

    // localStorage.setItem("nonce", nonce);
    // localStorage.setItem("secret", secret);

    App.gridCommitment = App.grid.map(function(cell, index) {
      return rows[Math.floor(index / 10)] + columns[index % 10];
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

  initBattleshipPlayer: function(adopters, account) {

    const nonces = App.generateCommitments()

    // localStorage.setItem("gridCommitment", App.gridCommitment);
    // localStorage.setItem("fleetCommitment", App.fleetCommitment);
    // localStorage.setItem("nonces", nonces);
    // localStorage.setItem("grid", JSON.stringify(App.grid));

    const text = JSON.stringify({
      secret: $('#secret').val(),
      nonce: $('#nonce').val(),
      nonces: nonces,
      grid: App.gridCommitment,
      fleet: App.fleetCommitment
    }, null, 2)

    var a = document.getElementById("download-grid");
    var file = new Blob([text], {
      type: 'text/plain'
    });
    a.href = URL.createObjectURL(file);
    a.download = 'Battleship_private_data';

    // create merkleTree
    const el = App.gridCommitment.map(e => App.crypto.hexToBuf(e, 'hex'))

    const mr = App.crypto.bufToHex(App.crypto.merkleRoot(el, false)).substring(2)

    const fc = App.fleetCommitment.join('')

    let battleshipInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      App.contracts.Battleship.deployed().then(function(instance) {
        battleshipInstance = instance;

        return battleshipInstance.initPlayer('0x' + mr, '0x' + fc, {
          from: account
        })
      }).then(function(result) {
        battleshipInstance.PlayerInit().watch((err, response) => {  //set up listener for the AuctionClosed Event
          if(response.args.n.c[0] == 1) {
            swal({
              title: "Player initialized",
              text: "Your grid have been initialized! Waiting for player 2 ...",
              icon: "success",
            })
            .then((res) => {
              window.location.href = "http://localhost:3000/game.html"
            })
          } else {
            swal({
              title: "Player initialized",
              text: "Your grid have been initialized! Waiting for first move ...",
              icon: "success",
            })
            .then((res) => {
              window.location.href = "http://localhost:3000/game.html"
            });
          }
        });
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  initGrid: function(size = 10) {
    for (let index = 0; index < size * size; index++) {
      App.grid.push(0)
    }
  },

  bindEvents: function() {
    $('.ship').on('click', App.setupShip)
    $('#fleet-rotate').on('click', App.rotateShip)
    $('td').on('click', App.colorCells)
    $('#nonce').on('keyup', App.checkInput)
    $('#secret').on('keyup', App.checkInput)
    $('#start-game').on('click', App.initBattleshipPlayer)
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

    var account = web3.eth.accounts[0];
    var accountInterval = setInterval(function() {
      if (web3.eth.accounts[0] !== account) {
        account = web3.eth.accounts[0];
        location.reload();
      }
    }, 1500);


  });

});

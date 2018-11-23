pragma solidity ^0.4.0;

contract Battleship {

    struct Player {
        bytes32 cc;
        bytes32[17] fleet;
        bytes fleetString;
        uint[17] fleetPlainText;
        uint8 points;
        address addr;
        bool reset;
    }

    Player[2] players;

    uint stake;
    uint8 nOfPlayers = 0;
    uint8 turn;
    uint8 lastMove = 2;

    event LogFleet(bytes32 one, bytes32 two, bytes32 three, bytes32 tour, bytes32 five, bytes32 six, bytes32 seven);
    event Log(bytes a);
    event Log(uint a);
    event Log(bytes32 a);
    event Log(bytes32 a, uint8 m);
    event Log(bytes a, bytes32 b, bytes32 c);
    event Log(uint a, uint b, uint c);
    event Log(bool a);
    event Log(bytes32[17] a);

    event PlayerInit(address addr, uint8 n, bytes32 mr, bytes f);
    event PlayerInit(address addr, uint8 n, bytes32 mr, bytes32[17] f);
    event NextMove(uint cell, address nextPlayer, uint8 t, bool b, bytes32 c);
    event hasHit(uint cell, bool proof);
    event isCheating(bytes proof, bytes32 root, uint cell, bytes32 nonce, bytes32 commitment, address player);

    modifier canJoin(bytes32 _cc, bytes _f, uint _s) {
        // only 2 player are allowed
        require(nOfPlayers < 2);
        // cc must be 32 bytes long (merkle root)
        require(_cc.length == 32);
        // fleet commitment must be 576 bytes long
        require(_f.length == 544);
        // check if there are enough money at stake
        /*require(_s >= 100 finney);*/
        _;
    }

    modifier isGameInitialized() {
        // check if game is started
        require(nOfPlayers == 2);
        _;
    }

    modifier isPlayerTurn(address _addr) {
        // check if game is started
        require(players[turn].addr == _addr);
        _;
    }

    modifier isValidIndex(uint8 idx) {
        // check if idx >=0 && <= 17
        require(idx >= 0 && idx <= 17);
        _;
    }

    function getPlayerTurn() public view returns(address) {
      return players[turn].addr;
    }

    function initPlayer(bytes32 _cc, bytes _fleet, bytes32[17] _f) canJoin(_cc, _fleet, msg.value) external payable {
        // create a new player
        players[nOfPlayers] = Player(_cc, _f, _fleet , newUintArray(), 17, msg.sender, false);

        deserializeFleet(players[nOfPlayers], _fleet);

        Log(players[nOfPlayers].fleet[0]);
        Log(players[nOfPlayers].fleet[1]);
        Log(players[nOfPlayers].fleet[2]);
        Log(players[nOfPlayers].fleet[15]);
        Log(players[nOfPlayers].fleet[16]);


        // increment the players counter
        nOfPlayers++;

        // add eth sended as prize pool
        stake += msg.value;
        // send event
        PlayerInit(msg.sender, nOfPlayers, _cc, _fleet);
    }

    function newUintArray() internal pure returns(uint[17]) {
        return [uint(0), uint(0), uint(0), uint(0), uint(0), uint(0), uint(0), uint(0), uint(0), uint(0),
        uint(0), uint(0), uint(0), uint(0), uint(0), uint(0), uint(0)];
    }

    function newBytes32Array() internal pure returns(bytes32[17]) {
        return [bytes32(0), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    function deserializeFleet(Player storage p, bytes fleet) internal returns (bytes32[17]) {
        // fleet is a string of 18 concatenated commitments of 32 bytes, split and store

        bytes32[17] memory f;

        assembly {
            f := msize()
            mstore(add(f, 0x00), mload(add(fleet, 0x20)))
            mstore(add(f, 0x20), mload(add(fleet, 0x40)))
            mstore(add(f, 0x40), mload(add(fleet, 0x60)))
            mstore(add(f, 0x60), mload(add(fleet, 0x80)))
            mstore(add(f, 0x80), mload(add(fleet, 0xA0)))
            mstore(add(f, 0xA0), mload(add(fleet, 0xC0)))
            mstore(add(f, 0xC0), mload(add(fleet, 0xE0)))
            mstore(add(f, 0xE0), mload(add(fleet, 0x100)))
            mstore(add(f, 0x100), mload(add(fleet, 0x120)))
            mstore(add(f, 0x120), mload(add(fleet, 0x140)))
            mstore(add(f, 0x140), mload(add(fleet, 0x160)))
            mstore(add(f, 0x160), mload(add(fleet, 0x180)))
            mstore(add(f, 0x180), mload(add(fleet, 0x1A0)))
            mstore(add(f, 0x1A0), mload(add(fleet, 0x1C0)))
            mstore(add(f, 0x1C0), mload(add(fleet, 0x1E0)))
            mstore(add(f, 0x1E0), mload(add(fleet, 0x200)))
            mstore(add(f, 0x200), mload(add(fleet, 0x220)))
        }
        Log(f[0]);
        Log(f[16]);

        Log(f.length);

        // for (uint256 i = 0; i < f.length; i++) {
        //     p.fleet[i] = f[i];
        // }

        return f;
    }

    function play(uint8 cell, bytes32 nonce, bytes proof) isPlayerTurn(msg.sender) isGameInitialized() external returns(bool) {
        bool hit = false;
        uint256 index = 0;
        bytes32 commitment;
        if(isFirstTurn()) {
            updateLastMove(cell);
        } else {
            commitment = computeCellCommitment(lastMove, nonce);
            // TODO: if trying to cheat send money to the other player
            if(!checkProof(proof, players[turn].cc, commitment)) {
            //     transferPrizePool();
                isCheating(proof, players[turn].cc, cell, nonce, commitment, players[turn].addr);
            //     // TODO: finish game
            } else {
            //     Log(commitment);
            //     // check if a ship has been hit
                (hit, index) = isHit(commitment, lastMove);
            //     // send event with hit result
                // hasHit(lastMove, hit);
            //     // TODO: check if ships cells are adjacent
            //     // if(hit) areCellsAdjacent(index);
            //     // update lastMove
            updateLastMove(cell);
            Log(commitment, lastMove);
            }
        }

        // change turn;
        turn = ++turn % 2;
        // event
        NextMove(cell, players[turn].addr, turn, hit, commitment);
        return hit;
    }

    // TODO: implement
    // function areCellsAdjacent(uint8 index) isValidIndex(index) internal view returns(bool) {
    //     if(index >= 0 && index <= 4) checkShipCellsAdjacent(0, 5);
    //     else if(index >= 5 && index <= 8) checkShipCellsAdjacent(5, 9);
    //     else if(index >= 9 && index <= 11) checkShipCellsAdjacent(9, 12);
    //     else if(index >= 12 && index <= 14) checkShipCellsAdjacent(12, 15);
    //     else checkShipCellsAdjacent(15, 17);
    // }

    // function checkShipCellsAdjacent(uint8 start, uint8 end) internal view returns(uint8) {
    //     // check if its vertifical of horizontal
    //     // 0 dont know, 1 horizontal, 2 vertical
    //     Player storage p = players[0].addr == msg.sender ? players[0] : players[1];
    //     uint8 direction = 0;
    //     bytes32 pivot = bytes32(0);
    //     bytes32 empty = keccak256(uint8(0));
    //     for (uint8 i = start; i <= end; i += 1) {
    //         if(keccak256(pivot) == empty && p.fleetPlainText[i] != empty) {
    //             pivot = p.fleetPlainText[i];
    //         } else if (keccak256(pivot) != empty && p.fleetPlainText[i] != empty && direction == 0) {
    //           // convert pivot to uint
    //           // if pivot + 1*i == cell --> direction = 1
    //           // if pivot + 10*i == cell --> direction = 10
    //         } else {

    //         }

    //     }
    // }

    function isHit(bytes32 commitment, uint8 cell) public returns(bool, uint256){
        // bytes32 el;

        Player storage p = players[0].addr == msg.sender ? players[0] : players[1];
        for (uint256 i = 0; i <= p.fleet.length; i += 1) {
            Log(commitment);
            Log(cell);

            if(keccak256(p.fleet[i]) == keccak256(commitment)) {
                // keep track of the cell by index
                Log(keccak256(p.fleet[i]));
                Log(keccak256(commitment));
                p.fleetPlainText[i] = cell;
                return (true, i);
            }
        }
        return (false, 0);
    }

    function isFirstTurn() internal view returns(bool) {
        return lastMove == 2;
    }

    function computeCellCommitment(uint8 cell, bytes32 nonce) internal pure returns(bytes32) {
        return keccak256(cell, nonce);
    }

    function updateLastMove(uint8 cell) internal {
        lastMove = cell;
    }

    function transferPrizePool() internal {
        // get the other player
        Player storage p = players[0].addr == msg.sender ? players[1] : players[0];
        // send stake
        p.addr.transfer(stake);
    }

    // https://github.com/ameensol/merkle-tree-solidity
    function checkProof(bytes proof, bytes32 root, bytes32 hash) pure internal returns (bool) {
        bytes32 el;
        bytes32 h = hash;

        for (uint256 i = 32; i <= proof.length; i += 32) {
            assembly {
                el := mload(add(proof, i))
            }

            if (h < el) {
                h = keccak256(h, el);
            } else {
                h = keccak256(el, h);
            }
        }

        return h == root;
    }

    function signalReset() external {
        Player storage p = players[0].addr == msg.sender ? players[0] : players[1];
        p.reset = true;
    }

    function resetGame() internal {
        // reset only if both player agree OR either one won
        if(arePlayersResetting() || arePlayersResetting()) revert();

        // delete old players statuses
        delete players[0];
        delete players[1];
        // reset player counter
        nOfPlayers = 0;
        // reset turn
        turn = 0;
    }

    function isGameEnded() internal view returns(bool){
        return players[0].points == 0 || players[1].points == 0;
    }

    function arePlayersResetting() internal view returns(bool) {
        return !players[0].reset || !players[1].reset;
    }
}

# Ethereum-Battleships

## Rules
Battleship is a guessing game for two players. It is played on ruled grids on which the players’ fleets of ships are marked. The locations of the fleet are concealed from the other player. Players alternate turns calling ”shots” at the other player’s ships, and the objective of the game is to destroy the opposing player’s fleet.

## Introduction 
The blockchain conveniently suits the needs of an application where, usually, both parties must rely on a third party service, like a usual server, and/or need to trust each other.
Battleship on Ethereum fixes both these problems by leveraging a smart contract that checks the transactions (moves) of the players.

## Design 
In addition to the usual routines, like placing the fleet on a grid, the smart contract should be designed such that it:
* hides the locations of the two fleets
* ensure that the two fleets are valid, i.e.
  1. the ships are inside the grid
  2. the ships are composed by adjacent cells 
  3. the ships are not overlapping
  4. the fleets are the same for both players
* correctly handle shots event with hit or miss replies in order to avoid cheating

## Implementation
First, we need to solve the problem of hiding the locations of the two fleets. This issue can be overcome by using a Naive Pedersen Commitment. Instead of publishing the grid as a list of cells the player sends `H(A1 || nonce)`, where nonce is the secret that opens the commitment, chosen by each player before starting the game.
Whenever a players shoots, the opponent publishes the nonce which opens the commitment. If it matches, then the player is sure his opponents did not cheat. Instead of having to generate 100 random nonces, one for each cell, a deterministic random generator is used to compute all the nonces of the grid using only the nonce and the secret that the player submits.
               `N(0) = H(secret || H(nonce))
                N(1) = H(secret || H(H(nonce)))`
and so on until N(100).
In order to ensure in real time that a player is not cheating by sending the wrong nonce, and also to save space in the smart contract, we decided to use a Merkle tree that stores the hashes of the cells as the leaf nodes of the tree. Then, the leaf nodes are hashed 2-by-2 up to the root. In this way, the smart contract proves that a cell is contained in the grid with O(log n) hashes (Membership Problem).

## Future works

Unfortunately, our smart contract cannot ensure that the ships are placed inside the grid. A malicious user could cheat by placing all his ships outside the grid. In this case, the smart contract would detect this behavior only after 83 moves (size of the grid - size of the fleet = 100 - 17 = 83).
A possible solution is to require the winner to reveal his fleet when the game ends, which is what is implemented in our smart contract.
A real time solution would imply more advanced cryptography algorithms, such as Pedersen Commitment on Elliptic Curve, where instead of committing to `H(cell || nonce)`, we change the commit to Gnonce · Hcell. Now that the commitments are on elliptic curve, we can use addition and multiplication to compute a Non Interactive Zero-Knowledge Range Proof (NIZK). This allows the other player to prove that the commitment lies inside the interval [a, b], without knowing the cell number and without exchanging any information with the other player.

var Battleship = artifacts.require("./Battleship.sol");

module.exports = function(deployer) {
  deployer.deploy(Battleship);
};

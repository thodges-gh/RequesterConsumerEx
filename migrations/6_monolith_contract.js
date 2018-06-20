var Monolith = artifacts.require("Monolith.sol");
var Oracle = artifacts.require("Oracle.sol");
var LinkToken = artifacts.require("LinkToken.sol");

module.exports = function(deployer) {
  deployer.deploy(Monolith, LinkToken.address, Oracle.address);
};
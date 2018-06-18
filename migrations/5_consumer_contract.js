var Consumer = artifacts.require("Consumer.sol");
var Oracle = artifacts.require("Oracle.sol");
var LinkToken = artifacts.require("LinkToken.sol");
var Requester = artifacts.require("Requester.sol");

module.exports = function(deployer) {
  deployer.deploy(Consumer, Oracle.address, LinkToken.address, Requester.address);
};
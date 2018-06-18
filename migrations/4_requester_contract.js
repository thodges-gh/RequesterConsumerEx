var Requester = artifacts.require("Requester.sol");
var Oracle = artifacts.require("Oracle.sol");
var LinkToken = artifacts.require("LinkToken.sol");

module.exports = function(deployer) {
  deployer.deploy(Requester, LinkToken.address, Oracle.address);
};

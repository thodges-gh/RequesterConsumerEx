pragma solidity ^0.4.23;

import "chainlink/solidity/contracts/Chainlinked.sol";

contract Monolith is Chainlinked, Ownable {

  uint256 public lastPrice;
  uint256 public lastPriceTimestamp;
  
  constructor(address _link, address _oracle) Ownable() public {
    setLinkToken(_link);
    setOracle(_oracle);
  }

  event RequestFulfilled(
    bytes32 requestId,
    uint256 price
  );
  
  function requestLastCryptoPrice() onlyOwner public {
    string[] memory tasks = new string[](5);
    tasks[0] = "httpget";
    tasks[1] = "jsonparse";
    tasks[2] = "multiply";
    tasks[3] = "ethuint256";
    tasks[4] = "ethtx";

    ChainlinkLib.Spec memory spec = newSpec(tasks, this, "fulfillLastPrice(bytes32,uint256)");
    spec.add("url", "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD");
    string[] memory path = new string[](1);
    path[0] = "USD";
    spec.addStringArray("path", path);
    spec.addInt("times", 100);
    chainlinkRequest(spec, LINK(1));
  }

  function fulfillLastPrice(bytes32 _requestId, uint256 _price)
    public
    checkChainlinkFulfillment(_requestId)
  {
    emit RequestFulfilled(_requestId, _price);
    lastPriceTimestamp = now;
    lastPrice = _price;
  }

  function withdrawLink() onlyOwner public {
    require(link.transfer(owner, link.balanceOf(address(this))));
  }
}
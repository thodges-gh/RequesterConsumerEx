pragma solidity ^0.4.23;

import "https://github.com/OpenZeppelin/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract Consumer is Ownable {

  address constant ROPSTEN_LINK_ADDRESS = 0x20fE562d797A42Dcb3399062AE9546cd06f63280;
  address constant ROPSTEN_ORACLE_ADDRESS = 0xcec1b9Cf49d76ABf21206bDa4b2055bA149b28E6;

  uint256 public lastPrice;
  uint256 public lastPriceTimestamp;

  mapping(bytes32 => bool) internal unfulfilledRequests;
  
  bytes4 constant LAST_PRICE_FID = bytes4(keccak256("lastCryptoPrice(string)"));

  address internal requester;
  address internal oracle;
  ILinkToken internal link;

  struct Request {
    bytes4 fid;
    string callback;
  }
  
  constructor(address _requester) public Ownable() {
    oracle = ROPSTEN_ORACLE_ADDRESS;
    link = ILinkToken(ROPSTEN_LINK_ADDRESS);
    requester = _requester;
  }

  event RequestFulfilled(
    bytes32 requestId,
    uint256 price
  );
  
  function requestLastCryptoPrice() public {
    Request memory self;
    self.fid = LAST_PRICE_FID;
    self.callback = "fulfillLastPrice(bytes32,uint256)";
    require(link.transferAndCall(requester, 1 ether, encodeData(self)));
  }
  
  function encodeData(Request req) internal pure returns (bytes data) {
    return abi.encodeWithSelector(req.fid, req.callback);
  }

  function updateRequestId(bytes32 _requestId) external onlyRequester {
    unfulfilledRequests[_requestId] = true;
  }

  function fulfillLastPrice(bytes32 _requestId, uint256 _price)
    public
    checkChainlinkFulfillment(_requestId)
  {
    emit RequestFulfilled(_requestId, _price);
    lastPriceTimestamp = now;
    lastPrice = _price;
  }

  function withdrawLink() public onlyOwner {
    require(link.transfer(owner, link.balanceOf(address(this))));
  }
  
  modifier checkChainlinkFulfillment(bytes32 _requestId) {
    require(msg.sender == oracle && unfulfilledRequests[_requestId]);
    _;
    unfulfilledRequests[_requestId] = false;
  }
  
  modifier onlyRequester() {
    require(msg.sender == requester);
    _;
  }
}

interface ILinkToken{
  function transferAndCall(address, uint, bytes) external returns (bool);
  function transfer(address, uint) external returns (bool);
  function balanceOf(address) external view returns (uint256);
}
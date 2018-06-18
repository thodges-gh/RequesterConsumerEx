pragma solidity ^0.4.23;

import "github.com/smartcontractkit/chainlink/solidity/contracts/Chainlinked.sol";

contract Requester is Chainlinked, Ownable {

  address constant ROPSTEN_LINK_ADDRESS = 0x20fE562d797A42Dcb3399062AE9546cd06f63280;
  address constant ROPSTEN_ORACLE_ADDRESS = 0xcec1b9Cf49d76ABf21206bDa4b2055bA149b28E6;

  IConsumer internal con;
  
  uint256 private currentAmount;
  address private currentSender;

  event RequestFulfilled(
    bytes32 indexed requestId,
    uint256 indexed price
  );

  constructor() Ownable() public {
    setLinkToken(ROPSTEN_LINK_ADDRESS);
    setOracle(ROPSTEN_ORACLE_ADDRESS);
  }

  function onTokenTransfer(
    address _sender,
    uint256 _wei,
    bytes _data
  )
    public
    onlyLINK
    isContract(_sender)
  {
    require(_data.length > 0);
    currentAmount = _wei;
    currentSender = _sender;
    require(address(this).delegatecall(_data));
  }

  function lastCryptoPrice(string _callback) public returns(bytes32) {
    string[] memory tasks = new string[](5);
    tasks[0] = "httpget";
    tasks[1] = "jsonparse";
    tasks[2] = "multiply";
    tasks[3] = "ethuint256";
    tasks[4] = "ethtx";

    ChainlinkLib.Spec memory spec = newSpec(tasks, currentSender, _callback);
    spec.add("url", "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD");
    string[] memory path = new string[](1);
    path[0] = "USD";
    spec.addStringArray("path", path);
    spec.addInt("times", 100);
    con = IConsumer(currentSender);
    con.updateRequestId(chainlinkRequest(spec, currentAmount));
  }
  
  modifier isContract(address _addr) {
    uint length;
    assembly { length := extcodesize(_addr) }
    require(length > 0);
    _;
  }

  modifier onlyLINK() {
    require(msg.sender == address(link));
    _;
  }
}

interface IConsumer{
  function updateRequestId(bytes32) external;
}
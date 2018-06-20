'use strict';

require('./support/helpers.js')

contract('Monolith', () => {
  let Link = artifacts.require("LinkToken.sol");
  let Oracle = artifacts.require("Oracle.sol");
  let Monolith = artifacts.require("Monolith.sol");
  let link, oc, ml;

  beforeEach(async () => {
    link = await Link.new();
    oc = await Oracle.new(link.address, {from: oracleNode});
    ml = await Monolith.new(link.address, oc.address, {from: defaultAccount});
  });

  it("has a predictable gas price", async () => {
    let rec = await eth.getTransactionReceipt(ml.transactionHash);
    assert.isBelow(rec.gasUsed, 2000000);
  });

  describe("#requestLastCryptoPrice", () => {
    let expected = 60729;
    let response = "0x" + encodeUint256(60729);
    let requestId, tx;

    beforeEach(async () => {
      await link.transfer(ml.address, web3.toWei('1', 'ether'));
      tx = await ml.requestLastCryptoPrice({from: defaultAccount});
      let event = await getLatestEvent(oc);
      requestId = event.args.internalId;
    });

    it("triggers a log event in the Oracle contract", async () => {
      let gasUsed = tx.receipt.gasUsed;
      let log = tx.receipt.logs[2];
      assert.equal(log.address, oc.address);

      let [id, wei, ver, cborData] = decodeSpecAndRunRequest(log);
      let params = await cbor.decodeFirst(cborData);
      let expected = {
        "tasks": ["httpget", "jsonparse", "multiply", "ethuint256", "ethtx"],
        "params": {
          "times": 100,
          "path":["USD"],
          "url":"https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
        }
      };

      assert.equal(web3.toWei('1', 'ether'), hexToInt(wei));
      assert.equal(1, ver);
      assert.deepEqual(expected, params);
      assert.isBelow(gasUsed, 330000);
    });

    it("records the data given to it by the oracle", async () => {
      let timestamp = await ml.lastPriceTimestamp();
      await oc.fulfillData(requestId, response, {from: oracleNode});
      timestamp = await ml.lastPriceTimestamp();

      let currentPrice = await ml.lastPrice();
      let decoded = await abi.rawDecode(["uint256"], new Buffer(intToHexNoPrefix(currentPrice), "hex"));

      assert.equal(decoded.toString(), expected);
      assert.isAbove(timestamp, 0);
    });

    context("when the monolith does not recognize the request ID", () => {
      let otherId;

      beforeEach(async () => {
        let funcSig = functionSelector("fulfillLastPrice(bytes32,uint256)");
        let args = specAndRunBytes(ml.address, funcSig, 42, "");
        await requestDataFrom(oc, link, 0, args);
        let event = await getLatestEvent(oc);
        otherId = event.args.internalId;
      });

      it("does not accept the data provided", async () => {
        await oc.fulfillData(otherId, response, {from: oracleNode});
        let received = await ml.lastPrice();
        assert.equal(received, 0);
      });
    });

    context("when called by anyone other than the oracle contract", () => {
      it("does not accept the data provided", async () => {
        await assertActionThrows(async () => {
          await ml.fulfillLastPrice(requestId, response, {from: stranger})
        });

        let received = await ml.lastPrice();
        assert.equal(received, 0);
      });
    });
  });
});
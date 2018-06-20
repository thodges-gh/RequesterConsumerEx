'use strict';

require('./support/helpers.js')

contract('Consumer', () => {
  let Link = artifacts.require("LinkToken.sol");
  let Oracle = artifacts.require("Oracle.sol");
  let Requester = artifacts.require("Requester.sol");
  let Consumer = artifacts.require("Consumer.sol");
  let link, oc, rc, cc;

  beforeEach(async () => {
    link = await Link.new();
    oc = await Oracle.new(link.address, {from: oracleNode});
    rc = await Requester.new(link.address, oc.address, {from: requester});
    cc = await Consumer.new(oc.address, link.address, rc.address, {from: consumer});
  });

  it("has a predictable gas price", async () => {
    let rec = await eth.getTransactionReceipt(cc.transactionHash);
    assert.isBelow(rec.gasUsed, 1600000);
  });

  describe("#requestLastCryptoPrice", () => {
    let expected = 60729;
    let response = "0x" + encodeUint256(60729);
    let requestId;

    beforeEach(async () => {
      await link.transfer(cc.address, web3.toWei('1', 'ether'));
      await cc.requestLastCryptoPrice();
      let event = await getLatestEvent(oc);
      requestId = event.args.internalId;
    });

    it("records the data given to it by the oracle", async () => {
      let timestamp = await cc.lastPriceTimestamp();
      await oc.fulfillData(requestId, response, {from: oracleNode});
      timestamp = await cc.lastPriceTimestamp();

      let currentPrice = await cc.lastPrice();
      let decoded = await abi.rawDecode(["uint256"], new Buffer(intToHexNoPrefix(currentPrice), "hex"));

      assert.equal(decoded.toString(), expected);
      assert.isAbove(timestamp, 0);
    });

    context("when the consumer does not recognize the request ID", () => {
      let otherId;

      beforeEach(async () => {
        let funcSig = functionSelector("fulfillLastPrice(bytes32,uint256)");
        let args = specAndRunBytes(cc.address, funcSig, 42, "");
        await requestDataFrom(oc, link, 0, args);
        let event = await getLatestEvent(oc);
        otherId = event.args.internalId;
      });

      it("does not accept the data provided", async () => {
        await oc.fulfillData(otherId, response, {from: oracleNode});
        let received = await cc.lastPrice();
        assert.equal(received, 0);
      });
    });

    context("when called by anyone other than the oracle contract", () => {
      it("does not accept the data provided", async () => {
        await assertActionThrows(async () => {
          await cc.fulfillLastPrice(requestId, response, {from: stranger})
        });

        let received = await cc.lastPrice();
        assert.equal(received, 0);
      });
    });
  });
});
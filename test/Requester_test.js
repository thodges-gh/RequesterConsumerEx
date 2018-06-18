'use strict';

require('./support/helpers.js')

contract('Requester', () => {
  let Link = artifacts.require("LinkToken.sol");
  let Oracle = artifacts.require("Oracle.sol");
  let Requester = artifacts.require("Requester.sol");
  let Consumer = artifacts.require("Consumer.sol");
  let link, oc, rc, cc;
  let fid = functionSelector("lastCryptoPrice(string)");
  let callbackMethod = "fulfillLastPrice(bytes32,uint256)";
  let encoded = abi.rawEncode(["string"], [callbackMethod]);
  let callData = fid + encoded.toString("hex");

  beforeEach(async () => {
    link = await Link.new();
    oc = await Oracle.new(link.address, {from: oracleNode});
    rc = await Requester.new(link.address, oc.address, {from: requester});
    cc = await Consumer.new(oc.address, link.address, rc.address, {from: consumer});
    await link.transfer(cc.address, web3.toWei('1', 'ether'));
  });

  it("has a predictable gas price", async () => {
    let rec = await eth.getTransactionReceipt(rc.transactionHash);
    assert.isBelow(rec.gasUsed, 1800000);
  });

  describe('#onTokenTransfer', () => {
    context('when called from the LINK token', () => {
      it('triggers the intended method', async () => {
        let tx = await cc.requestLastCryptoPrice();
        assert.equal(6, tx.receipt.logs.length);
      });

      context('with no data', () => {
        it('reverts', async () => {
          await assertActionThrows(async () => {
            await link.transferAndCall(rc.address, web3.toWei('1', 'ether'), '');
          });
        });
      });
    });

    context('when called from any address but the LINK token', () => {
      it('reverts', async () => {
        await assertActionThrows(async () => {
          await rc.onTokenTransfer(rc.address, web3.toWei('1', 'ether'), callData);
        });
      });
    });
  });

  describe("#lastCryptoPrice", () => {
    context("when called directly", () => {
      it("reverts", async () => {
        await assertActionThrows(async () => {
          await rc.lastCryptoPrice(callbackMethod);
        });
      });
    });

    context("when called through the LINK token transfer", () => {
      it("triggers a log event in the Oracle contract", async () => {
        let tx = await cc.requestLastCryptoPrice();
        let gasUsed = tx.receipt.gasUsed;
        let log = tx.receipt.logs[4];
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
        assert.isBelow(gasUsed, 310000);
      });
    });
  });
});

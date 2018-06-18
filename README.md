# Separate Requester and Consumer Chainlinked Contracts

Install

```bash
$ npm install
```

Run Ganache (or any chain running on port 8545)

```bash
$ ganache-cli --deterministic
```

Migrate

```bash
$ truffle migrate --reset --network development
```

Test

```bash
$ truffle test --network development
```

Remix-friendly contracts available in the `remix/` directory, organized by network. Simply import them or copy/paste them into the [Remix](http://remix.ethereum.org) interface.
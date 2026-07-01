class SkygridLedgerWallet {
  constructor({ address, balance = 0, network = "skygrid-main" }) {
    if (!address || typeof address !== "string") {
      throw new Error("Wallet address is required");
    }

    if (!Number.isFinite(balance) || balance < 0) {
      throw new Error("Wallet balance must be a non-negative number");
    }

    if (!network || typeof network !== "string") {
      throw new Error("Wallet network is required");
    }

    this._address = address;
    this._balance = balance;
    this._network = network;
  }

  getAddress() {
    return this._address;
  }

  getBalance() {
    return this._balance;
  }

  getNetwork() {
    return this._network;
  }

  credit(amount) {
    this._assertPositiveAmount(amount);
    this._balance += amount;
    return this._balance;
  }

  debit(amount) {
    this._assertPositiveAmount(amount);

    if (amount > this._balance) {
      throw new Error("Insufficient funds");
    }

    this._balance -= amount;
    return this._balance;
  }

  snapshot() {
    return {
      address: this._address,
      balance: this._balance,
      network: this._network,
      mode: "trace_only",
    };
  }

  _assertPositiveAmount(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
  }
}

module.exports = SkygridLedgerWallet;

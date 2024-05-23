class Wallet {
    constructor() {
        this.wallet = {};
        this.walletIcons = {
            unknownProviderIcon: "./assets/trustwallet.svg",
            "MetaMask": "./assets/metamask.svg",
            "Brave Wallet": "./assets/brave.svg",
            "Phantom": "./assets/phantom.svg",
            "Trust Wallet": "./assets/trustwallet.svg",
            "Coinbase Wallet": "./assets/coinbase.svg",  
        };
        // demo: show initial state as "no wallet installed"
        this.domUpdateNoProvidersFound();
        this.userWallets();
        window.dispatchEvent(new Event("eip6963:requestProvider"));
        this.accountValue = null;
    }
    userWallets() {
        window.addEventListener("eip6963:announceProvider", (wallet) => {
            // get the provider name, eg.: MetaMask, Trust Wallet, etc.
            let providerName = wallet.detail.info.name;
            // create an entry in the wallet object for the provider
            this.wallet[providerName] = {
                obj: wallet.detail.provider,
                account: "",
                icon: this.walletIcons[providerName] || this.walletIcons.unknownProviderIcon,
            };
            // set up getter and setter for the "account" property of the provider
            this.updateObjectOnWalletChange(providerName);
            // check for the provider in the DOM with the custom attribute, if not found, create them
            if (!document.querySelector(`#userWalletProviderList [wallet-provider="${providerName}"]`)) {
                this.createListOfProviders(providerName);
                const providerListItem = document.querySelector(`#userWalletProviderList [wallet-provider="${providerName}"]`);
                this.setAccountOnProviderClick(providerListItem);
            }
            // extra listener for account changes in the browser wallet plugin
            this.listenForAccountChanges(providerName);
        });
    }

    updateObjectOnWalletChange(providerName, accountValue) {
        Object.defineProperty(this.wallet[providerName], "account", {
            get: (accountValue) => this.get(accountValue),
            set: (newValue) => this.set(accountValue, newValue)
        });
        // set display to none if providers are found
        this.domUpdateProvidersFound();
    }
    
    get(accountValue) {
        return accountValue;
    }

    set(accountValue, newValue) {
        if (!newValue) {
            return;
        } else {
            accountValue = newValue;
            this.domUpdateAccountValue(accountValue);
        }
    }

    // listens for account changes in the browser wallet plugin
    listenForAccountChanges(providerName){
        this.wallet[providerName].obj.on("accountsChanged", (accounts) => {
            if (accounts.length === 0) {
                // if user disconnects the account using the browser plugin, remove the account text from the DOM
                document.getElementById("account").innerHTML = "No account selected yet.";
            } else {
                this.wallet[providerName].account = accounts[0];
            }
        });
    }

    setAccountOnProviderClick(providerListItem) {
        providerListItem.addEventListener("click", async (event) => {
            // retrieve the provider attribute from the clicked element
            const provider = event.currentTarget.getAttribute("wallet-provider");

            if (!provider) {
                console.error('Attribute not found');
                return;
            } else {
                // fetch accounts associated with the provider
                const accounts = await this.getProviderAccounts(provider);
                if (accounts.length > 0) {
                    this.wallet[provider].account = accounts[0];
                } else {
                    console.error('No accounts found for provider:', provider);
                }
            }
        });
    }
    
    async getProviderAccounts(provider) {
        try {
        // check if the provider and its properties exist before making the request
            if (!this.wallet[provider] && this.wallet[provider].obj) {
                throw new Error("Provider or its properties are missing");
            }
            const accounts = await this.wallet[provider].obj.request({ method: "eth_requestAccounts" });
            if (!Array.isArray(accounts)) {
                return [];
            } else {
                return accounts;
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
            return [];
        }
    }

    // ui updates for demo purposes
    createListOfProviders(providerName) {
        const providerListItem = document.createElement("li");
        // add custom attribute to the provider list item as the name of the provider eg.: <li wallet-provider="MetaMask">...</li>
        providerListItem.setAttribute("wallet-provider", providerName);
        providerListItem.classList.add("wrapper");
        const providerIcon = document.createElement("img");
        providerIcon.src = this.wallet[providerName].icon;
        providerIcon.alt = providerName;
        providerListItem.appendChild(providerIcon);
        const providerNameText = document.createElement("span");
        providerNameText.textContent = providerName;
        providerListItem.appendChild(providerNameText);
        const userWalletProviderList = document.getElementById("userWalletProviderList");

        userWalletProviderList.appendChild(providerListItem);
    }

    // update the account value in the DOM
    domUpdateAccountValue(accountValue) {
        const accountElement = document.getElementById("account");
        accountElement.innerHTML = accountValue;
        accountElement.setAttribute("walletAddress", accountValue);
    }

    domUpdateNoProvidersFound() {
        document.getElementById("notice").style.display = "flex";
    }

    domUpdateProvidersFound() {
        document.getElementById("notice").style.display = "none";
    }
}

export default Wallet;

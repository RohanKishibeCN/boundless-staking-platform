class MultiChainWallet {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.networkId = null;
        this.connectedWallet = null;
        this.transactions = [];
        this.ethPrice = 2000;
        this.usdcPrice = 1;
        
        // 网络配置
        this.networks = {
            1: {
                name: 'Ethereum 主网',
                rpc: 'https://eth-mainnet.g.alchemy.com/v2/demo',
                usdc: '0xA0b86a33E6441b8e8C7C7b0b2C4C8b8b8b8b8b8b' // Ethereum USDC
            },
            11155111: {
                name: 'Sepolia 测试网',
                rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
                usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC (测试)
            },
            8453: {
                name: 'Base 主网',
                rpc: 'https://mainnet.base.org',
                usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC
            },
            84532: {
                name: 'Base Sepolia 测试网',
                rpc: 'https://sepolia.base.org',
                usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia USDC
            }
        };
        
        // ERC20 ABI (简化版)
        this.erc20ABI = [
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            },
            {
                "constant": false,
                "inputs": [
                    {"name": "_to", "type": "address"},
                    {"name": "_value", "type": "uint256"}
                ],
                "name": "transfer",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            }
        ];
        
        this.init();
    }

    init() {
        this.initWeb3();
        this.bindEvents();
        this.loadTransactionHistory();
        this.checkWalletConnection();
    }

    initWeb3() {
        // 默认使用 Sepolia 测试网
        const defaultNetwork = this.networks[11155111];
        this.web3 = new Web3(new Web3.providers.HttpProvider(defaultNetwork.rpc));
        this.networkId = 11155111;
    }

    bindEvents() {
        // 钱包连接
        document.getElementById('connectMetaMask').addEventListener('click', () => this.connectWallet('metamask'));
        document.getElementById('connectOKX').addEventListener('click', () => this.connectWallet('okx'));
        document.getElementById('disconnectWallet').addEventListener('click', () => this.disconnectWallet());
        
        // 网络切换
        document.getElementById('networkSelect').addEventListener('change', (e) => this.switchNetwork(parseInt(e.target.value)));
        
        // 余额查询
        document.getElementById('checkETHBalance').addEventListener('click', () => this.checkBalance('ETH'));
        document.getElementById('checkUSDCBalance').addEventListener('click', () => this.checkBalance('USDC'));
        
        // 交易操作
        document.getElementById('executeTransaction').addEventListener('click', () => this.handleTransaction());
        document.getElementById('operationType').addEventListener('change', (e) => this.toggleOperationType(e.target.value));
        document.getElementById('tokenType').addEventListener('change', (e) => this.updateTokenType(e.target.value));
        
        // 快速操作
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.currentTarget.dataset.amount;
                const token = e.currentTarget.dataset.token;
                document.getElementById('amount').value = amount;
                document.getElementById('tokenType').value = token;
                this.updateTokenType(token);
            });
        });
        
        document.querySelectorAll('.quick-network').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const networkId = parseInt(e.currentTarget.dataset.network);
                document.getElementById('networkSelect').value = networkId;
                this.switchNetwork(networkId);
            });
        });
        
        // 其他功能
        document.getElementById('copyAddress').addEventListener('click', () => this.copyAddress());
        document.getElementById('refreshHistory').addEventListener('click', () => this.loadTransactionHistory());
        document.getElementById('refreshAllBalances').addEventListener('click', () => this.refreshAllBalances());
        document.getElementById('addUSDCToken').addEventListener('click', () => this.addUSDCToWallet());
        
        // 历史记录过滤
        document.getElementById('historyFilter').addEventListener('change', (e) => this.filterTransactionHistory(e.target.value));
        
        // 确认模态框
        document.getElementById('cancelTransaction').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmTransaction').addEventListener('click', () => this.executeTransaction());
        
        // 监听钱包事件
        this.setupWalletListeners();
    }

    setupWalletListeners() {
        // MetaMask 事件监听
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.account = accounts[0];
                    this.updateWalletInfo();
                }
            });
            
            window.ethereum.on('chainChanged', (chainId) => {
                this.networkId = parseInt(chainId, 16);
                this.updateNetworkInfo();
                this.initWeb3ForConnectedWallet();
            });
        }
        
        // OKX 事件监听
        if (window.okxwallet) {
            window.okxwallet.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.account = accounts[0];
                    this.updateWalletInfo();
                }
            });
            
            window.okxwallet.on('chainChanged', (chainId) => {
                this.networkId = parseInt(chainId, 16);
                this.updateNetworkInfo();
                this.initWeb3ForConnectedWallet();
            });
        }
    }

    async checkWalletConnection() {
        // 检查 MetaMask
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.connectedWallet = 'metamask';
                    this.web3 = new Web3(window.ethereum);
                    this.account = accounts[0];
                    this.networkId = await this.web3.eth.net.getId();
                    this.updateWalletInfo();
                    this.updateNetworkInfo();
                    return;
                }
            } catch (error) {
                console.error('检查 MetaMask 连接失败:', error);
            }
        }
        
        // 检查 OKX
        if (typeof window.okxwallet !== 'undefined') {
            try {
                const accounts = await window.okxwallet.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.connectedWallet = 'okx';
                    this.web3 = new Web3(window.okxwallet);
                    this.account = accounts[0];
                    this.networkId = await this.web3.eth.net.getId();
                    this.updateWalletInfo();
                    this.updateNetworkInfo();
                    return;
                }
            } catch (error) {
                console.error('检查 OKX 连接失败:', error);
            }
        }
        
        this.updateNetworkInfo();
    }

    async connectWallet(walletType) {
        try {
            let provider;
            let walletName;
            
            if (walletType === 'metamask') {
                if (typeof window.ethereum === 'undefined') {
                    this.showNotification('请安装 MetaMask 钱包扩展', 'error');
                    setTimeout(() => {
                        if (confirm('是否前往 MetaMask 官网下载？')) {
                            window.open('https://metamask.io/download/', '_blank');
                        }
                    }, 1000);
                    return;
                }
                provider = window.ethereum;
                walletName = 'MetaMask';
            } else if (walletType === 'okx') {
                if (typeof window.okxwallet === 'undefined') {
                    this.showNotification('请安装 OKX 钱包扩展', 'error');
                    setTimeout(() => {
                        if (confirm('是否前往 OKX 官网下载？')) {
                            window.open('https://www.okx.com/web3', '_blank');
                        }
                    }, 1000);
                    return;
                }
                provider = window.okxwallet;
                walletName = 'OKX';
            }

            this.showLoading(`连接 ${walletName} 钱包中...`);
            
            // 请求账户访问
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            this.web3 = new Web3(provider);
            this.account = accounts[0];
            this.connectedWallet = walletType;
            this.networkId = await this.web3.eth.net.getId();
            
            this.updateWalletInfo();
            this.updateNetworkInfo();
            
            this.hideLoading();
            this.showNotification(`${walletName} 钱包连接成功！`, 'success');
            
        } catch (error) {
            this.hideLoading();
            if (error.code === 4001) {
                this.showNotification('用户拒绝了连接请求', 'info');
            } else {
                this.showNotification('连接钱包失败: ' + error.message, 'error');
            }
        }
    }

    disconnectWallet() {
        this.account = null;
        this.connectedWallet = null;
        
        // 重新初始化为只读模式
        this.initWeb3();
        
        document.getElementById('walletInfo').classList.add('hidden');
        this.updateNetworkInfo();
        
        this.showNotification('钱包已断开连接', 'info');
    }

    initWeb3ForConnectedWallet() {
        if (this.connectedWallet === 'metamask' && window.ethereum) {
            this.web3 = new Web3(window.ethereum);
        } else if (this.connectedWallet === 'okx' && window.okxwallet) {
            this.web3 = new Web3(window.okxwallet);
        } else {
            this.initWeb3();
        }
    }

    updateWalletInfo() {
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('walletAddress').textContent = this.account;
        document.getElementById('receiveAddress').textContent = this.account;
        
        const walletNames = {
            'metamask': 'MetaMask',
            'okx': 'OKX'
        };
        document.getElementById('connectedWallet').textContent = walletNames[this.connectedWallet] || '未知';
    }

    updateNetworkInfo() {
        const networkName = this.networks[this.networkId]?.name || `网络 ID: ${this.networkId}`;
        document.getElementById('networkName').textContent = this.account ? networkName : `${networkName} (只读)`;
        
        // 更新网络选择器
        document.getElementById('networkSelect').value = this.networkId;
    }

    async switchNetwork(targetNetworkId) {
        if (!this.networks[targetNetworkId]) {
            this.showNotification('不支持的网络', 'error');
            return;
        }

        if (this.account && this.connectedWallet) {
            try {
                const provider = this.connectedWallet === 'metamask' ? window.ethereum : window.okxwallet;
                
                // 尝试切换网络
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + targetNetworkId.toString(16) }],
                });
                
            } catch (switchError) {
                // 如果网络不存在，尝试添加网络
                if (switchError.code === 4902) {
                    await this.addNetwork(targetNetworkId);
                } else {
                    this.showNotification('切换网络失败: ' + switchError.message, 'error');
                }
            }
        } else {
            // 只读模式下直接切换
            this.networkId = targetNetworkId;
            this.web3 = new Web3(new Web3.providers.HttpProvider(this.networks[targetNetworkId].rpc));
            this.updateNetworkInfo();
            this.showNotification(`已切换到 ${this.networks[targetNetworkId].name}`, 'success');
        }
    }

    async addNetwork(networkId) {
        const networkConfig = {
            8453: {
                chainId: '0x2105',
                chainName: 'Base',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
            },
            84532: {
                chainId: '0x14a34',
                chainName: 'Base Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org']
            }
        };

        const config = networkConfig[networkId];
        if (!config) return;

        try {
            const provider = this.connectedWallet === 'metamask' ? window.ethereum : window.okxwallet;
            await provider.request({
                method: 'wallet_addEthereumChain',
                params: [config],
            });
        } catch (addError) {
            this.showNotification('添加网络失败: ' + addError.message, 'error');
        }
    }

    async checkBalance(tokenType) {
        try {
            const address = document.getElementById('queryAddress').value.trim() || this.account;
            
            if (!address) {
                this.showNotification('请输入要查询的地址或先连接钱包', 'error');
                return;
            }

            if (!this.isValidAddress(address)) {
                this.showNotification('请输入有效的以太坊地址', 'error');
                return;
            }

            this.showLoading(`查询 ${tokenType} 余额中...`);

            try {
                if (tokenType === 'ETH') {
                    await this.checkETHBalance(address);
                } else if (tokenType === 'USDC') {
                    await this.checkUSDCBalance(address);
                }
                
                document.getElementById('balanceResult').classList.remove('hidden');
                this.hideLoading();
                this.showNotification(`${tokenType} 余额查询成功`, 'success');
                
            } catch (networkError) {
                this.hideLoading();
                console.error('网络查询错误:', networkError);
                this.showNotification('网络查询失败，请检查网络连接或稍后重试', 'error');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showNotification('查询余额失败: ' + error.message, 'error');
        }
    }

    async checkETHBalance(address) {
        const balanceWei = await this.web3.eth.getBalance(address);
        const balanceEth = this.web3.utils.fromWei(balanceWei, 'ether');
        const usdValue = (parseFloat(balanceEth) * this.ethPrice).toFixed(2);
        
        document.getElementById('ethBalance').textContent = parseFloat(balanceEth).toFixed(6) + ' ETH';
        document.getElementById('ethUsdValue').textContent = '$' + usdValue;
        
        // 更新最大可发送金额
        if (address === this.account) {
            document.getElementById('maxAmount').textContent = `最大: ${parseFloat(balanceEth).toFixed(6)} ETH`;
        }
    }

    async checkUSDCBalance(address) {
        const usdcAddress = this.networks[this.networkId]?.usdc;
        if (!usdcAddress) {
            throw new Error('当前网络不支持 USDC');
        }

        const contract = new this.web3.eth.Contract(this.erc20ABI, usdcAddress);
        const balance = await contract.methods.balanceOf(address).call();
        const decimals = await contract.methods.decimals().call();
        
        const balanceFormatted = (balance / Math.pow(10, decimals)).toFixed(2);
        
        document.getElementById('usdcBalance').textContent = balanceFormatted + ' USDC';
        document.getElementById('usdcContract').textContent = usdcAddress;
        
        // 更新最大可发送金额
        if (address === this.account) {
            document.getElementById('maxAmount').textContent = `最大: ${balanceFormatted} USDC`;
        }
    }

    async refreshAllBalances() {
        if (!this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        this.showLoading('刷新所有余额中...');
        
        try {
            await this.checkETHBalance(this.account);
            await this.checkUSDCBalance(this.account);
            
            document.getElementById('balanceResult').classList.remove('hidden');
            this.hideLoading();
            this.showNotification('余额刷新成功', 'success');
        } catch (error) {
            this.hideLoading();
            this.showNotification('刷新余额失败: ' + error.message, 'error');
        }
    }

    updateTokenType(tokenType) {
        const minAmountSpan = document.getElementById('minAmount');
        if (tokenType === 'ETH') {
            minAmountSpan.textContent = '最小: 0.000001 ETH';
        } else if (tokenType === 'USDC') {
            minAmountSpan.textContent = '最小: 0.01 USDC';
        }
    }

    toggleOperationType(type) {
        const sendFields = document.getElementById('sendFields');
        const receiveFields = document.getElementById('receiveFields');
        const executeButton = document.getElementById('executeButtonText');
        
        if (type === 'send') {
            sendFields.classList.remove('hidden');
            receiveFields.classList.add('hidden');
            executeButton.textContent = '发送代币';
        } else {
            sendFields.classList.add('hidden');
            receiveFields.classList.remove('hidden');
            executeButton.textContent = '显示接收地址';
        }
    }

    async handleTransaction() {
        const operationType = document.getElementById('operationType').value;
        
        if (operationType === 'receive') {
            this.showReceiveInfo();
        } else {
            await this.prepareTransaction();
        }
    }

    showReceiveInfo() {
        if (!this.account) {
            this.showNotification('请先连接钱包以显示接收地址', 'error');
            return;
        }
        
        this.showNotification('接收地址已显示，可以复制分享给他人', 'success');
    }

    async prepareTransaction() {
        try {
            if (!this.account) {
                this.showNotification('请先连接钱包才能发送交易', 'error');
                return;
            }

            const tokenType = document.getElementById('tokenType').value;
            const recipient = document.getElementById('recipientAddress').value.trim();
            const amount = document.getElementById('amount').value;

            if (!recipient || !this.isValidAddress(recipient)) {
                this.showNotification('请输入有效的接收地址', 'error');
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                this.showNotification('请输入有效的金额', 'error');
                return;
            }

            if (recipient.toLowerCase() === this.account.toLowerCase()) {
                this.showNotification('不能向自己的地址发送', 'error');
                return;
            }

            // 检查余额
            await this.checkSufficientBalance(tokenType, amount);

            // 估算 Gas 费用
            const gasFee = await this.estimateGasFee(tokenType, recipient, amount);

            // 显示确认模态框
            document.getElementById('confirmTokenType').textContent = tokenType;
            document.getElementById('confirmRecipient').textContent = recipient;
            document.getElementById('confirmAmount').textContent = amount + ' ' + tokenType;
            document.getElementById('confirmNetwork').textContent = this.networks[this.networkId].name;
            document.getElementById('confirmGasFee').textContent = gasFee + ' ETH';
            
            this.showConfirmModal();
            
        } catch (error) {
            this.showNotification('准备交易失败: ' + error.message, 'error');
        }
    }

    async checkSufficientBalance(tokenType, amount) {
        if (tokenType === 'ETH') {
            const balance = await this.web3.eth.getBalance(this.account);
            const balanceEth = parseFloat(this.web3.utils.fromWei(balance, 'ether'));
            const sendAmount = parseFloat(amount);

            if (sendAmount > balanceEth) {
                throw new Error(`ETH 余额不足，当前余额: ${balanceEth.toFixed(6)} ETH`);
            }
        } else if (tokenType === 'USDC') {
            const usdcAddress = this.networks[this.networkId]?.usdc;
            if (!usdcAddress) {
                throw new Error('当前网络不支持 USDC');
            }

            const contract = new this.web3.eth.Contract(this.erc20ABI, usdcAddress);
            const balance = await contract.methods.balanceOf(this.account).call();
            const decimals = await contract.methods.decimals().call();
            const balanceFormatted = balance / Math.pow(10, decimals);
            const sendAmount = parseFloat(amount);

            if (sendAmount > balanceFormatted) {
                throw new Error(`USDC 余额不足，当前余额: ${balanceFormatted.toFixed(2)} USDC`);
            }
        }
    }

    async estimateGasFee(tokenType, recipient, amount) {
        try {
            let gasEstimate;
            const gasPrice = await this.web3.eth.getGasPrice();

            if (tokenType === 'ETH') {
                gasEstimate = 21000; // 标准 ETH 转账
            } else if (tokenType === 'USDC') {
                const usdcAddress = this.networks[this.networkId]?.usdc;
                const contract = new this.web3.eth.Contract(this.erc20ABI, usdcAddress);
                const decimals = await contract.methods.decimals().call();
                const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString();
                
                gasEstimate = await contract.methods.transfer(recipient, amountWei).estimateGas({
                    from: this.account
                });
            }

            const gasFee = this.web3.utils.fromWei((BigInt(gasPrice) * BigInt(gasEstimate)).toString(), 'ether');
            return parseFloat(gasFee).toFixed(6);
        } catch (error) {
            console.error('Gas 估算失败:', error);
            return '估算失败';
        }
    }

    async executeTransaction() {
        try {
            this.hideConfirmModal();
            this.showLoading('发送交易中...');

            const tokenType = document.getElementById('tokenType').value;
            const recipient = document.getElementById('recipientAddress').value.trim();
            const amount = document.getElementById('amount').value;

            let txHash;

            if (tokenType === 'ETH') {
                txHash = await this.sendETH(recipient, amount);
            } else if (tokenType === 'USDC') {
                txHash = await this.sendUSDC(recipient, amount);
            }

            // 记录交易
            const transaction = {
                hash: txHash,
                type: 'send',
                token: tokenType,
                from: this.account,
                to: recipient,
                amount: amount,
                timestamp: new Date().toISOString(),
                status: 'pending',
                network: this.networkId,
                networkName: this.networks[this.networkId].name
            };
            
            this.transactions.unshift(transaction);
            this.updateTransactionHistory();
            this.saveTransactionHistory();
            
            // 清空输入
            document.getElementById('recipientAddress').value = '';
            document.getElementById('amount').value = '';
            
            this.hideLoading();
            this.showNotification(`${tokenType} 交易已发送，等待确认`, 'success');
            
            // 等待交易确认
            this.waitForTransactionConfirmation(transaction);
            
        } catch (error) {
            this.hideLoading();
            if (error.code === 4001) {
                this.showNotification('用户取消了交易', 'info');
            } else {
                this.showNotification('交易失败: ' + error.message, 'error');
            }
        }
    }

    async sendETH(recipient, amount) {
        const amountWei = this.web3.utils.toWei(amount, 'ether');
        const tx = await this.web3.eth.sendTransaction({
            from: this.account,
            to: recipient,
            value: amountWei,
            gas: 21000
        });
        return tx.transactionHash || tx;
    }

    async sendUSDC(recipient, amount) {
        const usdcAddress = this.networks[this.networkId]?.usdc;
        const contract = new this.web3.eth.Contract(this.erc20ABI, usdcAddress);
        const decimals = await contract.methods.decimals().call();
        const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString();
        
        const tx = await contract.methods.transfer(recipient, amountWei).send({
            from: this.account
        });
        return tx.transactionHash;
    }

    async waitForTransactionConfirmation(transaction) {
        try {
            const receipt = await this.web3.eth.getTransactionReceipt(transaction.hash);
            if (receipt) {
                transaction.status = receipt.status ? 'confirmed' : 'failed';
                transaction.blockNumber = receipt.blockNumber;
                transaction.gasUsed = receipt.gasUsed;
                
                this.updateTransactionHistory();
                this.saveTransactionHistory();
                
                const message = transaction.status === 'confirmed' ? 
                    `${transaction.token} 交易已确认` : `${transaction.token} 交易失败`;
                const type = transaction.status === 'confirmed' ? 'success' : 'error';
                this.showNotification(message, type);
            } else {
                // 如果还没有收据，继续等待
                setTimeout(() => this.waitForTransactionConfirmation(transaction), 5000);
            }
        } catch (error) {
            console.error('检查交易状态失败:', error);
        }
    }

    async addUSDCToWallet() {
        if (!this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        const usdcAddress = this.networks[this.networkId]?.usdc;
        if (!usdcAddress) {
            this.showNotification('当前网络不支持 USDC', 'error');
            return;
        }

        try {
            const provider = this.connectedWallet === 'metamask' ? window.ethereum : window.okxwallet;
            await provider.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: usdcAddress,
                        symbol: 'USDC',
                        decimals: 6,
                        image: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
                    },
                },
            });
            this.showNotification('USDC 代币已添加到钱包', 'success');
        } catch (error) {
            this.showNotification('添加代币失败: ' + error.message, 'error');
        }
    }

    filterTransactionHistory(filter) {
        const transactions = filter === 'all' ? this.transactions : 
                           this.transactions.filter(tx => tx.token === filter);
        this.displayTransactions(transactions);
    }

    updateTransactionHistory() {
        this.displayTransactions(this.transactions);
    }

    displayTransactions(transactions) {
        const historyContainer = document.getElementById('transactionHistory');
        
        if (transactions.length === 0) {
            historyContainer.innerHTML = '<p class="text-gray-500 text-center py-8">暂无交易记录</p>';
            return;
        }

        historyContainer.innerHTML = transactions.map(tx => `
            <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center">
                        <i data-lucide="arrow-up-right" class="w-4 h-4 mr-2 ${tx.token === 'ETH' ? 'text-blue-600' : 'text-green-600'}"></i>
                        <span class="font-semibold">发送 ${tx.token}</span>
                        <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${tx.networkName}</span>
                    </div>
                    <span class="text-sm px-2 py-1 rounded ${
                        tx.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                    }">
                        ${tx.status === 'confirmed' ? '已确认' : 
                          tx.status === 'pending' ? '待确认' : '失败'}
                    </span>
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                    <div>金额: <span class="font-mono font-semibold">${tx.amount} ${tx.token}</span></div>
                    <div>发送到: <span class="font-mono text-xs">${tx.to}</span></div>
                    <div>交易哈希: <span class="font-mono text-xs">${tx.hash}</span></div>
                    <div>时间: ${new Date(tx.timestamp).toLocaleString('zh-CN')}</div>
                    ${tx.blockNumber ? `<div>区块: ${tx.blockNumber}</div>` : ''}
                </div>
            </div>
        `).join('');

        // 重新初始化图标
        lucide.createIcons();
    }

    copyAddress() {
        const address = document.getElementById('receiveAddress').textContent;
        if (address && address !== '--') {
            navigator.clipboard.writeText(address).then(() => {
                this.showNotification('地址已复制到剪贴板', 'success');
            }).catch(() => {
                // 备用复制方法
                const textArea = document.createElement('textarea');
                textArea.value = address;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    this.showNotification('地址已复制到剪贴板', 'success');
                } catch (err) {
                    this.showNotification('复制失败，请手动复制', 'error');
                }
                document.body.removeChild(textArea);
            });
        } else {
            this.showNotification('请先连接钱包', 'error');
        }
    }

    isValidAddress(address) {
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return false;
        }
        
        if (this.web3 && this.web3.utils && this.web3.utils.isAddress) {
            return this.web3.utils.isAddress(address);
        }
        
        return true;
    }

    showConfirmModal() {
        document.getElementById('confirmModal').classList.remove('hidden');
        document.getElementById('confirmModal').classList.add('flex');
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        document.getElementById('confirmModal').classList.remove('flex');
    }

    saveTransactionHistory() {
        localStorage.setItem('multichain_transactions', JSON.stringify(this.transactions));
    }

    loadTransactionHistory() {
        const saved = localStorage.getItem('multichain_transactions');
        if (saved) {
            this.transactions = JSON.parse(saved);
            this.updateTransactionHistory();
        }
    }

    showLoading(text) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingModal').classList.remove('hidden');
        document.getElementById('loadingModal').classList.add('flex');
    }

    hideLoading() {
        document.getElementById('loadingModal').classList.add('hidden');
        document.getElementById('loadingModal').classList.remove('flex');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'info' ? 'bg-blue-500 text-white' :
            'bg-gray-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new MultiChainWallet();
});
class BoundlessStaking {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.networkId = null;
        this.stakingContract = null;
        this.transactions = [];
        this.ethPrice = 2000; // ETH 价格，从 API 获取
        
        // Boundless 网络配置 - 专注于 Base 主网
        this.boundlessConfig = {
            // 支持的网络配置 - 仅 Base 主网
            networks: {
                // Base 主网
                8453: {
                    name: 'Base 主网',
                    rpcUrl: 'https://mainnet.base.org',
                    chainId: '0x2105',
                    nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    blockExplorerUrls: ['https://basescan.org'],
                    // 代理合约地址
                    stakingContract: '0x26759dbB201aFbA361Bec78E097Aa3942B0b4AB8',
                    // 实现合约地址（未验证）
                    implementationContract: '0x55c72c789f5b42323ad69fd3e0ff2df1b243c291'
                }
            },
            // 默认网络 - Base 主网
            defaultNetwork: 8453,
            // 真实的 Boundless 合约 ABI - 代理合约
            stakingABI: [
                {
                    "inputs": [
                        {"internalType": "address", "name": "implementation", "type": "address"},
                        {"internalType": "bytes", "name": "_data", "type": "bytes"}
                    ],
                    "stateMutability": "payable",
                    "type": "constructor"
                },
                {
                    "inputs": [{"internalType": "address", "name": "target", "type": "address"}],
                    "name": "AddressEmptyCode",
                    "type": "error"
                },
                {
                    "inputs": [{"internalType": "address", "name": "implementation", "type": "address"}],
                    "name": "ERC1967InvalidImplementation",
                    "type": "error"
                },
                {
                    "inputs": [],
                    "name": "ERC1967NonPayable",
                    "type": "error"
                },
                {
                    "inputs": [],
                    "name": "FailedCall",
                    "type": "error"
                },
                {
                    "anonymous": false,
                    "inputs": [{"indexed": true, "internalType": "address", "name": "implementation", "type": "address"}],
                    "name": "Upgraded",
                    "type": "event"
                },
                {
                    "stateMutability": "payable",
                    "type": "fallback"
                },
                // 添加实现合约的方法 - 通过代理调用
                {
                    "inputs": [],
                    "name": "deposit",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                },
                {
                    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
                    "name": "withdraw",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        };
        
        // 用户数据
        this.userStakingData = {
            stakedBalance: 0,
            availableBalance: 0,
            totalRewards: 0,
            stakingHistory: []
        };
        
        this.init();
    }

    init() {
        this.initWeb3();
        this.bindEvents();
        this.loadTransactionHistory();
        this.checkWalletConnection();
        this.updateUI();
        this.fetchETHPrice();
    }

    initWeb3() {
        // 使用 Base 主网初始化
        const baseNetwork = this.boundlessConfig.networks[this.boundlessConfig.defaultNetwork];
        this.web3 = new Web3(new Web3.providers.HttpProvider(baseNetwork.rpcUrl));
        this.networkId = this.boundlessConfig.defaultNetwork;
    }

    async fetchETHPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            this.ethPrice = data.ethereum.usd;
            this.updateUI();
        } catch (error) {
            console.log('获取 ETH 价格失败，使用默认价格');
        }
    }

    bindEvents() {
        // 钱包连接
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        
        // 质押操作
        document.getElementById('stakeButton').addEventListener('click', () => this.handleStake());
        document.querySelectorAll('.stake-quick-amount').forEach(btn => {
            btn.addEventListener('click', (e) => this.setQuickAmount(e, 'stake'));
        });
        
        // 提取操作
        document.getElementById('withdrawButton').addEventListener('click', () => this.handleWithdraw());
        document.querySelectorAll('.withdraw-quick-amount').forEach(btn => {
            btn.addEventListener('click', (e) => this.setQuickAmount(e, 'withdraw'));
        });
        
        // 余额查询
        document.getElementById('queryBalance').addEventListener('click', () => this.queryBalance());
        document.getElementById('refreshBalances').addEventListener('click', () => this.refreshAllBalances());
        
        // 历史记录过滤
        document.getElementById('historyFilter').addEventListener('change', (e) => this.filterHistory(e.target.value));
        
        // 模态框操作
        document.getElementById('cancelOperation').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmOperation').addEventListener('click', () => this.executeOperation());
        
        // 钱包事件监听
        this.setupWalletListeners();
    }

    setupWalletListeners() {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.account = accounts[0];
                    this.updateWalletInfo();
                    this.loadUserData();
                }
            });
            
            window.ethereum.on('chainChanged', (chainId) => {
                this.networkId = parseInt(chainId, 16);
                this.updateNetworkStatus();
                this.initWeb3ForConnectedWallet();
                this.initStakingContract();
                this.loadUserData();
            });
        }
    }

    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.web3 = new Web3(window.ethereum);
                    this.account = accounts[0];
                    this.networkId = await this.web3.eth.net.getId();
                    this.updateWalletInfo();
                    this.updateNetworkStatus();
                    this.initStakingContract();
                    await this.loadUserData();
                }
            } catch (error) {
                console.error('检查钱包连接失败:', error);
            }
        }
        this.updateNetworkStatus();
    }

    async connectWallet() {
        try {
            // 检查是否有 Web3 钱包
            if (typeof window.ethereum === 'undefined') {
                this.showNotification('未检测到 Web3 钱包', 'error');
                
                // 检查是否是移动设备
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                if (isMobile) {
                    // 移动设备，尝试打开 MetaMask 深度链接
                    const currentUrl = window.location.href;
                    const metamaskUrl = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;
                    
                    if (confirm('请在 MetaMask 移动应用中打开此页面，是否跳转？')) {
                        window.open(metamaskUrl, '_blank');
                    }
                } else {
                    // 桌面设备，提示安装 MetaMask
                    if (confirm('请安装 MetaMask 钱包扩展，是否前往下载？')) {
                        window.open('https://metamask.io/download/', '_blank');
                    }
                }
                return;
            }

            this.showLoading('连接钱包中...');
            
            // 请求连接账户
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length === 0) {
                throw new Error('未选择任何账户');
            }
            
            this.web3 = new Web3(window.ethereum);
            this.account = accounts[0];
            this.networkId = await this.web3.eth.net.getId();
            
            console.log('钱包连接成功:', this.account);
            console.log('当前网络 ID:', this.networkId);
            
            this.updateWalletInfo();
            this.updateNetworkStatus();
            this.initStakingContract();
            await this.loadUserData();
            
            // 检查是否在 Base 主网上
            if (this.networkId !== 8453) {
                this.showNotification('请切换到 Base 主网', 'warning');
                setTimeout(() => {
                    this.switchToBaseNetwork();
                }, 2000);
            }
            
            this.hideLoading();
            this.showNotification('钱包连接成功！', 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('连接钱包失败:', error);
            
            if (error.code === 4001) {
                this.showNotification('用户拒绝了连接请求', 'info');
            } else if (error.code === -32002) {
                this.showNotification('钱包连接请求待处理，请检查钱包应用', 'warning');
            } else {
                this.showNotification('连接钱包失败: ' + error.message, 'error');
            }
        }
    }

    async switchToBaseNetwork() {
        if (!window.ethereum || !this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        const baseNetwork = this.boundlessConfig.networks[8453];

        try {
            this.showLoading('切换到 Base 主网...');
            
            // 尝试切换到 Base 网络
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: baseNetwork.chainId }],
            });
            
            this.hideLoading();
            this.showNotification('已切换到 Base 主网', 'success');
            
        } catch (switchError) {
            console.log('切换网络失败:', switchError);
            
            // 如果网络不存在，尝试添加 Base 网络
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: baseNetwork.chainId,
                            chainName: baseNetwork.name,
                            nativeCurrency: baseNetwork.nativeCurrency,
                            rpcUrls: [baseNetwork.rpcUrl],
                            blockExplorerUrls: baseNetwork.blockExplorerUrls
                        }]
                    });
                    
                    this.hideLoading();
                    this.showNotification('Base 网络已添加并切换成功', 'success');
                    
                } catch (addError) {
                    this.hideLoading();
                    console.error('添加网络失败:', addError);
                    this.showNotification('添加 Base 网络失败: ' + addError.message, 'error');
                }
            } else if (switchError.code === 4001) {
                this.hideLoading();
                this.showNotification('用户拒绝了网络切换请求', 'info');
            } else {
                this.hideLoading();
                this.showNotification('切换到 Base 网络失败: ' + switchError.message, 'error');
            }
        }
    }

    initStakingContract() {
        if (!this.web3 || this.networkId !== 8453) return;
        
        const baseNetwork = this.boundlessConfig.networks[8453];
        if (baseNetwork && baseNetwork.stakingContract) {
            // 使用代理合约地址和质押 ABI
            this.stakingContract = new this.web3.eth.Contract(
                this.boundlessConfig.stakingABI,
                baseNetwork.stakingContract
            );
            console.log('Boundless 质押合约已初始化:', baseNetwork.stakingContract);
        }
    }

    disconnectWallet() {
        this.account = null;
        this.stakingContract = null;
        this.initWeb3();
        
        document.getElementById('walletInfo').classList.add('hidden');
        document.getElementById('connectWallet').textContent = '连接钱包';
        
        this.updateNetworkStatus();
        this.resetUserData();
        this.showNotification('钱包已断开连接', 'info');
    }

    initWeb3ForConnectedWallet() {
        if (window.ethereum) {
            this.web3 = new Web3(window.ethereum);
        } else {
            this.initWeb3();
        }
    }

    updateWalletInfo() {
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('walletAddress').textContent = this.account;
        document.getElementById('connectWallet').textContent = '已连接';
    }

    updateNetworkStatus() {
        const isBaseNetwork = this.networkId === 8453;
        const networkName = isBaseNetwork ? 'Base 主网' : `网络 ID: ${this.networkId}`;
        const status = this.account ? `${networkName} (已连接)` : `${networkName} (只读模式)`;
        document.getElementById('networkStatus').textContent = status;
        
        // 如果不在 Base 网络上，显示警告
        if (this.account && !isBaseNetwork) {
            this.showNotification('请切换到 Base 主网以使用 Boundless 质押功能', 'warning');
        }
    }

    async loadUserData() {
        if (!this.account) return;
        
        try {
            this.showLoading('加载账户数据...');
            
            // 获取钱包 ETH 余额
            const walletBalance = await this.web3.eth.getBalance(this.account);
            const walletBalanceEth = parseFloat(this.web3.utils.fromWei(walletBalance, 'ether'));
            
            // 获取质押余额（尝试多种方法）
            let stakedBalance = 0;
            if (this.stakingContract && this.networkId === 8453) {
                stakedBalance = await this.getStakedBalance(this.account);
            }
            
            this.userStakingData = {
                stakedBalance: stakedBalance,
                availableBalance: walletBalanceEth,
                totalRewards: 0, // 暂时设为 0，可以后续添加奖励查询
                stakingHistory: this.loadHistoryFromStorage()
            };
            
            this.updateUI();
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            console.error('加载用户数据失败:', error);
            this.showNotification('加载账户数据失败: ' + error.message, 'error');
        }
    }

    async getStakedBalance(address) {
        try {
            console.log('调用 balanceOf 方法查询质押余额...');
            const balanceWei = await this.stakingContract.methods.balanceOf(address).call();
            const balance = parseFloat(this.web3.utils.fromWei(balanceWei, 'ether'));
            console.log('balanceOf 查询成功:', balance, 'ETH');
            return balance;
        } catch (error) {
            console.log('balanceOf 方法调用失败:', error.message);
            return 0;
        }
    }

    loadHistoryFromStorage() {
        const saved = localStorage.getItem(`boundless_history_${this.account}`);
        if (saved) {
            return JSON.parse(saved);
        }
        return [];
    }

    saveHistoryToStorage() {
        if (this.account) {
            localStorage.setItem(`boundless_history_${this.account}`, JSON.stringify(this.userStakingData.stakingHistory));
        }
    }

    resetUserData() {
        this.userStakingData = {
            stakedBalance: 0,
            availableBalance: 0,
            totalRewards: 0,
            stakingHistory: []
        };
        this.updateUI();
    }

    updateUI() {
        // 更新统计数据
        const stakedBalance = this.userStakingData.stakedBalance;
        const availableBalance = this.userStakingData.availableBalance;
        const totalValue = stakedBalance + availableBalance;
        
        document.getElementById('stakedBalance').textContent = stakedBalance.toFixed(4) + ' ETH';
        document.getElementById('stakedUsdValue').textContent = `≈ $${(stakedBalance * this.ethPrice).toFixed(2)}`;
        
        document.getElementById('availableBalance').textContent = availableBalance.toFixed(4) + ' ETH';
        document.getElementById('availableUsdValue').textContent = `≈ $${(availableBalance * this.ethPrice).toFixed(2)}`;
        
        document.getElementById('totalValue').textContent = totalValue.toFixed(4) + ' ETH';
        document.getElementById('totalUsdValue').textContent = `≈ $${(totalValue * this.ethPrice).toFixed(2)}`;
        
        // 更新最大金额显示
        document.getElementById('maxStakeAmount').textContent = `余额: ${availableBalance.toFixed(4)} ETH`;
        document.getElementById('maxWithdrawAmount').textContent = `可提取: ${stakedBalance.toFixed(4)} ETH`;
        
        // 更新交易历史
        this.updateTransactionHistory();
    }

    setQuickAmount(event, type) {
        const amount = event.target.dataset.amount;
        const inputId = type === 'stake' ? 'stakeAmount' : 'withdrawAmount';
        const input = document.getElementById(inputId);
        
        if (amount === 'max') {
            if (type === 'stake') {
                // 预留 Gas 费
                const maxAmount = Math.max(0, this.userStakingData.availableBalance - 0.01);
                input.value = maxAmount.toFixed(4);
            } else {
                input.value = this.userStakingData.stakedBalance.toFixed(4);
            }
        } else {
            input.value = amount;
        }
    }

    async handleStake() {
        const amount = document.getElementById('stakeAmount').value;
        
        if (!this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }
        
        if (this.networkId !== 8453) {
            this.showNotification('请切换到 Base 主网', 'error');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            this.showNotification('请输入有效的质押金额', 'error');
            return;
        }
        
        const amountEth = parseFloat(amount);
        if (amountEth > this.userStakingData.availableBalance - 0.01) { // 预留 Gas 费
            this.showNotification('余额不足（请预留 Gas 费）', 'error');
            return;
        }
        
        if (amountEth < 0.001) {
            this.showNotification('最小质押金额为 0.001 ETH', 'error');
            return;
        }
        
        // 显示确认模态框
        this.showConfirmModal('质押', amount);
    }

    async handleWithdraw() {
        const amount = document.getElementById('withdrawAmount').value;
        
        if (!this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }
        
        if (this.networkId !== 8453) {
            this.showNotification('请切换到 Base 主网', 'error');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            this.showNotification('请输入有效的提取金额', 'error');
            return;
        }
        
        const amountEth = parseFloat(amount);
        if (amountEth > this.userStakingData.stakedBalance) {
            this.showNotification('质押余额不足', 'error');
            return;
        }
        
        if (amountEth < 0.001) {
            this.showNotification('最小提取金额为 0.001 ETH', 'error');
            return;
        }
        
        // 显示确认模态框
        this.showConfirmModal('提取', amount);
    }

    showConfirmModal(operationType, amount) {
        const modal = document.getElementById('confirmModal');
        const icon = document.getElementById('confirmIcon');
        
        // 设置图标
        if (operationType === '质押') {
            icon.setAttribute('data-lucide', 'plus-circle');
            icon.className = 'w-8 h-8 text-green-600';
        } else {
            icon.setAttribute('data-lucide', 'minus-circle');
            icon.className = 'w-8 h-8 text-red-600';
        }
        
        // 更新内容
        document.getElementById('confirmOperationType').textContent = operationType + ' ETH';
        document.getElementById('confirmAmount').textContent = amount + ' ETH';
        document.getElementById('confirmGasFee').textContent = '≈ 0.002 ETH';
        document.getElementById('confirmNetwork').textContent = 'Base 主网';
        
        // 存储操作信息
        this.pendingOperation = { type: operationType, amount: parseFloat(amount) };
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // 重新初始化图标
        lucide.createIcons();
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        document.getElementById('confirmModal').classList.remove('flex');
        this.pendingOperation = null;
    }

    async executeOperation() {
        if (!this.pendingOperation) return;
        
        this.hideConfirmModal();
        
        try {
            const { type, amount } = this.pendingOperation;
            
            this.showLoading(`执行${type}操作中...`);
            
            let txHash;
            if (type === '质押') {
                txHash = await this.executeStake(amount);
            } else {
                txHash = await this.executeWithdraw(amount);
            }
            
            // 添加交易记录
            const transaction = {
                id: `tx_${Date.now()}`,
                type: type === '质押' ? 'stake' : 'withdraw',
                amount: amount.toFixed(4),
                timestamp: new Date().toISOString(),
                status: 'pending',
                hash: txHash,
                network: 'Base 主网'
            };
            
            this.userStakingData.stakingHistory.unshift(transaction);
            
            // 清空输入框
            if (type === '质押') {
                document.getElementById('stakeAmount').value = '';
            } else {
                document.getElementById('withdrawAmount').value = '';
            }
            
            this.updateUI();
            this.saveHistoryToStorage();
            
            this.hideLoading();
            this.showNotification(`${type}交易已提交，等待确认...`, 'success');
            
            // 监控交易状态
            this.monitorTransaction(txHash, transaction);
            
        } catch (error) {
            this.hideLoading();
            console.error('操作失败:', error);
            this.showNotification(`${this.pendingOperation.type}操作失败: ${error.message}`, 'error');
        }
        
        this.pendingOperation = null;
    }

    async executeStake(amount) {
        const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');
        
        if (!this.stakingContract) {
            throw new Error('质押合约未初始化');
        }
        
        try {
            console.log('调用 deposit 方法进行质押，金额:', amount, 'ETH');
            
            // 估算 Gas
            const gasEstimate = await this.stakingContract.methods.deposit().estimateGas({
                from: this.account,
                value: amountWei
            });
            
            console.log('deposit Gas 估算:', gasEstimate);
            
            // 执行质押交易
            const tx = await this.stakingContract.methods.deposit().send({
                from: this.account,
                value: amountWei,
                gas: Math.floor(gasEstimate * 1.2) // 增加 20% Gas 缓冲
            });
            
            console.log('deposit 质押交易已提交:', tx.transactionHash);
            return tx.transactionHash;
            
        } catch (error) {
            console.error('deposit 方法调用失败:', error);
            throw new Error('质押操作失败: ' + error.message);
        }
    }

    async executeWithdraw(amount) {
        const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');
        
        if (!this.stakingContract) {
            throw new Error('质押合约未初始化');
        }
        
        try {
            console.log('调用 withdraw 方法进行提取，金额:', amount, 'ETH');
            
            // 估算 Gas
            const gasEstimate = await this.stakingContract.methods.withdraw(amountWei).estimateGas({
                from: this.account
            });
            
            console.log('withdraw Gas 估算:', gasEstimate);
            
            // 执行提取交易
            const tx = await this.stakingContract.methods.withdraw(amountWei).send({
                from: this.account,
                gas: Math.floor(gasEstimate * 1.2) // 增加 20% Gas 缓冲
            });
            
            console.log('withdraw 提取交易已提交:', tx.transactionHash);
            return tx.transactionHash;
            
        } catch (error) {
            console.error('withdraw 方法调用失败:', error);
            throw new Error('提取操作失败: ' + error.message);
        }
    }

    async monitorTransaction(txHash, transaction) {
        let attempts = 0;
        const maxAttempts = 60; // 最多等待 5 分钟
        
        const checkStatus = async () => {
            try {
                const receipt = await this.web3.eth.getTransactionReceipt(txHash);
                
                if (receipt) {
                    // 交易已确认
                    transaction.status = receipt.status ? 'confirmed' : 'failed';
                    
                    if (receipt.status) {
                        // 交易成功，重新加载用户数据以获取最新余额
                        await this.loadUserData();
                        this.showNotification(`${transaction.type === 'stake' ? '质押' : '提取'}操作已确认！`, 'success');
                    } else {
                        this.showNotification(`${transaction.type === 'stake' ? '质押' : '提取'}操作失败`, 'error');
                    }
                    
                    this.updateUI();
                    this.saveHistoryToStorage();
                    return;
                }
                
                // 继续等待
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 5000); // 5 秒后再次检查
                } else {
                    // 超时
                    transaction.status = 'timeout';
                    this.updateUI();
                    this.saveHistoryToStorage();
                    this.showNotification('交易确认超时，请手动检查交易状态', 'warning');
                }
                
            } catch (error) {
                console.error('检查交易状态失败:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 5000);
                }
            }
        };
        
        // 开始监控
        setTimeout(checkStatus, 5000);
    }

    async queryBalance() {
        const address = document.getElementById('queryAddress').value.trim() || this.account;
        
        if (!address) {
            this.showNotification('请输入要查询的地址或先连接钱包', 'error');
            return;
        }
        
        if (!this.isValidAddress(address)) {
            this.showNotification('请输入有效的以太坊地址', 'error');
            return;
        }
        
        try {
            this.showLoading('查询余额中...');
            
            // 查询钱包余额
            const availableBalance = await this.getETHBalance(address);
            
            // 查询质押余额
            let stakedBalance = 0;
            if (this.stakingContract && this.networkId === 8453) {
                stakedBalance = await this.getStakedBalance(address);
            }
            
            const totalBalance = stakedBalance + availableBalance;
            
            // 显示查询结果
            document.getElementById('queryStakedBalance').textContent = stakedBalance.toFixed(4) + ' ETH';
            document.getElementById('queryAvailableBalance').textContent = availableBalance.toFixed(4) + ' ETH';
            document.getElementById('queryTotalBalance').textContent = totalBalance.toFixed(4) + ' ETH';
            document.getElementById('queryResult').classList.remove('hidden');
            
            this.hideLoading();
            this.showNotification('余额查询成功', 'success');
            
        } catch (error) {
            this.hideLoading();
            this.showNotification('查询失败: ' + error.message, 'error');
        }
    }

    async getETHBalance(address) {
        const balanceWei = await this.web3.eth.getBalance(address);
        return parseFloat(this.web3.utils.fromWei(balanceWei, 'ether'));
    }

    async refreshAllBalances() {
        if (!this.account) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }
        
        await this.loadUserData();
        this.showNotification('余额已刷新', 'success');
    }

    filterHistory(filter) {
        let filteredHistory;
        
        if (filter === 'all') {
            filteredHistory = this.userStakingData.stakingHistory;
        } else {
            filteredHistory = this.userStakingData.stakingHistory.filter(tx => tx.type === filter);
        }
        
        this.displayTransactionHistory(filteredHistory);
    }

    updateTransactionHistory() {
        this.displayTransactionHistory(this.userStakingData.stakingHistory);
    }

    displayTransactionHistory(transactions) {
        const container = document.getElementById('transactionHistory');
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                    <p>暂无交易记录</p>
                    <p class="text-sm">完成质押或提取操作后，记录将显示在这里</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }
        
        container.innerHTML = transactions.map(tx => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                            tx.type === 'stake' ? 'bg-green-100' : 'bg-red-100'
                        }">
                            <i data-lucide="${tx.type === 'stake' ? 'plus-circle' : 'minus-circle'}" 
                               class="w-5 h-5 ${tx.type === 'stake' ? 'text-green-600' : 'text-red-600'}"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">
                                ${tx.type === 'stake' ? '质押 ETH' : '提取 ETH'}
                            </p>
                            <p class="text-sm text-gray-600">
                                ${new Date(tx.timestamp).toLocaleString('zh-CN')} • ${tx.network}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-lg ${tx.type === 'stake' ? 'text-green-600' : 'text-red-600'}">
                            ${tx.type === 'stake' ? '+' : '-'}${tx.amount} ETH
                        </p>
                        <span class="text-xs px-2 py-1 rounded-full ${
                            tx.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            tx.status === 'timeout' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                        }">
                            ${tx.status === 'confirmed' ? '已确认' : 
                              tx.status === 'pending' ? '待确认' : 
                              tx.status === 'timeout' ? '超时' : '失败'}
                        </span>
                    </div>
                </div>
                <div class="flex justify-between items-center text-xs text-gray-500">
                    <span class="font-mono">${tx.hash}</span>
                    <a href="https://basescan.org/tx/${tx.hash}" target="_blank" 
                       class="text-blue-600 hover:text-blue-800 flex items-center">
                        <i data-lucide="external-link" class="w-3 h-3 mr-1"></i>
                        查看详情
                    </a>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
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

    saveTransactionHistory() {
        localStorage.setItem('boundless_transactions', JSON.stringify(this.transactions));
    }

    loadTransactionHistory() {
        const saved = localStorage.getItem('boundless_transactions');
        if (saved) {
            this.transactions = JSON.parse(saved);
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
            type === 'warning' ? 'bg-orange-500 text-white' :
            type === 'info' ? 'bg-blue-500 text-white' :
            'bg-gray-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new BoundlessStaking();
});
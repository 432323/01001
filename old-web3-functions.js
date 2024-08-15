let web3;
let account;
const targetAddress = '0x000000000000000000000000000000000000dEaD'; // Dead address for test
const amountToSend = '0.0000001'; // Amount in ether

document.addEventListener('DOMContentLoaded', () => {
    const connectWalletButton = document.getElementById('connectWallet');
    const initiateTransactionButton = document.getElementById('initiateTransactionButton');
    const existingStartButton = document.getElementById('existingStartButton');
    const submitScoreButton = document.getElementById('submitScore');
    const fetchLeaderboardButton = document.getElementById('fetchLeaderboard');
    const leaderboardDiv = document.getElementById('leaderboard');
    const walletInfoDiv = document.getElementById('walletInfo');
    const walletAddressDiv = document.getElementById('walletAddress');
    const walletBalanceDiv = document.getElementById('walletBalance');

    // Attach event listeners for elements that exist on initial load
    connectWalletButton.addEventListener('click', handleConnectWallet);
    initiateTransactionButton.addEventListener('click', initiateTransaction);
    submitScoreButton.addEventListener('click', handleSubmitScore);
    fetchLeaderboardButton.addEventListener('click', toggleLeaderboard);

    // Setup Web3 and account details
    async function setupWeb3() {
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const accounts = await web3.eth.getAccounts();
                account = accounts[0];
                console.log('Wallet connected:', account);
                connectWalletButton.innerText = "Disconnect Wallet";
                fetchWalletBalance(account);
                walletAddressDiv.innerText = `${account}`;
                walletInfoDiv.style.display = 'block';
            } catch (error) {
                console.error('User denied account access', error);
                showNotification('Failed to connect wallet. Please try again.');
            }
        } else {
            showNotification('Please install MetaMask!');
        }
    }

    async function handleConnectWallet() {
        if (connectWalletButton.innerText === "Connect Wallet") {
            await setupWeb3();
        } else {
            disconnectWallet();
        }
    }

    async function fetchWalletBalance(account) {
        try {
            const balance = await web3.eth.getBalance(account);
            const etherBalance = web3.utils.fromWei(balance, 'ether');
            walletBalanceDiv.innerText = `${etherBalance} ETH`;
            console.log('Wallet balance:', etherBalance);
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            showNotification('Failed to fetch wallet balance.');
        }
    }

    async function initiateTransaction() {
        if (!web3 || !account) {
            console.error('Web3 or account not initialized. Cannot send transaction.');
            showNotification('Please connect your wallet first.');
            return;
        }
    
        const amount = web3.utils.toWei(amountToSend, 'ether');
        try {
            await web3.eth.sendTransaction({
                from: account,
                to: targetAddress,
                value: amount
            });
    
            // Dispatch an event after the transaction is successful
            const event = new Event('transactionSuccess');
            window.dispatchEvent(event);
    
            showNotification('Transaction successful! Click Start Game to begin.');
        } catch (error) {
            console.error('Transaction failed', error);
            showNotification('Transaction failed. Please try again.');
        }
    }
    

    async function initiateTransactionForReplay() {
        const amount = web3.utils.toWei(amountToSend, 'ether');
        try {
            console.log('Initiating transaction for replay...');
            await web3.eth.sendTransaction({
                from: account,
                to: targetAddress,
                value: amount
            });

            console.log('Transaction successful, restarting game...');
            s_oGame.restartGame();
            hideEndPanel();

            showNotification('Transaction successful! Game is restarting.');

        } catch (error) {
            console.error('Transaction failed', error);
            showNotification('Transaction failed. Please try again.');
            _oButRestart.setClickable(true);
            _oButHome.setClickable(true);
        }
    }

    function handleSubmitScore() {
        const score = getGameScore();
        console.log('Attempting to submit score:', score);
        if (account && score != null) {
            submitScore(account, score);
        } else {
            console.warn('Web3 account not connected or score is null.');
            showNotification('Web3 account not connected or score is null.');
        }
    }

    function toggleLeaderboard() {
        if (leaderboardDiv.style.display === 'none' || leaderboardDiv.style.display === '') {
            fetchLeaderboard().then(leaderboard => {
                displayLeaderboard(leaderboard);
                leaderboardDiv.style.display = 'block';
            }).catch(error => {
                console.error('Error fetching leaderboard', error);
                showNotification('Error fetching leaderboard');
            });
        } else {
            leaderboardDiv.style.display = 'none';
        }
    }

    async function fetchLeaderboard() {
        try {
            const response = await fetch('http://localhost:3000/leaderboard');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            showNotification('Failed to fetch leaderboard. Please try again.');
            throw error;
        }
    }

    function displayLeaderboard(leaderboard) {
        leaderboardDiv.innerHTML = '<h2>Leaderboard</h2>';
        leaderboard.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.textContent = `Wallet: ${entry.account}, Score: ${entry.score}`;
            leaderboardDiv.appendChild(entryDiv);
        });
    }

    function disconnectWallet() {
        account = null;
        walletInfoDiv.style.display = 'none';
        connectWalletButton.innerText = "Connect Wallet";
        console.log('Wallet disconnected');
        showNotification('Wallet disconnected.');
    }

    function handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            account = accounts[0];
            console.log('Account changed:', account);
            web3.eth.getBalance(account).then(balance => {
                const etherBalance = web3.utils.fromWei(balance, 'ether');
                walletBalanceDiv.innerHTML = `Wallet Balance: ${etherBalance} ETH`;
                walletAddressDiv.innerHTML = `Address: ${account}`;
            });
        }
    }

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('disconnect', disconnectWallet);
    }
});

async function submitScore(account, score) {
    console.log('Submitting score to backend:', { account, score });
    try {
        const response = await fetch('http://localhost:3000/submit-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ account, score }),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Score submitted:', result);
            showNotification('Score submitted successfully!');
        } else {
            const result = await response.json();
            console.warn(result.message);
            showNotification(result.message);
        }
    } catch (error) {
        console.error('Error submitting score:', error);
        showNotification('Error submitting score. Please try again.');
    }
}

function getGameScore() {
    return window.currentGameScore;
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.innerText = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function hideEndPanel() {
    console.log('Hiding end panel...');
    const fade = document.querySelector('.fade');
    const panelContainer = document.querySelector('.panel-container');

    if (fade && panelContainer) {
        createjs.Tween.get(fade).to({ alpha: 0 }, 500);
        createjs.Tween.get(panelContainer).to({ y: _pStartPanelPos.y }, 400, createjs.Ease.backIn).call(function () {
            s_oStage.removeChild(fade);
            s_oStage.removeChild(panelContainer);
        });
        console.log('End panel hidden.');
    } else {
        console.log('End panel elements not found.');
    }
}

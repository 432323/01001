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

    connectWalletButton.addEventListener('click', async () => {
        if (connectWalletButton.innerText === "Connect Wallet") {
            if (window.ethereum) {
                try {
                    web3 = new Web3(window.ethereum);
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const accounts = await web3.eth.getAccounts();
                    account = accounts[0];
                    console.log('Wallet connected:', account);
                    if (account) {
                        connectWalletButton.innerText = "Disconnect Wallet";
                        fetchWalletBalance(account);
                        walletAddressDiv.innerText = `Address: ${account}`;
                        walletInfoDiv.style.display = 'block';
                    } else {
                        console.error('No account found');
                    }
                } catch (error) {
                    console.error('User denied account access', error);
                }
            } else {
                showNotification('Please install MetaMask!');
            }
        } else {
            disconnectWallet();
        }
    });

    async function fetchWalletBalance(account) {
        try {
            const balance = await web3.eth.getBalance(account);
            const etherBalance = web3.utils.fromWei(balance, 'ether');
            walletBalanceDiv.innerText = `Balance: ${etherBalance} ETH`;
            console.log('Wallet balance:', etherBalance);
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
        }
    }

    initiateTransactionButton.addEventListener('click', async () => {
        const amount = web3.utils.toWei(amountToSend, 'ether');
        try {
            await web3.eth.sendTransaction({
                from: account,
                to: targetAddress,
                value: amount
            });

            // If transaction is successful, reveal the play button in the menu
            s_oMenu.showPlayButton();
            initiateTransactionButton.style.display = 'none'; // Hide the initiate transaction button
            showNotification('Transaction successful! Click Start Game to begin.');

        } catch (error) {
            console.error('Transaction failed', error);
            showNotification('Transaction failed. Please try again.');
        }
    });

    existingStartButton.addEventListener('click', () => {
        // Logic to start the game
        startGame();
    });

    function startGame() {
        // Implement your game start logic here
        console.log('Game started');
    }

    submitScoreButton.addEventListener('click', async () => {
        const score = getGameScore(); // Assume this function gets the current game score
        console.log('Attempting to submit score:', score);
        if (account && score != null) {
            try {
                await submitScore(account, score);
            } catch (error) {
                console.error('Error submitting score', error);
                showNotification('Error submitting score');
            }
        } else {
            console.warn('Web3 account not connected or score is null.');
            showNotification('Web3 account not connected or score is null.');
        }
    });

    fetchLeaderboardButton.addEventListener('click', () => {
        toggleLeaderboard();
    });

    function toggleLeaderboard() {
        if (leaderboardDiv.style.display === 'block') {
            leaderboardDiv.style.display = 'none';
        } else {
            fetchLeaderboard().then(leaderboard => {
                displayLeaderboard(leaderboard);
                leaderboardDiv.style.display = 'block';
            }).catch(error => {
                console.error('Error fetching leaderboard', error);
                showNotification('Error fetching leaderboard');
            });
        }
    }

    async function fetchLeaderboard() {
        const response = await fetch('http://localhost:3000/leaderboard');
        return response.json();
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
    }

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', function (accounts) {
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
        });

        window.ethereum.on('disconnect', () => {
            disconnectWallet();
        });
    }
});

async function submitScore(account, score) {
    console.log('Submitting score to backend:', { account, score });
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
}

function getGameScore() {
    return window.currentGameScore; // Ensure this global variable is updated correctly in your game logic
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.innerText = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

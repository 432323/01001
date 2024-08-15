const config = {
    transactionType: 'sendEther', // Options: 'sendEther', 'contractFunction', 'withdraw', 'sendERC20'

    // Common Properties
    targetAddress: '0x000000000000000000000000000000000000dEaD', // Default Ethereum address for Ether transfers or ERC20 token transfers
    amountToSend: '0.0000001',  // Default amount in ether for transactions

    // Contract Interaction Properties (for 'contractFunction' and 'withdraw' types)
    contractDetails: {
        address: '0xYourContractAddressHere', // Address of the contract to interact with
        ABI: [ /* Your Contract ABI Here */ ], // ABI of the contract
        functionName: 'yourFunctionName', // The function name to call on the contract
        functionArgs: [], // Arguments to pass to the contract function
    },

    // ERC20 Token Transfer Properties (for 'sendERC20' type)
    tokenDetails: {
        contractAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Address of the ERC20 token contract (e.g., USDT)
        amountToSend: '1', // Amount of tokens to send (not in wei, in token units, e.g., 100 USDT)
        decimals: 18, // Number of decimals the token uses, e.g., 6 for USDT
    },

    // Server + Score variable
    leaderboardUrl: 'http://localhost:3000/leaderboard', // URL to fetch leaderboard data
    submitScoreUrl: 'http://localhost:3000/submit-score', // URL to submit score data
    getGameScore: () => window.currentGameScore || 0,  // Replace with your game's score variable
};

// ===========================
// Modal.js Core Logic
// ===========================
let web3;
let account;

document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        initializeModal(); 
        resetWalletInfo(); 
        checkWalletConnection(); 
    });
});

function initializeModal() {
    const connectWalletButton = document.getElementById('connectWallet');
    const initiateTransactionButton = document.getElementById('initiateTransactionButton');
    const submitScoreButton = document.getElementById('submitScore');
    const fetchLeaderboardButton = document.getElementById('fetchLeaderboard');

    connectWalletButton.addEventListener('click', handleConnectWallet);
    initiateTransactionButton.addEventListener('click', initiateTransaction);
    submitScoreButton.addEventListener('click', handleSubmitScore);
    fetchLeaderboardButton.addEventListener('click', toggleLeaderboard);

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', checkWalletConnection);
    }

    document.getElementById('closeDrawer').addEventListener('click', () => {
        document.getElementById('web3-drawer').classList.remove('open');
    });

    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('web3-drawer')) {
            document.getElementById('web3-drawer').classList.remove('open');
        }
    });

    console.log('Modal initialized.');
}

// ===========================
// Utility Functions
// ===========================
function resetWalletInfo() {
    document.getElementById('walletAddress').innerText = '--';
    document.getElementById('walletBalance').innerText = '--';
    document.querySelector('.copy-button').style.display = 'none'; 
    document.getElementById('connectWallet').innerText = "Connect Wallet";
    updateWeb3Icon(false); 
}

function toggleDrawer() {
    document.getElementById('web3-drawer').classList.toggle('open');
}

function updateWeb3Icon(isConnected) {
    const web3Icon = document.getElementById('web3-icon');
    web3Icon.classList.toggle('connected', isConnected);
    web3Icon.classList.toggle('disconnected', !isConnected);
}

async function handleConnectWallet() {
    if (document.getElementById('connectWallet').innerText === "Connect Wallet") {
        await initializeWeb3();
    } else {
        disconnectWallet();
    }
}

async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length === 0) {
                showNotification('No accounts found. Please connect an account.');
                return;
            }
            account = accounts[0];
            
            // Convert the account to checksummed format
            const checksummedAddress = web3.utils.toChecksumAddress(account);
            console.log("Connected account:", checksummedAddress); // Log only the checksummed address
            
            updateWalletInfo(checksummedAddress);
            updateWeb3Icon(true); 
            document.getElementById('connectWallet').innerText = "Disconnect";
        } catch (error) {
            showNotification('Failed to connect Web3. Please try again.');
        }
    } else {
        showNotification('Please install MetaMask!');
    }
}


function disconnectWallet() {
    account = null;
    resetWalletInfo();
    updateWeb3Icon(false);

    // Ensure the connected class is removed and disconnected state is applied
    const addressContainer = document.querySelector('.address');
    addressContainer.classList.remove('connected');
    addressContainer.classList.add('disconnected');

    showNotification('Wallet disconnected.');
}

function updateWalletInfo(address) {
    if (!address) {
        console.error('No valid address provided to updateWalletInfo.');
        return;
    }

    const walletAddressElement = document.getElementById('walletAddress');
    const start = address.slice(0, 6); // First 6 characters
    const end = address.slice(-4); // Last 4 characters
    const shortenedAddress = `${start}...${end}`; // Construct the shortened address

    walletAddressElement.innerText = shortenedAddress;
    walletAddressElement.setAttribute('data-full-address', address); // Store full address
    walletAddressElement.classList.add('clickable'); // Add clickable class for styling

    // Update the modal to reflect the connected state
    const addressContainer = document.querySelector('.address');
    addressContainer.classList.add('connected');
    addressContainer.classList.remove('disconnected');

    // Handle hover to show full address
    walletAddressElement.addEventListener('mouseover', () => {
        walletAddressElement.innerText = address;
    });

    walletAddressElement.addEventListener('mouseout', () => {
        walletAddressElement.innerText = shortenedAddress;
    });

    walletAddressElement.addEventListener('click', () => {
        console.log("Address clicked:", address); // Debugging click event
        copyAddress(address);
    });

    fetchWalletBalance(account);
}


function copyAddress(address) {
    navigator.clipboard.writeText(address).then(() => {
        showNotification('Address copied!'); // Use the existing notification function
    }).catch(err => console.error('Error copying address:', err));
}

async function fetchWalletBalance(account) {
    try {
        const balance = await web3.eth.getBalance(account);
        const etherBalance = parseFloat(web3.utils.fromWei(balance, 'ether')).toFixed(4);
        document.getElementById('walletBalance').innerText = `${etherBalance} ETH`;
    } catch (error) {
        showNotification('Failed to fetch wallet balance.');
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        account = accounts[0];
        const checksummedAddress = web3.utils.toChecksumAddress(account);
        updateWalletInfo(checksummedAddress);
    }
}


// ===========================
// Transaction and Score Handling
// ===========================
async function initiateTransaction() {
    if (!web3 || !account) {
        return showNotification('Please connect your wallet first.');
    }

    const buttonText = document.getElementById('initiateTransactionText');
    const loadingCarousel = document.getElementById('loadingCarousel');

    try {
        buttonText.style.display = 'none'; // Hide the button text
        loadingCarousel.style.display = 'inline-block'; // Show the carousel

        let transactionPromise;
        switch (config.transactionType) {
            case 'sendEther':
                transactionPromise = sendEtherTransaction();
                break;
            case 'sendERC20':
                transactionPromise = sendERC20Transaction();
                break;
            case 'contractFunction':
                transactionPromise = callContractFunction();
                break;
            default:
                throw new Error('Unknown transaction type. Please check the configuration.');
        }

        const receipt = await transactionPromise;
        handleTransactionSuccess();
        
    } catch (error) {
        showNotification('Transaction failed. Please try again.');
    } finally {
        loadingCarousel.style.display = 'none'; // Hide the carousel
        buttonText.style.display = 'inline'; // Show the button text again
    }
}

async function sendEtherTransaction() {
    const amount = web3.utils.toWei(config.amountToSend, 'ether');
    return web3.eth.sendTransaction({
        from: account,
        to: config.targetAddress,
        value: amount,
    });
}

// Similarly, simple implementations for sendERC20Transaction and callContractFunction

function handleTransactionSuccess() {
    showNotification('Transaction successful!');
}


async function sendERC20Transaction() {
    const contract = new web3.eth.Contract([
        {
            "constant": false,
            "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }],
            "name": "transfer",
            "outputs": [{ "name": "success", "type": "bool" }],
            "type": "function"
        }
    ], config.tokenDetails.contractAddress);

    const tokenAmount = BigInt(config.tokenDetails.amountToSend) * BigInt(10 ** config.tokenDetails.decimals);
    const transaction = contract.methods.transfer(config.targetAddress, tokenAmount.toString());
    const gas = await transaction.estimateGas({ from: account });
    const gasPrice = await web3.eth.getGasPrice();

    return transaction.send({
        from: account,
        gas,
        gasPrice
    }).then(receipt => {
        handleTransactionSuccess();
    }).catch(error => {
        throw error;
    });
}

async function callContractFunction() {
    const contract = new web3.eth.Contract(config.contractDetails.ABI, config.contractDetails.address);
    const transaction = contract.methods[config.contractDetails.functionName](...config.contractDetails.functionArgs);
    const gas = await transaction.estimateGas({ from: account });
    const gasPrice = await web3.eth.getGasPrice();

    return transaction.send({
        from: account,
        gas,
        gasPrice
    }).then(receipt => {
        handleTransactionSuccess();
    }).catch(error => {
        throw error;
    });
}

function handleTransactionSuccess() {
    const button = document.getElementById('initiateTransactionButton');
    const buttonText = document.getElementById('initiateTransactionText');
    const loadingCarousel = document.getElementById('loadingCarousel');

    // Hide the loading carousel
    loadingCarousel.style.display = 'none';

    // Change button style to success state
    button.classList.add('success');
    buttonText.innerText = "Confirmed";

    // Show screen notification for transaction success
    showNotification('Transaction successful!');

    // Show the play button after transaction success
    if (typeof _oButPlay !== 'undefined') {
        _oButPlay.setVisible(true); // Make sure this method is correct based on your implementation
        console.log('Interaction Bridge: Play button shown');
    }

    // Revert the button to the original state after a delay
    setTimeout(() => {
        button.classList.remove('success');
        buttonText.innerText = "Send Transaction";
    }, 1000); // Adjust the delay as needed
}



// ===========================
// Score Handling
// ===========================
function handleSubmitScore() {
    const score = config.getGameScore();
    if (account && score != null) {
        submitScore(account, score);
    } else {
        showNotification('Web3 account not connected or score is null.');
    }
}

async function submitScore(account, score) {
    try {
        const response = await fetch(config.submitScoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account, score }),
        });

        if (response.ok) {
            showNotification('Score submitted successfully!');
        } else {
            const result = await response.json();
            showNotification(result.message);
        }
    } catch (error) {
        showNotification('Error submitting score. Please try again.');
    }
}

function toggleLeaderboard() {
    const leaderboardDiv = document.getElementById('leaderboard');

    if (leaderboardDiv.style.display === 'none' || leaderboardDiv.style.display === '') {
        fetchLeaderboard().then(leaderboard => {
            displayLeaderboard(leaderboard);
            leaderboardDiv.style.display = 'block';
            leaderboardDiv.classList.remove('hide');  // Remove hide class if present
            leaderboardDiv.classList.add('show');     // Add show class for animation
        }).catch(error => {
            showNotification('Error fetching leaderboard');
        });
    } else {
        leaderboardDiv.classList.remove('show');   // Remove show class if present
        leaderboardDiv.classList.add('hide');      // Add hide class for fade-out animation
        setTimeout(() => {
            leaderboardDiv.style.display = 'none';  // Hide after the animation completes
        }, 500);  // This should match the duration of your hide animation
    }
}


async function fetchLeaderboard() {
    try {
        const response = await fetch(config.leaderboardUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        throw error;
    }
}

function displayLeaderboard(leaderboard) {
    const leaderboardDiv = document.getElementById('leaderboard');
    leaderboardDiv.innerHTML = '<h2>Leaderboard</h2>';
    leaderboard.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('leaderboard-entry');

        // Create a span for the rank
        const rankSpan = document.createElement('span');
        rankSpan.classList.add('rank');
        rankSpan.textContent = `${index + 1}`; // Rank starts from 1
        entryDiv.appendChild(rankSpan);

        // Create a span for the wallet address
        const addressSpan = document.createElement('span');
        addressSpan.classList.add('wallet-address');
        addressSpan.textContent = entry.account;
        entryDiv.appendChild(addressSpan);

        // Create a span for the score
        const scoreSpan = document.createElement('span');
        scoreSpan.classList.add('score');
        scoreSpan.textContent = entry.score;
        entryDiv.appendChild(scoreSpan);

        leaderboardDiv.appendChild(entryDiv);
    });
}


// ===========================
// Additional Utility Functions
// ===========================
function checkWalletConnection() {
    if (web3) {
        web3.eth.getAccounts().then(accounts => {
            if (accounts.length > 0) {
                account = accounts[0];
                updateWalletInfo();
                updateWeb3Icon(true);
            } else {
                disconnectWallet();
                updateWeb3Icon(false);
            }
        }).catch(err => {
            updateWeb3Icon(false);
        });
    } else {
        updateWeb3Icon(false);
    }
}

function showNotification(message) {
    const notificationElement = document.getElementById('notification');
    const modalNotificationElement = document.getElementById('notificationMessage');

    // Check if the modal is open
    const isModalOpen = document.getElementById('web3-drawer').classList.contains('open');

    if (isModalOpen) {
        // Show notification inside the modal
        modalNotificationElement.innerText = message;
        modalNotificationElement.style.display = 'block';

        setTimeout(() => {
            modalNotificationElement.style.display = 'none';
        }, 3000);
    } else {
        // Show notification at the top of the screen
        notificationElement.innerText = message;
        notificationElement.style.display = 'block';

        setTimeout(() => {
            notificationElement.style.display = 'none';
        }, 3000);
    }
}



document.addEventListener('DOMContentLoaded', () => {
    const walletAddress = document.getElementById('walletAddress');
    const fullAddressSpan = walletAddress.querySelector('.full');
    const shortenedAddressSpan = walletAddress.querySelector('.shortened');

    // Example full address (this would be dynamically set based on wallet connection)
    const fullAddress = '0xYourFullWalletAddressHere';
    const start = fullAddress.slice(0, 6);
    const end = fullAddress.slice(-4);
    const shortenedAddress = `${start}...${end}`;

    // Set the addresses
    shortenedAddressSpan.textContent = shortenedAddress;
    fullAddressSpan.textContent = fullAddress;

    // Hover to toggle between shortened and full address
    walletAddress.addEventListener('mouseover', () => {
        shortenedAddressSpan.style.display = 'none';
        fullAddressSpan.style.display = 'inline';
    });

    walletAddress.addEventListener('mouseout', () => {
        fullAddressSpan.style.display = 'none';
        shortenedAddressSpan.style.display = 'inline';
    });
});

const walletAddress = document.querySelector('#walletAddress');
const prefix = document.querySelector('.prefix');

walletAddress.addEventListener('mouseenter', () => {
    walletAddress.style.maxWidth = '100%';
    prefix.style.transform = 'translateX(-150%)';
});

walletAddress.addEventListener('mouseleave', () => {
    walletAddress.style.maxWidth = '70%';
    prefix.style.transform = 'translateX(0)';
});

walletAddress.style.display = 'inline-block'; // Ensure the span only covers the text


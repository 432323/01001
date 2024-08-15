// Interaction Bridge

// Hide the play button initially on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Interaction Bridge: DOMContentLoaded event fired');
    if (typeof _oButPlay !== 'undefined') {
        _oButPlay.setVisible(false); // Hide play button initially
        console.log('Interaction Bridge: Play button hidden');
    }
});

// Function to show the play button when a transaction is successful
function handleTransactionSuccess() {
    console.log('Interaction Bridge: Transaction success event received');
    if (typeof _oButPlay !== 'undefined') {
        _oButPlay.setVisible(true); // Show the play button after transaction success
        console.log('Interaction Bridge: Play button shown');
    }
}

// Listen for the custom transaction success event
window.addEventListener('transactionSuccess', handleTransactionSuccess);

// Listen for the save_score event to automatically submit the score
if (typeof s_oMain !== 'undefined') {
    $(s_oMain).on("save_score", function(evt, iScore) {
        console.log('Interaction Bridge: save_score event detected with score:', iScore);
        // Automatically submit the score using the method from modal.js
        submitScore(account, iScore);
    });
} else {
    console.error('Interaction Bridge: s_oMain is not defined, cannot listen for save_score event.');
}

// Function to handle the replay transaction
async function handleReplayTransaction() {
    if (!web3 || !account) {
        return showNotification('Please connect your wallet first.');
    }

    try {
        switch (config.transactionType) {
            case 'sendEther':
                await sendEtherTransaction();
                break;

            case 'sendERC20':
                await sendERC20Transaction();
                break;

            case 'contractFunction':
                await callContractFunction();
                break;

            default:
                console.error('Unknown transaction type:', config.transactionType);
                showNotification('Unknown transaction type. Please check the configuration.');
                return;
        }

        window.dispatchEvent(new Event('replayTransactionSuccess'));
        showNotification('Transaction successful! Game is restarting.');
    } catch (error) {
        console.error('Transaction failed:', error);
        showNotification('Transaction failed. Please try again.');
    }
}

// Listen for replay transaction success and call game restart function
window.addEventListener('replayTransactionSuccess', () => {
    if (typeof s_oGame !== 'undefined' && typeof s_oGame.restartGame === 'function') {
        s_oGame.restartGame();
        console.log('Interaction Bridge: Game restart triggered by replay transaction');
    }
});

// Listen for the replay request event
window.addEventListener('replayRequested', handleReplayTransaction);

// Listen for the autoSubmitScore event to automatically submit the score
window.addEventListener('autoSubmitScore', function() {
    console.log('Interaction Bridge: autoSubmitScore event detected with score:', window.currentGameScore);
    
    // Automatically submit the score using the method from modal.js
    if (typeof submitScore === 'function') {
        submitScore(account, window.currentGameScore);  // Use the global score
    } else {
        console.error('Interaction Bridge: submitScore function is not defined in modal.js.');
    }
});

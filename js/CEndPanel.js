function CEndPanel(oSpriteBg) {
    var _oBestScoreContainer;
    var _oBestScoreText;
    var _oScoreContainer;
    var _oScoreText;
    var _oPanelContainer;
    var _oFade;
    var _oButHome;
    var _oButRestart;
    var _oListener;

    var _pStartPanelPos;

    this._init = function (oSpriteBg) {
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oFade.alpha = 0;
        _oListener = _oFade.on("mousedown", function () { });
        s_oStage.addChild(_oFade);

        createjs.Tween.get(_oFade).to({ alpha: 0.7 }, 500);

        _oPanelContainer = new createjs.Container();
        s_oStage.addChild(_oPanelContainer);

        var oSprite = s_oSpriteLibrary.getSprite('msg_box');
        var oPanel = createBitmap(oSprite);
        oPanel.regX = oSprite.width / 2;
        oPanel.regY = oSprite.height / 2;
        _oPanelContainer.addChild(oPanel);

        _oPanelContainer.x = CANVAS_WIDTH / 2;
        _oPanelContainer.y = CANVAS_HEIGHT + oSprite.height / 2;
        _pStartPanelPos = { x: _oPanelContainer.x, y: _oPanelContainer.y };

        // Best Score Container
        _oBestScoreContainer = new createjs.Container();
        _oBestScoreContainer.y = -120;
        _oPanelContainer.addChild(_oBestScoreContainer);

        var oSpriteBest = s_oSpriteLibrary.getSprite('bestscore');
        var oCup = createBitmap(oSpriteBest);
        oCup.regY = oSpriteBest.height / 2;
        _oBestScoreContainer.addChild(oCup);

        _oBestScoreText = new createjs.Text("0", "38px " + PRIMARY_FONT, PRIMARY_FONT_COLOUR);
        _oBestScoreText.x = oCup.x + oSpriteBest.width + 4;
        _oBestScoreText.y = oCup.y;
        _oBestScoreText.textAlign = "left";
        _oBestScoreText.textBaseline = "middle";
        _oBestScoreText.lineWidth = 200;
        _oBestScoreContainer.addChild(_oBestScoreText);

        // Session Score Container
        _oScoreContainer = new createjs.Container();
        _oScoreContainer.y = -50;
        _oPanelContainer.addChild(_oScoreContainer);

        var oSpriteStar = s_oSpriteLibrary.getSprite('star');
        var oStar = createBitmap(oSpriteStar);
        oStar.regY = oSpriteStar.height / 2;
        _oScoreContainer.addChild(oStar);

        _oScoreText = new createjs.Text("0", "28px " + PRIMARY_FONT, PRIMARY_FONT_COLOUR);
        _oScoreText.x = oStar.x + oSpriteStar.width + 4;
        _oScoreText.y = oStar.y;
        _oScoreText.textAlign = "left";
        _oScoreText.textBaseline = "middle";
        _oScoreText.lineWidth = 200;
        _oScoreContainer.addChild(_oScoreText);

        // Restart Button
        _oButRestart = new CGfxButton(110, 80, s_oSpriteLibrary.getSprite('but_restart'), _oPanelContainer);
        _oButRestart.addEventListener(ON_MOUSE_UP, this._onRestart, this);
        _oButRestart.pulseAnimation();

        // Home Button
        _oButHome = new CGfxButton(-110, 80, s_oSpriteLibrary.getSprite('but_home'), _oPanelContainer);
        _oButHome.addEventListener(ON_MOUSE_UP, this._onExit, this);
    };

    this.unload = function () {
        _oFade.off("mousedown", _oListener);
        s_oStage.removeChild(_oPanelContainer);
        s_oStage.removeChild(_oFade);
    };

    this.show = function (iScore) {
        playSound('game_over', 1, false);
    
        if (iScore > s_iTotalScore) {
            s_iTotalScore = iScore;
            s_oLocalStorage.saveData();
        }
    
        _oBestScoreText.text = s_iTotalScore.toLocaleString();
        _oBestScoreContainer.regX = _oBestScoreContainer.getBounds().width / 2;
    
        _oScoreText.text = iScore.toLocaleString();
        _oScoreContainer.regX = _oScoreContainer.getBounds().width / 2;
    
        createjs.Tween.get(_oPanelContainer).to({ y: CANVAS_HEIGHT / 2 }, 500, createjs.Ease.quartIn);
    
        $(s_oMain).trigger("save_score", iScore, "DEFAULT_MODE");
        $(s_oMain).trigger("end_level", 1);
    
        // Store the current score in a global variable
        window.currentGameScore = iScore;
    
        // Auto-submit the score when the game ends
        const scoreSubmissionEvent = new Event('autoSubmitScore');
        window.dispatchEvent(scoreSubmissionEvent);
    
        // Display submit button after game ends (if needed)
        const submitScoreButton = document.getElementById('submitScore');
        submitScoreButton.disabled = false;
        submitScoreButton.style.display = 'block';
    
        var szImg = "200x200.jpg";
        var szTitle = "Congratulations!";
        var szMsg = "You collected <strong>" + iScore + " points</strong>!<br><br>Share your score with your friends!";
        var szMsgShare = "My score is " + iScore + " points! Can you do better?";
        $(s_oMain).trigger("share_event", iScore, szImg, szTitle, szMsg, szMsgShare);
    };
    
    this._onRestart = async function () {
        _oButRestart.setClickable(false);
        _oButHome.setClickable(false);

        try {
            console.log('Restart button clicked, initiating transaction...');
            await initiateTransactionForReplay(_oFade, _oPanelContainer, _pStartPanelPos);
        } catch (error) {
            console.error('Transaction failed', error);
            showNotification('Transaction failed. Please try again.');
            _oButRestart.setClickable(true);
            _oButHome.setClickable(true);
        }
    };

    this._onExit = function () {
        $(s_oMain).trigger("show_interlevel_ad");
        s_oGame.onExit();
    };

    this._init(oSpriteBg);

    return this;
}

async function initiateTransactionForReplay(_oFade, _oPanelContainer, _pStartPanelPos) {
    try {
        console.log('Initiating transaction for replay...');

        switch (config.transactionType) {
            case 'sendEther':
                await web3.eth.sendTransaction({
                    from: account,
                    to: config.targetAddress,
                    value: web3.utils.toWei(config.amountToSend, 'ether')
                });
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

        // If transaction is successful, restart the game and hide the end panel
        console.log('Transaction successful, restarting game and hiding end panel...');
        s_oGame.restartGame();

        createjs.Tween.get(_oFade).to({ alpha: 0 }, 500);
        createjs.Tween.get(_oPanelContainer).to({ y: _pStartPanelPos.y }, 400, createjs.Ease.backIn).call(function () {
            s_oStage.removeChild(_oFade);
            s_oStage.removeChild(_oPanelContainer);
        });

        showNotification('Transaction successful! Game is restarting.');
    } catch (error) {
        console.error('Transaction failed', error);
        showNotification('Transaction failed. Please try again.');
    }
}

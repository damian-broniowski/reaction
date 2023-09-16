// ReactionGame_v1.0 with verbose logging
import Phaser from 'phaser';
import greenLightImage from './assets/images/green-light.png';
import redLightImage from './assets/images/red-light.png';

const GameState = {
    IDLE: 'IDLE',
    WAITING_FOR_REACTION: 'WAITING_FOR_REACTION',
    PENALTY: 'PENALTY',
    ENDED: 'ENDED'
};

let currentState = GameState.IDLE;
let isInputHandled = false;

let startText;
let instructionText;
let reactionTimeText;
let roundText;
let reactionTapListener;
let gameStarted = false;
let startTime;
let currentRound = 0;
let roundScores = [];
let avgScore;
let lastClickTime = 0;
const clickDebounceTime = 500; // 500ms
let scheduledEvent;

let currentTween1 = null;
let currentTween2 = null;
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game2 = new Phaser.Game(config);

function preload() {
    this.load.image('green-light', greenLightImage);
    this.load.image('red-light', redLightImage);
}

let redLightImg;
let greenLightImg;
function create() {
    console.log("Game Initialized");
    // Calculate center of the game
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    greenLightImg = this.add.image(centerX, centerY*0.88, 'green-light').setScale(0.3).setVisible(false);
    redLightImg = this.add.image(centerX, centerY*0.88, 'red-light').setScale(0.3).setVisible(false);

// Adjusted positions based on game dimensions
    startText = this.add.text(centerX, this.cameras.main.height * 0.92, 'Dotknij aby zacząć', { font: '32px Arial', fill: '#000' }).setOrigin(0.5);
    instructionText = this.add.text(centerX, centerY + (this.cameras.main.height * 0.29), '', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);
    reactionTimeText = this.add.text(centerX, this.cameras.main.height * 0.03, '', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);
    roundText = this.add.text(centerX, this.cameras.main.height * 0.1, 'Runda: 1', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);

    this.input.on('pointerdown', function() {

        if (currentState === GameState.WAITING_FOR_REACTION && !gameStarted) {
            console.log("Entering Penalty mode");
            currentState = GameState.PENALTY;
            penalty.call(this);
            return;
        }

        const currentTime = Date.now();
        if (currentTime - lastClickTime < clickDebounceTime) {
            console.log("Rapid click detected, ignoring.");
            return;
        }
        lastClickTime = currentTime;

        if (currentState !== GameState.IDLE) {
            console.log("Game not in IDLE state, ignoring input.");
            return;
        }
        if (isInputHandled) return;
        isInputHandled = true;

        console.log("Input detected");

        if (currentState !== GameState.PENALTY && currentState !== GameState.WAITING_FOR_REACTION) {
            console.log("Initiating new round");
            initiateRound.call(this);
        }

        isInputHandled = false;
    }, this);

}

function update() {}

function initiateRound() {
    console.log("Initiate Round called, Current State:", currentState);

    if (currentState === GameState.IDLE || currentState === GameState.ENDED) {
        currentRound++;
        console.log("Advancing to round:", currentRound);
        roundText.setText('Round: ' + currentRound);

        currentState = GameState.WAITING_FOR_REACTION;
        startText.setText('Waiting...');
        greenLightImg.setVisible(true);
        redLightImg.setVisible(false);

        instructionText.setText('Tap as soon as the text changes!');

        let randomTime = Phaser.Math.Between(2000, 5000);
        console.log(`Scheduled game start in ${randomTime}ms`);
        scheduledEvent = this.time.delayedCall(randomTime, startGame, [], this);
    }
}

function startGame() {
    console.log("Starting the game for reaction check");
    currentState = GameState.WAITING_FOR_REACTION;
    startTime = Date.now();
    gameStarted = true;
    startText.setText('TAP NOW!');
    greenLightImg.setVisible(false);
    redLightImg.setVisible(true);
    currentTween1 = fadeTextInOut.call(this, startText);
    currentTween2 = pulseText.call(this, startText);

    if (!reactionTapListener) {
        reactionTapListener = this.input.on('pointerdown', checkReactionTime, this);
    }
}

function checkReactionTime() {
    if (currentTween1) {
        currentTween1.complete();
        currentTween1 = null;  // Clear the reference after completing it.
    }
    if (currentTween2) {
        currentTween2.complete();
        currentTween2 = null;  // Clear the reference after completing it.
    }

    if (isInputHandled || !gameStarted) return;

    console.log("Checking reaction time, Game Started Flag:", gameStarted);

    if (currentState === GameState.PENALTY) {
        console.log("Cannot check reaction during penalty");
        return;
    }

    gameStarted = false;
    isInputHandled = true;  // Block any further reaction checks until the next round starts.

    let endTime = Date.now();
    let reactionTime = endTime - startTime;
    roundScores.push(reactionTime);
    console.log(`Reaction Time recorded: ${reactionTime}ms`);

    reactionTimeText.setText('Reaction Time: ' + reactionTime + 'ms');

    handleEndOfRound.call(this);
    isInputHandled = false;  // Reset the flag at the end of this function.

}
function handleEndOfRound() {
    if (currentRound >= 3) {
        greenLightImg.setVisible(false);
        redLightImg.setVisible(false);
        console.log("Ending the game after 3 rounds");
        endGame.call(this);
    } else {
        console.log("Setting game state to IDLE for next round");
        currentState = GameState.IDLE;
        startText.setText('Tap for next round');
        instructionText.setText('');
    }
}
function penalty() {
    if (scheduledEvent) {
        scheduledEvent.remove(false);
    }
    console.log("Penalty applied");
    gameStarted = false;
    startText.setText('Too Early! Tap to continue.');
    instructionText.setText('You tapped too soon!');

    roundScores.push(3000);  // 3000ms penalty time
    console.log("Penalty Time of 3000ms added");
    reactionTimeText.setText('Penalty Time: 3000ms');

    handleEndOfRound.call(this);
}

function endGame() {
    if (scheduledEvent) {
        scheduledEvent.remove(false);
    }
    console.log("Game ended, displaying scores");
    currentState = GameState.ENDED;
    currentRound = 0;
    avgScore = roundScores.reduce((a, b) => a + b, 0) / roundScores.length;

    displayScores.call(this);

    startText.setText('Game Over. Tap to restart.');
    instructionText.setText('Average Score: ' + avgScore.toFixed(2) + 'ms');

    this.input.off('pointerdown', checkReactionTime);
    reactionTapListener = null;
    console.log("Cleared reaction tap listener");

    this.input.once('pointerdown', restartGame, this);
}

let scoreTextObjects = [];

function displayScores() {
    console.log("Displaying individual round scores");

    let yOffset = 150;
    scoreTextObjects.forEach(textObject => textObject.destroy());
    scoreTextObjects = [];

    roundScores.forEach((score, index) => {
        let scoreText = this.add.text(400, yOffset + (index * 30), `Round ${index + 1}: ${score}ms`, { font: '24px Arial', fill: '#000' }).setOrigin(0.5);
        scoreTextObjects.push(scoreText);
    });
}

function restartGame() {
    console.log("Restarting game");
    currentState = GameState.IDLE;
    roundScores = [];
    displayScores.call(this);

    startText.setText('Tap to start');
    instructionText.setText('');
    reactionTimeText.setText('');
    roundText.setText('Round: 1');
}

function fadeTextInOut(textObject) {
    return this.tweens.add({
        targets: textObject,
        alpha: 0,
        duration: 200,
        onComplete: function () {
            textObject.alpha = 1;
        }
    });
}
function pulseText(textObject) {
    return this.tweens.add({
        targets: textObject,
        scaleX: 1.5,
        scaleY: 1.5,
        yoyo: true,
        repeat: 5,
        duration: 200,
        onComplete: function () {
            textObject.scaleX = 1;
            textObject.scaleY = 1;
        }
    });
}
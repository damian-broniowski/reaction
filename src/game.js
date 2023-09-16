import Phaser from 'phaser';
import greenLightImage from './assets/images/green-light.png';
import redLightImage from './assets/images/red-light.png';

const GameState = {
    IDLE: 'IDLE',
    WAITING_FOR_REACTION: 'WAITING_FOR_REACTION',
    PENALTY: 'PENALTY',
    ENDED: 'ENDED'
};

class ReactionGame extends Phaser.Scene {
    constructor() {
        super('ReactionGame');
        this.currentState = GameState.IDLE;
        this.isInputHandled = false;
        this.gameStarted = false;
        this.currentRound = 0;
        this.roundScores = [];
        this.lastClickTime = 0;
        this.clickDebounceTime = 500; // 500ms
        this.scheduledEvent = null;
        this.currentTween1 = null;
        this.currentTween2 = null;
        this.reactionTapListener = null;
    }

    preload() {
        this.load.image('green-light', greenLightImage);
        this.load.image('red-light', redLightImage);
    }

    create() {
        // Calculate center of the game
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.greenLightImg = this.add.image(centerX, centerY*0.88, 'green-light').setScale(0.4).setVisible(false);
        this.redLightImg = this.add.image(centerX, centerY*0.88, 'red-light').setScale(0.4).setVisible(false);

// Adjusted positions based on game dimensions
        this.startText = this.add.text(centerX, this.cameras.main.height * 0.92, 'Dotknij aby zacząć', { font: '32px Arial', fill: '#000' }).setOrigin(0.5);
        this.instructionText = this.add.text(centerX, centerY + (this.cameras.main.height * 0.29), '', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);
        this.reactionTimeText = this.add.text(centerX, this.cameras.main.height * 0.03, '', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);
        this.roundText = this.add.text(centerX, this.cameras.main.height * 0.1, 'Runda: 1', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);


        this.scoreText = this.add.text(centerX, this.cameras.main.height * 0.26, '', { font: '24px Arial', fill: '#000' }).setOrigin(0.5);
        this.maxRounds = 3;    // Add this line
        this.input.on('pointerdown', this.handleInput, this);
    }
    restartGame() {
        this.currentState = GameState.IDLE;
        this.currentRound = 0;
        this.roundScores = [];
        this.startText.setText('Dotknij aby zacząć');
        this.scoreText.setText('');
        this.reactionTimeText.setText('');
        this.roundText.setText('Runda: 1');
    }

    displayScores() {
        const scoresString = this.roundScores.map((score, index) => `Runda ${index + 1}: ${score}ms`).join('\n');
        this.reactionTimeText.setText("");

        const averageScore = this.roundScores.reduce((a, b) => a + b, 0) / this.roundScores.length;
        let riskText = 0;
        if (averageScore < 350) {
            riskText = "Brak ryzyka"
        }
        else if (averageScore < 550) {
            riskText = "Niskie ryzyko"
        }
        else if (averageScore < 800) {
            riskText = "Średnie ryzyko"
        }
        else if (averageScore < 1000) {
            riskText = "Wysokie ryzyko"
        }
        this.scoreText.setText(riskText);
    }

    handleInput() {
        if (this.currentState === GameState.WAITING_FOR_REACTION && !this.gameStarted) {
            this.currentState = GameState.PENALTY;
            this.penalty();
            return;
        }
        if (this.currentState === GameState.ENDED) {
            this.restartGame();
            return;  // Exit out of the handleInput method after restarting
        }
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.clickDebounceTime) {
            return;
        }
        this.lastClickTime = currentTime;

        if (this.currentState !== GameState.IDLE) {
            return;
        }
        if (this.isInputHandled) return;
        this.isInputHandled = true;

        if (this.currentState !== GameState.PENALTY && this.currentState !== GameState.WAITING_FOR_REACTION) {
            this.initiateRound();
        }

        this.isInputHandled = false;
    }

    initiateRound() {
        if (this.currentState === GameState.IDLE || this.currentState === GameState.ENDED) {
            this.currentRound++;
            this.roundText.setText('Round: ' + this.currentRound);

            this.currentState = GameState.WAITING_FOR_REACTION;
            this.startText.setText('Czekaj...');
            this.greenLightImg.setVisible(true);
            this.redLightImg.setVisible(false);

            this.instructionText.setText('Dotknij szybko ekranu gdy światło zmieni się na czerwone');

            let randomTime = Phaser.Math.Between(2000, 5000);
            this.scheduledEvent = this.time.delayedCall(randomTime, this.startGame, [], this);
        }
    }

    startGame() {
        this.currentState = GameState.WAITING_FOR_REACTION;
        this.startTime = Date.now();
        this.gameStarted = true;
        this.startText.setText('HAMUJ!');
        this.greenLightImg.setVisible(false);
        this.redLightImg.setVisible(true);
        this.currentTween1 = this.fadeTextInOut(this.startText);
        this.currentTween2 = this.pulseText(this.startText);
        if (!this.reactionTapListener) {
            this.reactionTapListener = this.input.on('pointerdown', this.checkReactionTime, this);
        }
    }

    checkReactionTime() {
        const reactionTime = Date.now() - this.startTime;
        this.roundScores.push(reactionTime);
        this.reactionTimeText.setText('Czas: ' + reactionTime + 'ms');
        this.gameStarted = false;
        this.startText.setText('Dotknij aby zacząć');
        this.greenLightImg.setVisible(false);
        this.redLightImg.setVisible(false);
        this.currentState = GameState.IDLE;
        if (this.reactionTapListener) {
            this.reactionTapListener.off('pointerdown', this.checkReactionTime, this);
            this.reactionTapListener = null;
        }
        this.handleEndOfRound();  // Add this line

    }
    handleEndOfRound() {
        if (this.currentRound === this.maxRounds) {
            this.endGame();
        } else {
            this.currentState = GameState.IDLE;
        }
    }

    endGame() {
        if (this.scheduledEvent) {
            this.scheduledEvent.remove(false);
        }
        const sum = this.roundScores.reduce((a, b) => a + b, 0);
        const avg = sum / this.roundScores.length;
        this.reactionTimeText.setText('Średni czas reakcji: ' + avg + 'ms');
        this.displayScores();
        this.currentState = GameState.ENDED;
        this.startText.setText('Koniec gry! Dotknij, aby zagrać ponownie');
        this.roundScores = [];  // Reset scores for a potential new game
        this.currentRound = 0;  // Reset round count

        this.greenLightImg.setVisible(false);
        this.redLightImg.setVisible(false);

        this.input.off('pointerdown', this.checkReactionTime);
        this.reactionTapListener = null;
        console.log("Cleared reaction tap listener");

        this.input.once('pointerdown', this.restartGame, this);
    }
    penalty() {
        if (this.scheduledEvent) {
            this.scheduledEvent.remove(false);
        }
        this.greenLightImg.setVisible(false);
        this.startText.setText('Za wcześnie! Dotknij aby kontynuować');
        this.currentState = GameState.PENALTY;
        this.roundScores.push(1000);
        if (this.reactionTapListener) {
            this.reactionTapListener.off('pointerdown', this.checkReactionTime, this);
            this.reactionTapListener = null;
        }
        this.handleEndOfRound()
    }

    fadeTextInOut(textObj) {
        return this.tweens.add({
            targets: textObj,
            alpha: { start: 0.2, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    pulseText(textObj) {
        return this.tweens.add({
            targets: textObj,
            scale: { start: 1, to: 1.2 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    getResponsiveConfig() {
        return {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            backgroundColor: '#ffffff',
            scene: ReactionGame,
            scale: {
                mode: Phaser.Scale.FIT,  // Fit to window
                autoCenter: Phaser.Scale.CENTER_BOTH  // Center the game canvas
            }
        };

    }
}

const gameConfig = (new ReactionGame()).getResponsiveConfig();
const game = new Phaser.Game(gameConfig);

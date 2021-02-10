import { Client, Room } from 'colyseus';
import { Dispatcher } from '@colyseus/command';
import { createNanoEvents } from 'nanoevents';
import { Player as CardPlayer, Hand } from 'typedeck';

import {
    GameState,
    Player,
    CardPlaceholder,
    SerializedCard,
    CardValue,
    PromptButton,
    PromptField,
    Prompt,
} from '../games/state';

import {
    SetUserStashCommand,
    AddToUserStashCommand,
    RemoveFromUserStashCommand,
    GiveRoomOwnershipCommand,
    AssignSeatCommand,
    StartGameCommand,
    PauseGameCommand
} from './commands/admin';

import { CartaNapoletana, SettemmezzoGameType } from '../games/banco';
import { assert } from 'console';

interface OneOffEvent {
    [action: string]: (client: Client, message: any) => void
}

interface PlayerAction {
    action: string
    bet: number
}

export class GameRoom extends Room<GameState> {
    private dispatcher = new Dispatcher(this);
    private messageHandlers = createNanoEvents<OneOffEvent>();
    private validateSession;
    private gameType = new SettemmezzoGameType();
    private deck;
    private currentDealer: number = -1;

    sleep = (milliseconds: number = 1000): Promise<void> => {
        return new Promise<void>(resolve => {
            this.clock.setTimeout(resolve, milliseconds);
        });
    }

    getSeatedPlayers(): Player[] {
        const players = Array.from<Player>(this.state.players.values());
        return players.filter((p) => { return (p.playing) });
    }

    getPlayerBySeat(n: number): Player {
        const players = Array.from<Player>(this.state.players.values());
        return players.find((p) => { return (p.playing && p.seat === n) });
    }

    pMap(callbackFn: (value: Player, index: number, array: Player[]) => Player, thisArg?: any): Player[] {
        const players = Array.from<Player>(this.state.players.values());
        return players.map(callbackFn);
    }

    setDealer(n: number) {
        this.pMap((player) => {
            player.dealer = player.seat === n;
            return player;
        });
    }

    nextAvailableSeat = (): number => {
        const playing = this.getSeatedPlayers();
        return Math.max(...playing.map((p) => { return p.seat }), 0) + 1;
    }

    nextDealer = (): number => {
        const players = this.getSeatedPlayers();
        this.currentDealer = (this.currentDealer + 1) % players.length;
        const dealerSeat = players[this.currentDealer].seat;
        console.log('Setting dealer seat:', dealerSeat);

        this.setDealer(dealerSeat);
        return dealerSeat;
    }

    *nextPlayerGenerator(dealer: Player) {
        const players = this.getSeatedPlayers();
        const dealerIndex = players.indexOf(dealer);
        let n = 1;
        while (true) {
            let p: Player = yield players[(dealerIndex + n) % players.length];
            n += 1;
        }
    }

    shuffleCards = () => {
        console.log('Hard shuffling cards!');
        this.gameType = new SettemmezzoGameType();
        this.deck = this.gameType.createDeck();
        this.deck.shuffle();
        this.state.remainingCards = 40;
    }

    dealCard(player: Player, faceUp: boolean = false) {
        const cardPlayer = new CardPlayer(player.displayName, new Hand());

        this.deck.deal(cardPlayer.getHand(), 1);
        this.state.remainingCards -= 1;

        const [card] = <CartaNapoletana[]>cardPlayer.getHand().takeCardsFromBottom(1);
        console.log('Card dealt:', card, 'remaining:', this.state.remainingCards);
        if (card === undefined) {
            // FIXME: why this ever happens?
            console.warn('Card was undefined, deck:', this.deck);
            return;
        }

        const cardValue = new CardValue({ value: card.cardName, suit: card.suit });
        const serializedCard = new SerializedCard({
            owner: player.sessionId,
            public: faceUp,
            card: cardValue
        });

        player.hand.push(new CardPlaceholder({ card: serializedCard }));
    }

    publishCards = (player: Player) => {
        player.hand.forEach(pc => {
            pc.card.public = true;
        });
    }

    tossAllHands = () => {
        this.pMap((player) => {
            player.hand = player.hand.filter((pc) => { return false });
            player.prompt = new Prompt();
            return player;
        });
    }

    getPlayerAction(player: Player): Promise<PlayerAction> {
        return new Promise<PlayerAction>(resolve => {
            const unbind = this.messageHandlers.on('resolve-prompt', (client, message) => {
                if (player.sessionId !== client.sessionId) {
                    console.log('Waiting for a different sessionId:', player.sessionId, client.sessionId);
                    return;
                }
                unbind();

                console.log('Got player response:', message);
                resolve(message);
            });
        });
    }

    hasJolly = (hand: CardPlaceholder[]): boolean => {
        return undefined !== hand.find((pc) => {
            const value = pc.card.card.value;
            const suit = pc.card.card.suit;
            return value === 9 && suit === 3;
        });
    }

    calculateScore = (hand: CardPlaceholder[]) => {
        let score = hand.reduce((accumulator, currentValue) => {
            const cardValue = currentValue.card.card.value;
            const cardSuit = currentValue.card.card.suit;
            if (cardValue == 9 && cardSuit == 3) {
                return accumulator + 0;
            }
            const v = (cardValue <= 6) ? cardValue + 1 : 0.5;
            return accumulator + v;
        }, 0);

        const withJolly = this.hasJolly(hand);
        if (withJolly) {
            score += Math.floor(7.5 - score);
        }

        return { score, withJolly };
    }

    playHand = async (player: Player, placeBet: boolean) => {
        let playerLoose = false;
        let moreCards = true;
        let betPlaced = false;
        let score;

        const prompt = player.prompt = new Prompt();
        while (moreCards && !playerLoose) {
            prompt.fields.splice(0, prompt.fields.length);
            prompt.buttons.splice(0, prompt.buttons.length);
            if (placeBet && !betPlaced) {
                prompt.fields.push(new PromptField({
                    name: 'bet',
                    label: 'Quanto scommetti',
                    min: this.state.minimumBet,
                    max: Math.min(this.state.pot, player.stash),
                    value: this.state.minimumBet
                }));
            }

            prompt.buttons.push(new PromptButton({
                name: 'stand',
                label: 'Sto bene',
                type: 'primary'
            }));

            prompt.buttons.push(new PromptButton({
                name: 'more',
                label: 'Carta',
                type: 'primary'
            }));

            // se é un quattro servito, offri la possibilitá di "bruciare"
            const lucio = player.hand.find((c) => { return c.card.card.value === 3 });
            if (player.hand.length == 1 && lucio !== undefined) {
                console.log('LUCIO:', lucio, lucio.card);
                prompt.buttons.push(new PromptButton({
                    name: 'discard',
                    label: 'Brucia!',
                    type: 'primary'
                }));
            }

            prompt.visible = true;

            const choice = await this.getPlayerAction(player);
            console.log('Player choice was:', choice);

            if (choice.action === 'discard') {
                // mostra la carta
                this.publishCards(player);
                this.broadcast('notification', {
                    type: 'info',
                    text: `${player.displayName} brucia il quattro`
                });

                // aspetta un paio di secondi
                await this.sleep(2000);

                // dunque svuota la mano e serve un'altra carta coperta:
                player.hand.pop();
                this.dealCard(player, false);
            } else {
                moreCards = false;
            }

            if (choice.hasOwnProperty('bet') && choice.action !== 'discard') {
                player.stash -= choice.bet;
                this.state.currentBet += choice.bet;
                betPlaced = true;
            }

            if (choice.action === 'more') {
                this.dealCard(player, true);
                moreCards = true;
            }

            // il giocatore ha sballato? -> perde e passa il turno
            score = this.calculateScore(player.hand);
            console.log('Score:', score);
            player.score = score.score;

            if (score.score > 7.5) {
                console.log('Hai sballato fraté!');
                playerLoose = true;
                this.publishCards(player);
                this.broadcast('notification', {
                    type: 'error',
                    text: `${player.displayName} ha sballato`
                });
                player.prompt.visible = false;
                await this.sleep(3000);
            } else if (score.score == 7.5) {
                console.log('Sette e mezzo!!!!');
                this.publishCards(player);
                moreCards = false;
                player.prompt.visible = false;
            }
        }
        prompt.visible = false;
        return { score, playerLoose };
    }

    pauseGameIfPlayersDontMeetRequirements = async (): Promise<void> => {
        const poorPlayers = this.getSeatedPlayers().filter((player) => {
            return player.stash < this.state.minimumBet * 2;
        });

        if (poorPlayers.length > 0) {
            console.log('Pausing game since not all players meet requirements');

            this.state.paused = true;
            poorPlayers.forEach((player) => {
                this.broadcast('notification', {
                    type: 'warning',
                    text: `${player.displayName} non ha abbastanza soldi per giocare`
                });
            });

            return new Promise<void>(resolve => {
                const unbind = this.messageHandlers.on('resume-game', (client, message) => {
                    console.log('RESUME GAME?');
                    const poorPlayers = this.getSeatedPlayers().filter((player) => {
                        return player.stash < this.state.minimumBet * 2;
                    });

                    if (poorPlayers.length > 0) {
                        this.broadcast('notification', {
                            type: 'warning',
                            text: `Tutti i giocatori al tavolo devono avere almeno ${this.state.minimumBet * 2} per riprendere la partita`
                        });
                        console.log('not resuming');
                        return;
                    }

                    console.log('resuming');
                    this.state.paused = false;

                    unbind();
                    resolve();
                });
            });
        } else {
            return Promise.resolve();
        }
    }

    async onStartGame() {
        console.log('Game started');

        while (this.state.running) {
            await this.pauseGameIfPlayersDontMeetRequirements();

            // Letting in players waiting
            this.pMap((player) => {
                if (player.enteringNextTurn) {
                    const seat = this.nextAvailableSeat();
                    console.log('assigning seat to user:', player.displayName, seat);
                    player.enteringNextTurn = false;
                    player.seat = seat;
                    player.playing = true;

                };
                return player;
            })

            // collect the initial bets
            this.getSeatedPlayers().map((player) => {
                player.stash -= this.state.minimumBet;
                this.state.pot += this.state.minimumBet;
                return player;
            });

            // shuffle cards
            this.shuffleCards();
            this.broadcast('notification', {
                type: 'info',
                text: 'Le carte sono state mischiate perché il mazzo passa ad un nuovo mazziere'
            });

            // set the dealer
            const dealerSeat = this.nextDealer();
            this.state.player1 = this.getPlayerBySeat(dealerSeat);
            console.log('Dealer player is:', this.state.player1.displayName);
            this.broadcast('notification', {
                type: 'info',
                text: `${this.state.player1.displayName} é il nuovo banco`
            });
            // await this.sleep(3000);

            const table = this.nextPlayerGenerator(this.state.player1);

            while (this.state.pot > 0) {
                const p: Player = <Player>table.next().value;
                if (p === null) {
                    throw Error('nextPlayerGenerator didn\'t return a valid Player instance');
                }

                if (p === this.state.player1) {
                    const prompt = this.state.player1.prompt = new Prompt();

                    prompt.buttons.push(new PromptButton({
                        name: 'cash-out',
                        label: 'Prendi il piatto',
                        type: 'primary'
                    }));

                    prompt.buttons.push(new PromptButton({
                        name: 'another-round',
                        label: 'Ancora un altro giro',
                        type: 'secondary'
                    }));
                    prompt.visible = true;
                    const choice = await this.getPlayerAction(this.state.player1);
                    this.state.player1.prompt = new Prompt();
                    console.log('Player choice was:', choice);

                    if (choice.action === 'cash-out') {
                        this.broadcast('notification', {
                            type: 'info',
                            text: `Il banco (${this.state.player1.displayName}) prende ${this.state.pot} del piatto e passa la mano`
                        });
                        this.state.player1.stash += this.state.pot;
                        this.state.pot = 0;

                        await this.sleep(3000);
                        break;
                    } else {
                        this.broadcast('notification', {
                            type: 'info',
                            text: `Il banco (${this.state.player1.displayName}) ha deciso per un altro giro`
                        });
                        await this.sleep(3000);
                        continue;
                    }
                }

                await this.pauseGameIfPlayersDontMeetRequirements();

                this.state.player2 = p;
                console.log('Challenger player is:', this.state.player2.displayName);

                // Deal draft cards
                this.dealCard(this.state.player2, false);
                this.state.player2.score = this.calculateScore(this.state.player2.hand).score;

                this.dealCard(this.state.player1, false);
                this.state.player1.score = this.calculateScore(this.state.player1.hand).score

                // Let challenger play his hand
                let challengerWins = false;

                const challengerResult = await this.playHand(this.state.player2, true);
                console.log('Challenger:', challengerResult);;

                this.publishCards(this.state.player1);
                if (!challengerResult.playerLoose) {
                    const dealerResult = await this.playHand(this.state.player1, false);
                    console.log('Dealer:', dealerResult);

                    this.publishCards(this.state.player2);
                    if (!dealerResult.playerLoose) {
                        challengerWins = challengerResult.score.score > dealerResult.score.score;
                    } else {
                        challengerWins = true;
                    }
                } else {
                    challengerWins = false;
                    console.log('Dealer wins!');
                }

                await this.sleep(5000);

                const jollyWasDealt = this.hasJolly(this.state.player1.hand) || this.hasJolly(this.state.player2.hand);
                console.log('La matta é stata giocata? ', jollyWasDealt);

                if (challengerWins) {
                    this.broadcast('notification', {
                        type: 'success',
                        text: `${this.state.player2.displayName} vince (${this.state.currentBet}) dal piatto`
                    });
                    this.state.player2.stash += this.state.currentBet * 2;
                    this.state.pot -= this.state.currentBet;
                    assert(this.state.pot >= 0);
                    await this.sleep(3000);
                } else {
                    this.broadcast('notification', {
                        type: 'success',
                        text: `Il banco (${this.state.player1.displayName}) vince la mano`
                    });
                    this.state.pot += this.state.currentBet;
                }
                this.state.currentBet = 0;

                // svuota le mani
                this.tossAllHands();

                if (jollyWasDealt) {
                    console.log('Shuffling deck since jolly was dealt in last hand');
                    this.shuffleCards();

                    this.broadcast('notification', {
                        type: 'info',
                        text: 'Le carte sono state mischiate perché la matta é stata estratta nell\'ultima mano'
                    });
                    await this.sleep(3000);
                }
            }
        }
    }

    onAuth(client, options, request) {
        console.log('onauth', options, request.session.user_id);
        const user = this.validateSession(request.session.user_id);
        console.log('Found user:', user);
        return user;
    }

    onCreate(options) {
        this.deck = this.gameType.createDeck();
        this.deck.shuffle();
        console.log('Deck created:', this.deck);

        console.log('GameRoom instance created', this.roomId, options);
        this.validateSession = options.validateSession;

        this.setState(new GameState());
        this.state.roomOwner = options.user_id;

        this.onMessage('admin', (client, message) => this.onAdminCommand(client, message));
        this.onMessage('webrtc', (client, message) => this.onWebRTCCommand(client, message));
        this.onMessage('*', (client, type: string, message) => {
            console.log('Relaying message:', type, message);
            this.messageHandlers.emit(type, client, message);
        });

        this.clock.start();

        // DEMO: rotates the background every 60 seconds
        this.clock.setInterval(() => {
            this.state.bg = 1 + (this.state.bg + 1) % 5;
        }, 60000);
    }

    onJoin(client, options, user) {
        console.log(`User ${user.display_name} (${user.user_id}) joined room ${this.roomId}`, options);

        if (this.state.players.size === 0) {
            console.log(`User ${user.display_name} (${user.user_id}) set as room ${this.roomId} owner`);
            this.state.roomOwner = user.user_id;
        }

        const user_already_logged_in = Array.from(this.state.players.values()).find((item) => item.id === user.user_id);
        if (user_already_logged_in) {
            console.log('User was already in the game!', user_already_logged_in);
            return;
        }

        this.state.players.set(client.sessionId, new Player({
            id: user.user_id,
            sessionId: client.sessionId,
            displayName: user.display_name,
            owner: user.user_id === this.state.roomOwner,
            stash: 0,
            connected: true,
            playing: false,
            dealer: false,
            hand: []
        }));
    }

    async onLeave(client, consented) {
        console.log('Player leaving:', client.sessionId);
        if (this.state.players.has(client.sessionId)) {
            this.state.players[client.sessionId].connected = false;
        }

        try {
            if (consented) {
                throw new Error("consented leave");
            }

            // allow disconnected client to reconnect into this room until 60 seconds
            await this.allowReconnection(client, 60);

            // client returned! let's re-activate it.
            this.state.players[client.sessionId].connected = true;

        } catch (e) {
            // 60 seconds expired. let's remove the client.
            this.state.players.delete(client.sessionId);

            // explicitly broadcasting the event to let WebRTC cleanup corectly
            this.broadcast('player-left', client.sessionId);
        }
    }

    onAdminCommand(client, message) {
        console.log('Admin command received:', message);
        const player = this.state.players.get(client.sessionId);
        if (player.id !== this.state.roomOwner) {
            console.warn('Received admin command from non-owner user:', client.sessionId, message);
            return;
        }

        const admin_commands = {
            // set user stash (session_id, amount)
            'set-user-stash': SetUserStashCommand,

            // add to user stash (session_id, amount)
            'add-to-user-stash': AddToUserStashCommand,

            // remove from user stash (session_id, amount)
            'remove-from-user-stash': RemoveFromUserStashCommand,

            // assign seat to player (session_id)
            'assign-seat': AssignSeatCommand,

            // demote player (session_id)
            // shuffle seats

            // give room ownership (session_id)
            'give-room-ownership': GiveRoomOwnershipCommand,

            // start game
            'start-game': StartGameCommand,

            // pause game
            'pause-game': PauseGameCommand,

            // set room name (new name)
            // set room background (background)
        };

        if (!admin_commands.hasOwnProperty(message.command)) {
            console.error("Invalid admin command", message);
            return;
        }

        const commandClass = admin_commands[message.command];
        this.dispatcher.dispatch(new commandClass(), { ...message.payload, client });
    }

    onWebRTCCommand(client, message) {
        console.log('WebRTC command received:', message);
        const player = this.clients.find((value) => { return value.sessionId === message.payload.targetId });
        if (player === null) {
            console.warn('Cannot find client with sessionId', message.payload.targetId);
            return;
        }

        if (message.command === 'call-player') {
            console.log('Relaying WebRTC call:', message.payload);
            if (player === undefined) {
                console.warn('Incoming call to an unknown player');
                return;
            }
            player.send('incoming-call', message.payload);
        }

        if (message.command === 'answer-call') {
            console.log('Relaying WebRTC call:', message.payload);
            player.send('answer-call', message.payload);
        }
    }
}

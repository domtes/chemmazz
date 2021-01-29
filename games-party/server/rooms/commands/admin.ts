import { Client } from 'colyseus';
import { Command } from '@colyseus/command';
import { GameState } from '../../games/state';
import { GameRoom } from '../game';


export class SetUserStashCommand extends Command<GameState, { client: Client, sessionId: string, amount: number }> {
    execute({ client, sessionId, amount }) {
        this.state.players[sessionId].stash = amount;
        const admin = this.state.players.get(client.sessionId);
        const targetClient = this.room.clients.find((client) => { return client.sessionId === sessionId });
        targetClient.send('notification', { text: `${admin.displayName} ha impostato il tuo stash a ${amount}`, type: 'success' });
    }
}

export class AddToUserStashCommand extends Command<GameState, { client: Client, sessionId: string, amount: number }> {
    execute({ client, sessionId, amount }) {
        console.log('add-to-user-stash', client, sessionId, amount);
        this.state.players[sessionId].stash = this.state.players[sessionId].stash + amount;
        const admin = this.state.players.get(client.sessionId);
        const targetClient = this.room.clients.find((client) => { return client.sessionId === sessionId });
        targetClient.send('notification', { text: `${admin.displayName} ha aggiunto ${amount} al tuo stash`, type: 'success' });
    }
}

export class RemoveFromUserStashCommand extends Command<GameState, { client: Client, sessionId: string, amount: number }> {
    execute({ client, sessionId, amount }) {
        const admin = this.state.players.get(client.sessionId);
        const targetClient = this.room.clients.find((client) => { return client.sessionId === sessionId });
        targetClient.send('notification', { text: `${admin.displayName} ha rimosso ${amount} dal tuo stash`, type: 'warning' });
        this.state.players[sessionId].stash = Math.max(0, this.state.players[sessionId].stash - amount);
    }
}

export class GiveRoomOwnershipCommand extends Command<GameState, { client: Client, sessionId: string }> {
    execute({ client, sessionId }) {
        const player = this.state.players.get(sessionId);
        this.state.roomOwner = player.id;
        this.state.players.forEach((p, index) => {
            p.owner = p.id == player.id;
        });

        // sends a notification to the new owner
        const newOwner = this.room.clients.find((client) => { return client.sessionId === sessionId });
        newOwner.send('notification', { text: 'Sei il nuovo propietario della stanza' });
    }
}

export class AssignSeatCommand extends Command<GameState, { client: Client, sessionId: string }> {
    execute({ client, sessionId }) {
        const player = this.state.players.get(sessionId);
        const minimumStash = this.state.minimumBet * 2;
        if (player.stash < minimumStash) {
            client.send('notification', {
                type: 'warning',
                text: `Al giocatore servono almeno ${minimumStash} punti per sedersi al tavolo`
            });
            return;
        }

        if (this.state.running) {
            player.enteringNextTurn = true;
        } else {
            const seat = (<GameRoom>this.room).nextAvailableSeat();
            console.log('assigning seat to user:', player.displayName, seat);
            player.playing = true;
            player.seat = seat;
        }
    }
}

export class StartGameCommand extends Command<GameState, { client: Client }> {
    execute({ client }) {
        if (Array.from(this.state.players.values()).filter((el) => { return el.playing; }).length < 2) {
            client.send('notification', {
                type: 'warning',
                text: 'Servono almeno 2 giocatori per cominciare una partita'
            });
            return;
        }

        this.state.running = true;
        (<GameRoom>this.room).onStartGame();
    }
}

export class PauseGameCommand extends Command<GameState, { client: Client }> {
    execute() {
        this.state.running = false;
    }
}

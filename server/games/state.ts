import { Client } from 'colyseus';
import { type, filter, ArraySchema, Schema, MapSchema } from '@colyseus/schema';


export class CardValue extends Schema {
    @type('uint8')
    value: number;

    @type('uint8')
    suit: number;
}

export class SerializedCard extends Schema {
    @type('string')
    owner: string;

    @type('boolean')
    public: boolean;

    @type(CardValue)
    card: CardValue;
}

export class CardPlaceholder extends Schema {
    @filter(function (
        this: CardPlaceholder,
        client: Client,
        value: SerializedCard,
        root: Schema) {
        return value.public || value.owner === client.sessionId;
    })
    @type(SerializedCard)
    card: SerializedCard;
}

export class PromptField extends Schema {
    @type('string')
    type: string;

    @type('string')
    name: string;

    @type('string')
    label: string;

    @type('int32')
    min: string;

    @type('int32')
    max: string;
}

export class PromptButton extends Schema {
    @type('string')
    name: string;

    @type('string')
    label: string;

    @type('string')
    type: string;
}

export class Prompt extends Schema {
    @type('boolean')
    visible: boolean;

    @type([PromptField])
    fields = new ArraySchema<PromptField>();

    @type([PromptButton])
    buttons = new ArraySchema<PromptButton>();
}

export class Player extends Schema {
    @type('string')
    id: string;

    @type('string')
    sessionId: string;

    @type('string')
    displayName: string;

    @type('boolean')
    owner: boolean;

    @type('int32')
    stash: number = 60;

    @type('int32')
    bet: number = 0;

    @type('boolean')
    connected: boolean;

    @type('boolean')
    playing: boolean;

    @type('boolean')
    enteringNextTurn: boolean;

    @type('uint8')
    seat: number;

    @type('boolean')
    dealer: boolean;

    @type([CardPlaceholder])
    hand = new ArraySchema<CardPlaceholder>();

    @type(Prompt)
    prompt: Prompt;

    @filter(function (
        this: Player,
        client: Client,
        value: string,
        root: Schema) {
        return this.sessionId === client.sessionId;
    })
    @type('number')
    score: number = 0;
}

export class GameState extends Schema {
    @type('boolean')
    running: boolean = false;

    @type('boolean')
    paused: boolean = false;

    @type('int32')
    pot: number = 0;

    @type('int32')
    minimumBet: number = 10;

    @type({ map: Player })
    players = new MapSchema<Player>();

    @type('number')
    bg: number = 1;

    @type('string')
    roomOwner: string;

    @type(Player)
    player1: Player;

    @type(Player)
    player2: Player;

    @type('number')
    currentBet: number = 0;

    @type('number')
    remainingCards: number;
}

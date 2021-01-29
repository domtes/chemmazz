import { BaseGameType, CardName, ICard, PlayingCard, RankSet, Suit } from 'typedeck';

enum SemeNapoletano {
    Bastoni, // Suit.Clubs
    Spade,   // Suit.Spades
    Coppe,   // Suit.Diamonds
    Denari   // Suit.Hearts
};

export class CartaNapoletana extends PlayingCard {
    public toString(): string {
        return `${CardName[this.cardName]} of ${SemeNapoletano[this.suit]}`;
    }
}

class NapoliGameType extends BaseGameType {
    public cardsAllowed: ICard[] = [
        new CartaNapoletana(CardName.Ace, Suit.Clubs),
        new CartaNapoletana(CardName.Two, Suit.Clubs),
        new CartaNapoletana(CardName.Three, Suit.Clubs),
        new CartaNapoletana(CardName.Four, Suit.Clubs),
        new CartaNapoletana(CardName.Five, Suit.Clubs),
        new CartaNapoletana(CardName.Six, Suit.Clubs),
        new CartaNapoletana(CardName.Seven, Suit.Clubs),
        new CartaNapoletana(CardName.Eight, Suit.Clubs),
        new CartaNapoletana(CardName.Nine, Suit.Clubs),
        new CartaNapoletana(CardName.Ten, Suit.Clubs),

        new CartaNapoletana(CardName.Ace, Suit.Diamonds),
        new CartaNapoletana(CardName.Two, Suit.Diamonds),
        new CartaNapoletana(CardName.Three, Suit.Diamonds),
        new CartaNapoletana(CardName.Four, Suit.Diamonds),
        new CartaNapoletana(CardName.Five, Suit.Diamonds),
        new CartaNapoletana(CardName.Six, Suit.Diamonds),
        new CartaNapoletana(CardName.Seven, Suit.Diamonds),
        new CartaNapoletana(CardName.Eight, Suit.Diamonds),
        new CartaNapoletana(CardName.Nine, Suit.Diamonds),
        new CartaNapoletana(CardName.Ten, Suit.Diamonds),

        new CartaNapoletana(CardName.Ace, Suit.Spades),
        new CartaNapoletana(CardName.Two, Suit.Spades),
        new CartaNapoletana(CardName.Three, Suit.Spades),
        new CartaNapoletana(CardName.Four, Suit.Spades),
        new CartaNapoletana(CardName.Five, Suit.Spades),
        new CartaNapoletana(CardName.Six, Suit.Spades),
        new CartaNapoletana(CardName.Seven, Suit.Spades),
        new CartaNapoletana(CardName.Eight, Suit.Spades),
        new CartaNapoletana(CardName.Nine, Suit.Spades),
        new CartaNapoletana(CardName.Ten, Suit.Spades),

        new CartaNapoletana(CardName.Ace, Suit.Hearts),
        new CartaNapoletana(CardName.Two, Suit.Hearts),
        new CartaNapoletana(CardName.Three, Suit.Hearts),
        new CartaNapoletana(CardName.Four, Suit.Hearts),
        new CartaNapoletana(CardName.Five, Suit.Hearts),
        new CartaNapoletana(CardName.Six, Suit.Hearts),
        new CartaNapoletana(CardName.Seven, Suit.Hearts),
        new CartaNapoletana(CardName.Eight, Suit.Hearts),
        new CartaNapoletana(CardName.Nine, Suit.Hearts),
        new CartaNapoletana(CardName.Ten, Suit.Hearts)
    ];
}

class BancoRankSet extends RankSet {
    public rankSet: CardName[] = [
        CardName.Ace,
        CardName.Two,
        CardName.Three,
        CardName.Four,
        CardName.Five,
        CardName.Six,
        CardName.Seven,
        CardName.Eight,
        CardName.Nine,
        CardName.Ten
    ];
}

export class BancoGameType extends NapoliGameType {
    public rankSet = new BancoRankSet();
}

class SettemmezzoRankSet extends RankSet {
    public rankSet: CardName[] = [
        CardName.Eight,
        CardName.Nine,
        CardName.Ten,
        CardName.Ace,
        CardName.Two,
        CardName.Three,
        CardName.Four,
        CardName.Five,
        CardName.Six,
        CardName.Seven
    ];
}

export class SettemmezzoGameType extends NapoliGameType {
    public rankSet = new SettemmezzoRankSet();
}
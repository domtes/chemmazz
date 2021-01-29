import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Space } from 'antd';

interface HandProps {
    cards: any[]
    showHole: boolean
}

const Semi = ['bastoni', 'spade', 'coppe', 'denari'];
const Valori = ['asso', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];

const Hand: React.FC<HandProps> = ({ cards, showHole }) => {
    return (
        <Space direction="horizontal" align="start">
            {cards.map((item) => {
                let className = 'card coperta';
                if (item.card !== undefined) {
                    const suit = Semi[item.card.card.suit];
                    const value = Valori[item.card.card.value];
                    className = showHole || item.card.public ? `card ${value} ${suit}` : 'card coperta';
                }

                return (
                    <div className={className} key={`${uuidv4()}`}></div>
                )
            })}
        </Space>
    )
}

export default Hand;

import { GameRoom } from './game';


describe("Room", function () {
    let room: GameRoom = null;

    describe("onMessage / dispatchMessage", () => {
        it("should be able to create a GameRoom instance", () => {
            room = new GameRoom();
            expect(room).not.toBeNull();
            expect(room).toHaveProperty('dispatcher');
            expect(room).toHaveProperty('currentDealer');
            expect(room).toHaveProperty('gameType');
        });

        it("after creation getSeatedPlayers should return an empty array", () => {
            room = new GameRoom();
            expect(room.getSeatedPlayers()).toEqual([]);
        })
    });
});

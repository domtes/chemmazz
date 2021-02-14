import { GameRoom } from './game';


describe("Room", function () {
    let room: GameRoom = null;

    describe("onMessage / dispatchMessage", () => {
        it("* should handle if message is not registered", () => {
            room = new GameRoom();
            expect(room).not.toBeNull();
        });
    });
});

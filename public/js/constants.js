var Game = {

    Client: {
        UPDATE: 0,
        JOIN: 1,

        Actions: {
            SELECT_CARDS: 0, // play cards
            SELECT_MOVE: 1 // pick cards as czar
        }
    },

    Server: {
        Join: {
            NOT_FOUND: 0,
            IS_FULL: 1,
            PASSWORD_REQUIRED: 2,
            PASSWORD_INCORRECT: 3,
            SUCCESS_LOBBY: 4,
            SUCCESS_GAME: 5,
            IS_PLAYER: 6
        },
        Update: {
            GAME_DATA: 0,
            PLAYER_JOIN: 1,
            PLAYER_LEAVE: 2,
            BLACK_CARD: 3,
            HAND: 4,
            MOVE: 5,
            UNCOVER: 6,
            SELECTED: 7,
            ROUND: 8,
            STATE: 9,
            CHAT: 10
        }
    },

    State: {
        LOBBY: 0,
        PLAYING: 1,
        ENDED: 2
    }

};

var Chat = {
    MESSAGE: 0
};

if (typeof module != 'undefined') {
    module.exports = {
        Game: Game,
        Chat: Chat
    };
}

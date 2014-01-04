
function ChatMessageViewModel() {

    var self = this;

    this.time = ko.observable(Date.now());
    this.user = ko.observable();
    this.type = ko.observable(Chat.MESSAGE);
    this.message = ko.observable();

    this.formatTime = ko.computed(function () {
        return moment(self.time()).format('HH:mm:ss')
    });

    this.fromJSON = function (json) {
        this.time(json.time);
        this.user(json.user);
        this.type(json.type);
        this.message(json.message);

        return this;
    };

    this.toJSON = function () {
        return {
            type: this.type(),
            message: this.message()
        };
    };

}

function ChatViewModel() {

    var self = this;

    this.history = ko.observableArray();

    this.users = ko.observableArray();
    this.user = ko.observable();

    this.gameId = ko.observable(-1);

    this.message = ko.observable('');

    this.send = function () {
        var text = this.message();
        if (!text || text.length == 0) {
            return;
        }

        var message = new ChatMessageViewModel();
        message.user(this.user());

        if (text.charAt(0) == '/') {
            if (text.charAt(1) == '/') {
                text = text.slice(1);
            } else if (text.indexOf('/me ') == 0) {
                text = text.slice(4);
                message.type(Chat.ACTION);
            } else {
                console.log('Unknown chat command: ' + text);

                var error = new ChatMessageViewModel();
                error.type(Chat.ERROR);
                error.message('Unknown command: ' + text);

                this.history.push(error);

                this.message('');

                return;
            }
        }

        message.message(text);

        this.message(null);

        console.log('Sending chat message: ' + JSON.stringify(message.toJSON()));

        if (this.gameId() >= 0) {
            $.ajax('/ajax/game/' + this.gameId() + '/chat', {
                method: 'post', data: message.toJSON()
            });
        } else {
            $.ajax('/ajax/chat', {
                method: 'post', data: message.toJSON()
            });
        }

        this.history.push(message);
    }.bind(this);

    this.receive = function (json) {
        var message = new ChatMessageViewModel().fromJSON(json);
        this.history.push(message);
    }

}

function ChatMessageViewModel(chat) {

    var self = this;

    this.time = ko.observable();
    this.user = ko.observable();
    this.type = ko.observable(Chat.MESSAGE);
    this.message = ko.observable();

    this.chat = chat;

    this.formatTime = ko.computed(function () {
        return moment(self.time()).format('HH:mm:ss')
    });

    this.formatMessage = ko.computed(function () {
        var text = self.message();
        if (!text || text.length == 0) {
            return '';
        }

        text = text.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        text = text.replace(/\(?(\bhttps?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])/ig, '<a href="$1" target="_blank">$1</a>');

        return text;
    });

    this.isHighlight = ko.computed(function () {
        if (!self.user()) {
            return false;
        }

        if (self.user().name == self.chat.user().name) {
            return false;
        }

        if (!self.message()) {
            return false;
        }

        var text = self.message().toLowerCase();
        var nick = self.chat.user().name.toLowerCase();

        return text.indexOf(nick) >= 0;
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

    this.inputElement = ko.observable();
    this.historyElement = ko.observable();

    this.send = function () {
        var text = this.inputElement().val();
        if (!text || text.length == 0) {
            return;
        }

        var message = new ChatMessageViewModel(this);
        message.user(this.user());

        if (text.charAt(0) == '/') {
            if (text.charAt(1) == '/') {
                text = text.slice(1);
            } else if (text.indexOf('/me ') == 0) {
                text = text.slice(4);
                message.type(Chat.ACTION);
            } else {
                console.log('Unknown chat command: ' + text);
                this.showError('Unknown command: ' + text);

                this.inputElement().val('');

                return;
            }
        }

        message.message(text);

        this.inputElement().val('');

        console.log('Sending chat message: ' + JSON.stringify(message.toJSON()));

        if (this.gameId() >= 0) {
            $.ajax('/ajax/game/' + this.gameId() + '/chat', {
                method: 'post', data: message.toJSON(),
                error: function () {
                    self.showError('Your message got lost somehow! 6_9 send it again maybe?');
                }
            });
        } else {
            $.ajax('/ajax/chat/post', {
                method: 'post', data: message.toJSON(),
                error: function () {
                    self.showError('Your message got lost somehow! 6_9 send it again maybe?');
                }
            });
        }

        this.history.push(message);
    }.bind(this);

    this.receive = function (json) {
        var message = new ChatMessageViewModel(this).fromJSON(json);
        this.history.push(message);

        if ($.cookie('notifications') && message.isHighlight()) {
            showNotification('Chat mention by ' + (message.user() ? message.user().name : 'System'), message.message());
        }
    };

    this.showError = function (message) {
        var error = new ChatMessageViewModel(this);
        error.type(Date.now());
        error.type(Chat.ERROR);
        error.message(message);

        this.history.push(error);
    };

    this.showSystemMessage = function (message) {
        var msg = new ChatMessageViewModel(this);
        msg.type(Date.now());
        msg.type(Chat.GAME_MESSAGE);
        msg.message(message);

        this.history.push(msg);
    };

    var scrollHistory = function () {
        var $el = self.historyElement();

        if (!$el) {
            return;
        }

        var el = $el.get(0);

        var atBottom = el.scrollHeight - el.scrollTop === el.clientHeight;
        if (atBottom) {
            setTimeout(function () {
                $el.scrollTop(el.scrollHeight);
            }, 10);
        }
    };

    this.history.subscribeChanged(scrollHistory);

}

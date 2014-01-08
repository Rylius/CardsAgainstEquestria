function ChatMessageViewModel() {

    var self = this;

    this.time = ko.observable();
    this.user = ko.observable();
    this.type = ko.observable(Chat.MESSAGE);
    this.message = ko.observable();

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

        text = text.replace(/\(?(\bhttps?:\/\/[-A-Za-z0-9+&@#\/%?=~_()|!:,.;]*[-A-Za-z0-9+&@#\/%=~_()|])/ig, '<a href="$1">$1</a>');

        return text;
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

    this.historyElement = ko.observable();

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
                this.showError('Unknown command: ' + text);

                this.message('');

                return;
            }
        }

        message.message(text);

        this.message(null);

        console.log('Sending chat message: ' + JSON.stringify(message.toJSON()));

        if (this.gameId() >= 0) {
            $.ajax('/ajax/game/' + this.gameId() + '/chat', {
                method: 'post', data: message.toJSON(),
                error: function () {
                    self.showError('Your message somehow got lost! 6_9 send it again maybe?');
                }
            });
        } else {
            $.ajax('/ajax/chat', {
                method: 'post', data: message.toJSON(),
                error: function () {
                    self.showError('Your message somehow got lost! 6_9 send it again maybe?');
                }
            });
        }

        this.history.push(message);
    }.bind(this);

    this.receive = function (json) {
        var message = new ChatMessageViewModel().fromJSON(json);
        this.history.push(message);
    };

    this.showError = function (message) {
        var error = new ChatMessageViewModel();
        error.type(Date.now());
        error.type(Chat.ERROR);
        error.message(message);

        this.history.push(error);
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

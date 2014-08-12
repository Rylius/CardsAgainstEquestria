function switchTheme(themeId) {
    $.cookie('theme', themeId, {expires: 3650, path: '/'});

    window.location.reload(true);

    return false;
}

function saveName(name) {
    $.cookie('name', name, {expires: 3650, path: '/'});
}

window.currentChatListenRequest = null;

function initChat(user, $historyElement, $inputElement) {
    var chat = new ChatViewModel();

    chat.user(user);
    chat.inputElement($inputElement);
    chat.historyElement($historyElement);

    window.globalChat = chat;
    console.log('Initialized global chat');

    chatListen();

    $.ajax('/ajax/chat/history', {
        method: 'post',
        success: function (data) {
            _.each(data, function (message) {
                globalChat.receive(message);
            });
        },
        error: function () {
            globalChat.showError('Failed to fetch chat history!')
        }
    });

    return chat;
}

function chatListen() {
    currentChatListenRequest = $.ajax('/ajax/chat/listen', {
        success: function (data) {
            _.each(data, function (message) {
                globalChat.receive(message);
            });

            setTimeout(chatListen, 100);
        },
        error: function (xhr, status, error) {
            if (error == 'abort') {
                return;
            }

            console.warn('chat listen request failed: ' + status + ': ' + error);

            if (error == 'Forbidden') {
                window.location.reload(true);
                return;
            }

            globalChat.showError('Failed to fetch chat messages! Trying again in 5 seconds.');
            setTimeout(chatListen, 5000);
        }
    });
}

function interruptChatListen() {
    if (currentChatListenRequest) {
        currentChatListenRequest.abort();
        console.log('Interrupted chat message listener');
    }
}

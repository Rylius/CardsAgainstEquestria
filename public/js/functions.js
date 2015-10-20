function switchTheme(themeId) {
    $.cookie('theme', themeId, {expires: 3650, path: '/'});

    window.location.reload(true);

    return false;
}

function saveName(name) {
    $.cookie('name', name, {expires: 3650, path: '/'});
}

function hideCookieNotice() {
    $.cookie('cookieNoticeRead', true, {expires: 3650, path: '/'});
    $('#cookie-notice').remove();
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

            chatListen();
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

function toggleNotifications() {
    var checkbox = document.getElementById('notifications-checkbox');

    function permissionChanged(permission) {
        if (permission == 'granted') {
            toggleNotifications();
        }
    }

    console.log('toggling notifications from ' + checkbox.checked);

    if (checkbox.checked) {
        checkbox.checked = false;
    } else {
        if (Notification.permission == 'granted') {
            if (notificationsAvailable()) {
                checkbox.checked = true;
            } else {
                alert('Your browser does not support notifications. :(');
            }
        } else {
            Notification.requestPermission(permissionChanged);
        }
    }
    $.cookie('notifications', checkbox.checked, {expires: 3650, path: '/'});

    return false;
}

function notificationsAvailable() {
    if (!window.Notification || !Notification.requestPermission) {
        return false;
    }
    if (Notification.permission == 'granted') {
        return true;
    }

    try {
        new Notification('');
    } catch (e) {
        if (e.name == 'TypeError') {
            return false;
        }
    }

    return true;
}

function showNotification(title, body) {
    if (!notificationsAvailable()) {
        return;
    }

    console.log('showNotification ' + title + ': ' + body);

    var notification = new Notification(title, {
        body: body,
        icon: '/img/notification.png',
        tag: 'CAE_NOTIFICATION'
    });
    setTimeout(function () {
        notification.close();
    }, 10000);
}

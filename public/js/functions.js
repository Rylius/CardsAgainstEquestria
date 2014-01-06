function switchTheme(themeId) {
    $.cookie('theme', themeId, {expires: 3650, path: '/'});

    window.location.reload(true);

    return false;
}

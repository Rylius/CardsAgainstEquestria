function RegisterViewModel() {

    var self = this;

    this.email = ko.observable('');
    this.allowEmails = ko.observable(true);

    this.password = ko.observable('');
    this.passwordConfirm = ko.observable('');

    this.emailError = ko.computed(function () {
        var error = '';

        if (!self.email().length) {
            error = 'Email required';
        } else if (!/^[a-z0-9!#$%&'*+/=?^_{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(self.email())) {
            error = 'Not a valid address';
        }

        return error;
    });
    this.passwordError = ko.computed(function () {
        var error = '';

        if (!self.password().length) {
            error = 'Password required';
        }

        return error;
    });
    this.passwordConfirmError = ko.computed(function () {
        var error = '';

        if (self.passwordConfirm() != self.password()) {
            error = 'Passwords don\'t match';
        } else if (!self.passwordConfirm().length) {
            error = 'Password required';
        }

        return error;
    });

    this.valid = ko.computed(function () {
        return self.email().length > 0
            && self.password().length > 0
            && self.passwordConfirm().length > 0
            && self.password() == self.passwordConfirm();
    });

}

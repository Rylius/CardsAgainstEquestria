# Cards Against Equestria
=====================

// TODO

## Overview

## Adding new sets
<https://gist.github.com/Rylius/8056313>

Place in `data/decks`.

## Credits

See <http://cardsagainstequestria.com/info/license>

## Development

Push to the `development` branch (create if it doesn't exist). Larger features can have their own branch as well and
should be merged to `development` once they're done. `development` is merged into `master` for releases.

See open issues for stuff to do.

Anyone want to write some tests?

## Running your own instance

I don't really recommend it.

### Requirements

* node.js
* Postgres (9?) database
* `sudo npm install -g grunt-cli`

### Installation

* Clone this repository (master is latest release)
* Run all .sql files in `res/database` and `res/database/migrations` on your database
* `npm install`
* `grunt`
* Copy `config.default.json` to `config.json` and adjust as needed
* Copy `.logule.default.json` to `.logule.json` and adjust as needed
* Edit `views/info/contact.hbs` (**especially** the 'Site Administrator' section)

### Running

* `node app.js` (alternatively use a supervisor like <https://github.com/nodejitsu/forever>)
* Optionally set up Apache/nginx proxy

#### First time run

* Log in
* Register your nick
* `INSERT INTO user_permissions VALUES (1, 1);`
* Log out, log in again
* You're now an admin!

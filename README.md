# Cards Against Equestria
=====================

// TODO

## Overview

## Adding new sets
<https://gist.github.com/Rylius/8056313>

Place in `data/decks`.

## Credits

See <http://cardsagainstequestria.com/info/license>

## Running your own instance

I don't really recommend it.

### Requirements

* node.js
* Postgres (9?) database
* npm install grunt-cli

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

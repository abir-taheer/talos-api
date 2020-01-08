# talos-api
A wrapper for communicating with the Talos API

## Why use it? 
* There have been issues in the past, with communicating with the Talos API using standard authentication headers

* Very light module

* Interactions with the API can be mapped onto an object making for clearer and easier to use code.

* Features (default but optional) caching for quicker retrieval of students for future use.

## How it works
It mimics the interactions of a user performing these actions manually

* Makes a GET request to parse and retrieve the csrf-middleware tokens and cookies from the sign in form.

* Authenticates with Talos by making POST requests to the login page and passing back the middleware tokens. 

* Stores the session cookie for future communication with the API.
 
## How to use it

```javascript
const Talos = require("talos-api");

const api = new Talos("username@stuy.edu", "password");

// Search function is asynchronous
api.search("student@stuy.edu", {limit: 1})
    .then(function(results) {

        // Results are returned as an array
    	console.log(results); 

    })
    .catch(error => {

        // Likely invalid credentials
        console.log(error);

    })
```

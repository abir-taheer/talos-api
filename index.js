const setCookie = require("set-cookie-parser");
const axios = require("axios");
const qs = require('querystring');

class Talos {
	username = "";
	password = "";
	csrfToken = "";
	csrfMiddleware = "";
	sessionID = "";
	expires = new Date();
	validSession = false;
	queryCache = {};
	useCache = true;

	constructor(username, password, options = {}) {
		this.username = username;
		this.password = password;

		if( options.cache === false )
			this.useCache = false;
	}

	readyCSRFToken(){
		return new Promise((resolve) => {
			axios.get("https://talos.stuy.edu/auth/login/")
				.then(res => {
					let cookies = setCookie(res.headers["set-cookie"], {map: true});
					this.csrfToken = cookies.csrftoken.value;
					this.csrfMiddleware = res.data.match(/name='csrfmiddlewaretoken' value='(.*)'/)[1];
					resolve();
				});
		});
	}

	readySessionToken(){
		return new Promise((resolve, reject) => {
			let cookieString = `csrftoken=${this.csrfToken}`;

			axios.request({
				url: "https://talos.stuy.edu/auth/login/",
				method: "POST",
				withCredentials: true,
				maxRedirects: 0,
				validateStatus: status => status >= 200 && status < 303,
				headers:{
					Cookie: cookieString,
					Referer: "https://talos.stuy.edu/auth/login/",
					'Content-Type': "application/x-www-form-urlencoded"
				},
				data: qs.stringify({
					username: this.username,
					password: this.password,
					csrfmiddlewaretoken: this.csrfMiddleware,
					next: ""
				})
			})
				.then(res => {
					let cookies = setCookie(res.headers["set-cookie"], {map: true});
					if(! Boolean(cookies.sessionid))
						throw new Error("Invalid login attempt");

					this.csrfToken = cookies.csrftoken.value;
					this.sessionID = cookies.sessionid.value;
					this.validSession = true;
					this.expires = new Date(cookies.sessionid.expires);
				})
				.finally(resolve);
		});
	}

	sessionIsValid(){
		return this.validSession && new Date() < this.expires;
	}

	async authenticate(){
		if(this.sessionIsValid())
			return true;

		await this.readyCSRFToken();
		await this.readySessionToken();

		return this.sessionIsValid();
	}

	async search(query, options = {}){
		options.query = query;
		let limit = options.limit = options.limit || 0;
		let offset = options.offset = options.offset || 0;

		let queryHash = JSON.stringify(options);

		if(! options.force && this.queryCache[queryHash]){
			return this.queryCache[queryHash];
		}

		let format = "json";

		if(!await this.authenticate())
			throw new Error("Invalid credentials cannot be used to query the API");

		let cookieString = `sessionid=${this.sessionID}`;

		if(! limit){
			let first_req = await axios.request({
				url: "https://talos.stuy.edu/api/students/",
				method: "GET",
				withCredentials: true,
				validateStatus: status => status >= 200 && status < 303,
				headers:{Cookie: cookieString},
				params: {
					limit: 1,
					search: query,
					format
				}
			});

			limit = first_req.data.count + 1;
		}

		let fetchResults = await axios.request({
			url: "https://talos.stuy.edu/api/students/",
			method: "GET",
			withCredentials: true,
			validateStatus: status => status >= 200 && status < 303,
			headers:{Cookie: cookieString},
			params: {
				limit,
				offset,
				format,
				search: query
			}
		});

		let results = fetchResults.data.results;

		if( this.useCache ){
			this.queryCache[queryHash] = results;
		}

		return results;
	}

	async getAllStudents(){
		return await this.search("");
	}

}

module.exports = Talos;

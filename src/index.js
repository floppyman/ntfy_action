const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

/**
 * returns an array with action_buttons and message
 * @returns array
 */
async function getMessageData(isGithub, isGitea, isDebug) {
	const context = github.context;
	const payload = context.payload;

	let action_buttons;
	let message;

	if (isDebug) {
		core.debug("");
		core.debug("CONTEXT:");
		core.debug(JSON.stringify(context, null, 4));
		core.debug("");
		core.debug("");
		core.debug("PAYLOAD:");
		core.debug(JSON.stringify(payload, null, 4));
		core.debug("");
	}

	switch (context.eventName) {
		case "push":
			action_buttons = [{
					action: "view",
					label: "Compare",
					url: isGithub ? payload.compare : isGitea ? payload.compare_url : "",
					clear: true,
				},
				{
					action: "view",
					label: "Commit",
					url: payload.head_commit.url,
					clear: true,
				},
				{
					action: "view",
					label: "Repository",
					url: payload.repository.html_url,
					clear: true,
				},
			];
			message = `${payload.head_commit.committer.name} has pushed ${context.sha.slice(-7)} to ${payload.repository.full_name}.\n\n` + `Author: ${isGithub ? payload.head_commit.author.username : isGitea ? payload.head_commit.author.name : ""}\n` + `Author Email: ${payload.head_commit.author.email}\n` + `Committer: ${payload.head_commit.committer.name}\n` + `Committer Email: ${payload.head_commit.committer.email}\n` + `Ref: ${context.ref}\n` + `Pushed by: ${isGithub ? payload.pusher.name : isGitea ? payload.pusher.full_name : ""}\n` + `Workflow Job Name: ${context.job}\n` + `Workflow Name: ${context.workflow}\n\n` + `Commit Message\n${payload.head_commit.message}`;
			return [action_buttons, message];

		case "release":
			action_buttons = [{
					action: "view",
					label: "Release URL",
					url: payload.release.html_url,
					clear: true,
				},
				{
					action: "view",
					label: "Download Tar",
					url: payload.release.tarball_url,
					clear: true,
				},
				{
					action: "view",
					label: "Download Zip",
					url: payload.release.zipball_url,
					clear: true,
				},
			];
			message = `${payload.release.author.login} has ${payload.action} ${payload.release.tag_name} on ${payload.repository.full_name}.\n\n` + `Repo: ${payload.repository.html_url}\n` + `Name: ${payload.release.name}\n` + `Author: ${payload.release.author.login}\n` + `Prerelease: ${payload.release.prerelease}\n` + `Workflow Job Name: ${context.job}\n` + `Workflow Name: ${context.workflow}\n\n` + `Release Message\n${payload.release.body}`;
			return [action_buttons, message];

		case "schedule":
			action_buttons = [{
					action: "view",
					label: "Visit Repository",
					url: `https://github.com/${process.env.GITHUB_REPOSITORY}`,
					clear: true,
				},
				{
					action: "view",
					label: "View Run",
					url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
					clear: true,
				},
			];
			message = `Scheduled task "${context.job}" ran in ${process.env.GITHUB_REPOSITORY}.\n\n` + `Workflow Name: ${context.workflow}\n` + `Cron: ${context.payload.schedule}`;
			return [action_buttons, message];

		default:
			action_buttons = [{
					action: "view",
					label: "Visit Repo",
					url: payload.repository.html_url,
					clear: true,
				},
				{
					action: "view",
					label: "View Run",
					url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
					clear: true,
				},
			];
			message = `Workflow "${context.workflow}" ran in ${payload.repository.full_name}\n\n` + `Repository: ${payload.repository.full_name}\n` + `Workflow Job Name: ${context.job}\n` + `Event Name: ${context.eventName}`;
			return [action_buttons, message];
	}
}

function getBoolInput(key, def) {
	var inp = core.getInput(key);
	if (inp == "") return def;
	return inp.toLowerCase() == "true";
}

function getStringInput(key, def) {
	var inp = core.getInput(key);
	if (inp == "") return def;
	return inp;
}

function getIntInput(key, def) {
	var inp = core.getInput(key);
	if (inp == "") return def;
	try {
		return parseInt(inp);
	} catch {
		return def;
	}
}

function getInputs() {
	let inputs = {
		debug: false,
		server_type: "",
		url: "",
		basic_auth: "",
		token_auth: "",
		tags: "",
		topic: "",
		title: "",
		details: "",
		priority: 0,
		messageText: "",
		actions: "",
	};

	inputs.debug = getBoolInput("debug");
	inputs.server_type = getStringInput("server_type", "github");
	inputs.url = getStringInput("url", "");
	inputs.basic_auth = getStringInput("basic_auth", "");
	inputs.token_auth = getStringInput("token_auth", "");
	inputs.tags = getStringInput("tags", "").split(",");
	inputs.topic = getStringInput("topic", "");
	inputs.title = getStringInput("title", "GitHub Actions");
	inputs.details = getStringInput("details", "");
	inputs.priority = getIntInput("priority", 3);

	return inputs;
}

async function handleInput() {
	try {
		core.info(`Reading inputs ...`);
		let inputs = getInputs();

		if (inputs.debug) {
			core.debug("");
			core.debug("INPUT VALUES:");
			core.debug(`  URL: ${inputs.url}`);
			core.debug(`  BasicAuth: ${inputs.basic_auth}`);
			core.debug(`  TokenAuth: ${inputs.token_auth}`);
			core.debug(`  Tags: ${inputs.tags}`);
			core.debug(`  Topic: ${inputs.topic}`);
			core.debug(`  Title: ${inputs.title}`);
			core.debug(`  Details: ${inputs.details}`);
			core.debug(`  Priority: ${inputs.priority}`);
			core.debug("");
		}

		let isGithub = inputs.server_type === "github";
		let isGitea = inputs.server_type === "gitea";

		core.info(`Creating GIT Information ...`);
		let message = await getMessageData(isGithub, isGitea, inputs.debug);

		inputs.messageText = `${message[1]} \n\n ${inputs.details}`;
		inputs.actions = message[0];
	} catch (error) {
		core.info("Failed getting action inputs");
		if (error.response && error.response.data) core.info(JSON.stringify(error.response.data));
		core.setFailed(error.message);
	}

	return inputs;
}

async function handleRequest(inputs) {
	try {
		core.info(`Connecting to endpoint (${inputs.url}) ...`);

		let headers = {};
		if (inputs.token_auth) headers["Authorization"] = `Bearer ${inputs.token_auth}`;
		else if (inputs.basic_auth) headers["Authorization"] = `Basic ${inputs.basic_auth}`;

		let request = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
				...headers,
			},
			data: {
				topic: inputs.topic,
				message: inputs.messageText,
				title: inputs.title,
				tags: inputs.tags,
				priority: inputs.priority,
				actions: inputs.actions,
			},
		};

		if (inputs.debug) {
			core.debug("");
			core.debug(`URL: ${inputs.url}`);
			core.debug("REQUEST:");
			core.debug(JSON.stringify(request, null, 4));
			core.debug("");
		}

		let response = await fetch(inputs.url, request);
		//const response = await axios({
		//    url: inputs.url,
		//	...request
		//    //method: 'POST',
		//    //headers: {
		//    //    'Content-Type': 'application/json',
		//    //    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0',
		//    //    'Priority': priority,
		//    //    ...headers
		//    //},
		//    //data: JSON.stringify({
		//    //    'topic': topic,
		//    //    'tags': tags,
		//    //    'title': (title),
		//    //    'actions': message[0],
		//    //    "message": message[1] + "\n\n" + details
		//    //})
		//})

		if (inputs.debug) {
			core.debug("");
			core.debug("RESPONSE:");
			core.debug(JSON.stringify(response, null, 4));
			core.debug("");
		}

		core.setOutput("response", {
			statusCode: response.statusCode,
		});
	} catch (error) {
		core.info("Failed making request to NTFY service");
		if (error.response && error.response.data) core.info(JSON.stringify(error.response.data));
		core.setFailed(error.message);
	}
}

async function run() {
	let inputs = await handleInput();
	await handleRequest(inputs);
}

run();

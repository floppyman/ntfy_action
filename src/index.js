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
		core.info("");
		core.info("CONTEXT:");
		core.info(JSON.stringify(context, null, 4));
		core.info("");
		core.info("");
		core.info("PAYLOAD:");
		core.info(JSON.stringify(payload, null, 4));
		core.info("");
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
	return {
		debug: getBoolInput("debug"),
		server_type: getStringInput("server_type", "github"),
		url: getStringInput("url", ""),
		basic_auth: getStringInput("basic_auth", ""),
		token_auth: getStringInput("token_auth", ""),
		tags: getStringInput("tags", "").split(","),
		topic: getStringInput("topic", ""),
		title: getStringInput("title", "GitHub Actions"),
		details: getStringInput("details", ""),
		priority: getIntInput("priority", 3),
		messageText: "",
		actions: "",
	};
}

async function run() {
	let inputs = {};

	try {
		core.info(`Reading inputs ...`);
		inputs = getInputs();
		console.log(inputs)

		if (inputs.debug) {
			core.info("");
			core.info("INPUT VALUES:");
			core.info(`  URL: ${inputs.url}`);
			core.info(`  BasicAuth: ${inputs.basic_auth}`);
			core.info(`  TokenAuth: ${inputs.token_auth}`);
			core.info(`  Tags: ${inputs.tags}`);
			core.info(`  Topic: ${inputs.topic}`);
			core.info(`  Title: ${inputs.title}`);
			core.info(`  Details: ${inputs.details}`);
			core.info(`  Priority: ${inputs.priority}`);
			core.info("");
		}

		let isGithub = inputs.server_type === "github";
		let isGitea = inputs.server_type === "gitea";

		core.info(`Creating GIT Information ...`);
		let message = await getMessageData(isGithub, isGitea, inputs.debug);

		inputs.messageText = `${message[1]} \n\n ${inputs.details}`;
		inputs.actions = message[0];
	} catch (error) {
		core.error("Failed getting action inputs");
		if (error.response && error.response.data) console.log(error.response.data);
		core.setFailed(error.message);
	}

	try {
		core.info(`Connecting to endpoint (${inputs.url}) ...`);

		let headers = {
			"Content-Type": "application/json",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
		};
		if (inputs.token_auth) headers["Authorization"] = `Bearer ${inputs.token_auth}`;
		else if (inputs.basic_auth) headers["Authorization"] = `Basic ${inputs.basic_auth}`;

		let request = {
			method: "POST",
			headers: headers,
			data: JSON.stringify({
				topic: inputs.topic,
				message: inputs.messageText,
				title: inputs.title,
				tags: inputs.tags,
				priority: inputs.priority,
				actions: inputs.actions,
			}),
		};

		if (inputs.debug) {
			core.info("");
			core.info(`URL: ${inputs.url}`);
			core.info("REQUEST:");
			core.info(JSON.stringify(request, null, 4));
			core.info("");
		}

		const response = await axios({
			url: inputs.url,
			...request
		})

		if (inputs.debug) {
			core.info("");
			core.info("RESPONSE:");
			core.info(JSON.stringify(response, null, 4));
			core.info("");
		}

		if (response.statusCode == 200)
			core.info(`Notification successfully posted (${inputs.url}/${inputs.topic}) ...`);

		core.setOutput("response", {
			statusCode: response.statusCode,
		});
	} catch (error) {
		core.error("Failed making request to NTFY service");
		if (error.response && error.response.data) console.log(error.response.data);
		core.setFailed(error.message);
	}
}

run();

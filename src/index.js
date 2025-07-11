const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

/**
 * returns an array with action_buttons and message
 * @returns array
 */
async function getMessageData(isGithub, isGitea, isDebug, simpleMessage) {
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
			if (simpleMessage) {
				message = `${payload.head_commit.committer.name} has pushed ${context.sha.slice(-7)} to ${payload.repository.full_name}.\n\n`;
				message += `Ref: ${context.ref}\n`;
				message += `Workflow Job Name: ${context.job}\n`;
				message += `Workflow Name: ${context.workflow}\n\n`;
				return [null, message];
			}

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
			message = `${payload.head_commit.committer.name} has pushed ${context.sha.slice(-7)} to ${payload.repository.full_name}.\n\n`;
			message += `Author: ${isGithub ? payload.head_commit.author.username : isGitea ? payload.head_commit.author.name : ""}\n`;
			message += `Author Email: ${payload.head_commit.author.email}\n`;
			message += `Committer: ${payload.head_commit.committer.name}\n`;
			message += `Committer Email: ${payload.head_commit.committer.email}\n`;
			message += `Ref: ${context.ref}\n`;
			message += `Pushed by: ${isGithub ? payload.pusher.name : isGitea ? payload.pusher.full_name : ""}\n`;
			message += `Workflow Job Name: ${context.job}\n`;
			message += `Workflow Name: ${context.workflow}\n\n`;
			message += `Commit Message\n${payload.head_commit.message}`;
			return [action_buttons, message];

		case "release":
			if (simpleMessage) {
				message = `${payload.release.author.login} has ${payload.action} ${payload.release.tag_name} on ${payload.repository.full_name}.\n\n`;
				message += `Name: ${payload.release.name}\n`;
				message += `Prerelease: ${payload.release.prerelease}\n`;
				message += `Workflow Job Name: ${context.job}\n`;
				message += `Workflow Name: ${context.workflow}\n\n`;
				message += `Release Message\n${payload.release.body}`;
				return [null, message];
			}

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
			message = `${payload.release.author.login} has ${payload.action} ${payload.release.tag_name} on ${payload.repository.full_name}.\n\n`;
			message += `Repo: ${payload.repository.html_url}\n`;
			message += `Name: ${payload.release.name}\n`;
			message += `Author: ${payload.release.author.login}\n`;
			message += `Prerelease: ${payload.release.prerelease}\n`;
			message += `Workflow Job Name: ${context.job}\n`;
			message += `Workflow Name: ${context.workflow}\n\n`;
			message += `Release Message\n${payload.release.body}`;
			return [action_buttons, message];

		case "schedule":
			message = `Scheduled task "${context.job}" ran in ${process.env.GITHUB_REPOSITORY}.\n\n`;
			message += `Workflow Name: ${context.workflow}\n`;
			message += `Cron: ${context.payload.schedule}`;

			if (simpleMessage) {
				return [null, message];
			}

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
			return [action_buttons, message];

		default:
			message = `Workflow "${context.workflow}" ran in ${payload.repository.full_name}\n\n`;
			message += `Repository: ${payload.repository.full_name}\n`;
			message += `Workflow Job Name: ${context.job}\n`;
			message += `Event Name: ${context.eventName}`;

			if (simpleMessage) {
				return [null, message];
			}

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
		simple_message: getBoolInput("simple_message"),
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

		if (inputs.debug) {
			core.info("");
			core.info("INPUT VALUES:");
			core.info(`  Server Type: ${inputs.server_type}`);
			core.info(`  URL: ${inputs.url}`);
			core.info(`  BasicAuth: ${inputs.basic_auth}`);
			core.info(`  TokenAuth: ${inputs.token_auth}`);
			core.info(`  Tags: ${inputs.tags}`);
			core.info(`  Topic: ${inputs.topic}`);
			core.info(`  Title: ${inputs.title}`);
			core.info(`  Details: ${inputs.details}`);
			core.info(`  Priority: ${inputs.priority}`);
			core.info(`  Simple Message: ${inputs.simple_message}`);
			core.info("");
		}

		let isGithub = inputs.server_type === "github";
		let isGitea = inputs.server_type === "gitea";

		core.info(`Creating GIT Information ...`);
		let message = await getMessageData(isGithub, isGitea, inputs.debug, inputs.simple_message);

		inputs.messageText = `${message[1]} \n\n ${inputs.details}`;
		if (message[0] != null) inputs.actions = message[0];
	} catch (error) {
		core.error("Failed getting action inputs");
		if (error.response && error.response.data) core.error(JSON.stringify(request, null, 4));
		core.setFailed(error.message);
	}

	try {
		core.info(`Connecting to endpoint ${inputs.url} ...`);

		let headers = {
			"Content-Type": "application/json",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
		};
		if (inputs.token_auth) headers["Authorization"] = `Bearer ${inputs.token_auth}`;
		else if (inputs.basic_auth) headers["Authorization"] = `Basic ${inputs.basic_auth}`;

		let request_data = {
			topic: inputs.topic,
			message: inputs.messageText,
			title: inputs.title,
			tags: inputs.tags,
			priority: inputs.priority,
		};
		if (inputs.actions) {
			request_data.actions = inputs.actions;
		}

		let request = {
			method: "POST",
			headers: headers,
			data: JSON.stringify(request_data),
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
			...request,
		});

		if (inputs.debug) {
			core.info("");
			core.info("RESPONSE:");
			core.info(`  status: ${response.status}`);
			core.info(`  statusText: ${response.statusText}`);
			core.info(`  statusCode: ${response.statusCode}`);
			core.info(`  body: ${response.body}`);
			core.info("");
		}

		if (response.status == 200) core.info(`Notification successfully posted to ${inputs.url}/${inputs.topic}`);

		core.setOutput("response", {
			statusCode: response.status,
		});
	} catch (error) {
		core.error("Failed making request to NTFY service");
		if (error.response && error.response.data) core.error(JSON.stringify(request, null, 4));
		core.setFailed(error.message);
	}
}

run();

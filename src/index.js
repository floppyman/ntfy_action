const core = require("@actions/core");
const github = require("@actions/github");

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

function getObjectInput(key, def) {
	var inp = getStringInput(key, "{}");
	try {
		return JSON.parse(inp);
	} catch (err) {
		core.info(err)
		return def;
	}
}

async function run() {
	let debug = false;
	let server_type = "";
	let url = "";
	let headers = {};
	let tags = "";
	let topic = "";
	let title = "";
	let details = "";
	let priority = 0;
	let messageText = "";
	let actions = "";

	try {
		core.info(`Reading inputs ...`);

		debug = getBoolInput("debug");
		server_type = getStringInput("server_type", "github");
		url = getStringInput("url", "");
		headers = getObjectInput("headers", {});
		tags = getStringInput("tags", "").split(",");
		topic = getStringInput("topic", "");
		title = getStringInput("title", "GitHub Actions");
		details = getStringInput("details", "");
		priority = getIntInput("priority", 3);

		if (debug) {
			core.info("");
			core.info("INPUT VALUES:");
			core.info(`  URL: ${url}`);
			core.info(`  Headers: ${JSON.stringify(headers, null, 4)}`);
			core.info(`  Tags: ${tags}`);
			core.info(`  Topic: ${topic}`);
			core.info(`  Title: ${title}`);
			core.info(`  Details: ${details}`);
			core.info(`  Priority: ${priority}`);
			core.info("");
		}

		let isGithub = server_type === "github";
		let isGitea = server_type === "gitea";

		core.info(`Connecting to endpoint (${url}) ...`);
		let message = await getMessageData(isGithub, isGitea, debug);

		messageText = `${message[1]} \n\n ${details}`;
		actions = message[0];
	} catch (error) {
		core.info("Failed getting action inputs");
		if (error.response && error.response.data) core.info(JSON.stringify(error.response.data));
		core.setFailed(error.message);
	}

	try {
		let request = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
				...headers,
			},
			data: JSON.stringify({
				topic: topic,
				message: messageText,
				title: title,
				tags: tags,
				priority: priority,
				actions: actions,
			}),
		};
		if (debug) {
			core.info("");
			core.info(`URL: ${url}`);
			core.info("REQUEST:");
			core.info(JSON.stringify(request, null, 4));
			core.info("");
		}
		let response = await fetch(url, request);
		core.setOutput("response", {
			statusCode: response.statusCode,
		});
	} catch (error) {
		core.info("Failed making request to NTFY service");
		if (error.response && error.response.data) core.info(JSON.stringify(error.response.data));
		core.setFailed(error.message);
	}
}

run();

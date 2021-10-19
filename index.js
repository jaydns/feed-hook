import { MessageEmbed, WebhookClient } from "discord.js";
import "dotenv/config";
import { decodeHTML } from "entities";
import Redis from "ioredis";
import cron from "node-cron";
import Parser from "rss-parser";

const webhook = new WebhookClient({
	url: process.env.WEBHOOK_URL,
});
const parser = new Parser();
const redis = new Redis(process.env.REDIS_URL);

async function postRssToWebhook() {
	const feed = await parser.parseURL(process.env.FEED_URL);
	console.log("Checking for new posts...");
	// using slice() because we don't want to reverse the array in place
	feed.items.slice().reverse().forEach(async (item) => {
		if (await redis.get(item.guid)) {
			console.log(`${item.guid} exists, skipping...`);
			return;
		}

		console.log(`Sending ${item.guid}...`)

		const embed = new MessageEmbed()
			.setTitle(item.title)
			.setURL(item.link)
			.setDescription(decodeHTML(item.content))
			.setTimestamp(new Date(item.pubDate))
			.setColor("#00bf39");

		webhook.send({ embeds: [embed] });
		redis.set(item.guid, "true");
	});
}

postRssToWebhook();

cron.schedule("* * * * *", postRssToWebhook);

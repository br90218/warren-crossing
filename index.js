const Discord = require('discord.js');
const Redis = require ('redis');
const client = new Discord.Client();

const redisClient = Redis.createClient(process.env.REDIS_URL);
const prefix = process.env.PREFIX;

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async message => {
	//if (!message.content.startsWith(prefix) || message.author.bot) return;

	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)){
		console.log(message.content);
		return;
	}

	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

	if (command.content === 'getprice'){
		redisClient.get(args[0], (error, reply) => {
			if(!error && reply)	{
				message.channel.send(message.author + '\'s island is buying turnips at ' + reply + ' bells!')
			}
			else{
				message.channel.send(`${args[0]} has not reported their turnip price of the day. bad bad!`)
			}
		})
	}
});

client.login(process.env.BOT_TOKEN);
const Discord = require('discord.js');
const Redis = require ('redis');
const client = new Discord.Client();

const redisClient = Redis.createClient(process.env.REDIS_URL);


client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async message => {
	if (message.content === '!ping') {
		message.channel.send('Pong.');
	}

	else if (message.content === 'test'){
		redisClient.get(message.author, (error, reply) => {
			if(!error && reply)	{
				message.channel.send(message.author + '\'s island is buying turnips at ' + reply + ' bells!')
			}
			else{
				message.channel.send(message.author + ' has not reported their turnip price of the day. bad bad!')
			}
		})
	}


});

client.login(process.env.BOT_TOKEN);
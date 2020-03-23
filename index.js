const Discord = require('discord.js');
const Redis = require ('redis');
const client = new Discord.Client();

Redis.createClient(process.env.REDIS_URL);


client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.content === '!ping') {
		message.channel.send('Pong.');
	}
});



client.login(process.env.BOT_TOKEN);
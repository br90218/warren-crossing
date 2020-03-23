const Discord = require('discord.js');
const Redis = require ('redis');
const client = new Discord.Client();

Redis.createClient(process.env.REDIS_URL);


client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async message => {
	if (message.content === '!ping') {
		message.channel.send('Pong.');
	}

	else if (message.content === 'test'){
		Redis.get(message.member, (error, reply) => {
			if(!error && reply)	{
				message.channel.send(message.member.concat('\'s island sells turnips at a price of', reply))
			}
			else{
				message.channel.send(message.member.concat(' has not reported their turnip price today. bad bad!'))
			}
		})
	}


});

client.login(process.env.BOT_TOKEN);
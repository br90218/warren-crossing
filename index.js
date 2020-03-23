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
		return;
	}

	const args = message.content.slice(prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();

	if (command === 'getprice'){
		if(args.length === 0){

		}
		else {

			for (var i = 0; i < args.length; i++){
				console.log(args[i]);
				redisClient.get(args[i].toString(), (error, reply) => {
					if(!error && reply)	{
						message.channel.send(`${args[i]}'s island is buying turnips at` + reply + ' bells!')
					}
					else{
						message.channel.send(`${args[i]} has not reported their turnip price of the day. bad bad!`)
					}
				})
			}

		}
	}

	else if (command === 'setprice'){
		if(args.length === 0){
			return message.channel.send("You did not enter a price!");
		}
		else if (args.length > 1){
			return message.channel.send("There are too many arguments!");
		}
		else{
			redisClient.set(message.author.toString(), args[0].toString());
			message.channel.send(`${message.author} has set their turnip price of the day at ${args[0]}`);
		}
	}

});	

client.login(process.env.BOT_TOKEN);
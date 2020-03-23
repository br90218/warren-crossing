const Discord = require('discord.js');
const config = require ('./config.json');
const Keyv = require('keyv');
const client = new Discord.Client();

const keyv = new Keyv();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.content === '!ping') {
		message.channel.send('Pong.');
	}
});


keyv.on('error', err => console.error('Keyv connection error:', err));

client.login(config.token);
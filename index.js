const Discord = require('discord.js');

const mongodb = require ('mongodb');
const mongoClient = mongodb.MongoClient;
const client = new Discord.Client();
var collection;

const prefix = process.env.PREFIX;

const userIDindex = { userid: 1 }
const priceIndex = { price: -1 }
const expIndex = {expireAt: 1}


mongoClient.connect(process.env.MONGODB_URI, function(err, client) {
	if (err){
		console.log('unable to connect to the mongoDB server. Error dump: ', err);
	}
	else {
		console.log('Connection established to: ', process.env.MONGODB_URI);
	}

	client.db().collection('TurnipPrices', function (err, returncollection) {
		if(err){
			console.log('unable to connect to the designated db/collection. Error dump: ', err);
		}
		else {
			console.log('Connection to db and collection estalished.');
		}
		collection = returncollection;
	});
	collection.createIndex(userIDindex, {unique: true}, function(err, result){
		if(err){
			console.log('unable to create index to this collection. Error dump: ', err);
		}
	});
	collection.createIndex(priceIndex);
	collection.createIndex(expIndex, {expireAfterSeconds : 0});
});

client.once('ready', function () {
	
	console.log('Ready!');
});

client.on('message', async message => {
	//if (!message.content.startsWith(prefix) || message.author.bot) return;

	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)){
		return;
	}

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'getprice'){
		if(args.length === 0){
			var result = "Here are all records so far:\n"
			 await collection.find().sort(priceIndex).forEach(async function (doc){
				message.guild.members.fetch(doc.userid).then( function (value){
					result += ( value.nickname + `${value}'s island is buying turnips at **` + doc.price + '** bells!\n');
				})			
			})
			if (result === "Here are all records so far:\n"){
				result += 'No one has reported buying prices today. Be the first!';
			}
			message.channel.send(result);
		}
		else {
			for (var i = 0; i < args.length; i++){
				console.log(args[i]);
				var id = args[i].toString().replace(/[\\<>@#&!]/g, "");
				message.guild.members.fetch(id).catch((()=>{
					return message.channel.send('**' + id + '** is not a valid member in this server!');
				})).then (function (value){
					collection.findOne({userid: id}, async function (err, result){
						if(err){
							console.log("An error has occured when trying to retrieve record for" + id.toString() + ":", err);
						}
						else if (!result){
							message.channel.send(`${value} has not reported their price today. Bad bad!`);
						}
						else{
							message.channel.send(value.nickname + `'s island is buying turnips at **` + result.price + '** bells!')
						}
					})
				})
			}
		}
	}

	else if (command === 'setprice'){
		if(args.length === 0){
			return message.reply("You did not enter a price!");
		}
		else if (args.length > 1){
			return message.reply("There are too many arguments!");
		}
		else{
			if (isNaN(args[0])) {
				console.log('Received args that is not a number: ', args[0]);
				return message.reply("That was not a number!");
				
			}
			var id = message.author.id;
			var expDate = new Date();
			var mod = 0;
			if (expDate.getUTCHours() > 11) mod = 1; 
			expDate = new Date(expDate.getUTCFullYear(), expDate.getUTCMonth(), expDate.getUTCDate() + mod, 11, 0, 0, 0);
			collection.updateOne({ userid: id }, { $set: { price: parseInt(args[0]), expireAt: expDate}}, { upsert: true});
			message.channel.send(`${message.author} has set their turnip price of the day at ${args[0]}`);
		}
	}

	else if (command === 'help'){
		message.channel.send('Hi! This is Warren Turnip. I help keep track of everyone\'s turnip price of the day.');
		message.channel.send('Use **!turnip setprice [PRICE]** to report your price today');
		message.channel.send('Use **!turnip getprice [@USER1, @USER2, @USER3...]** to check for their offers today (If USER is not specified, I will tell you everyone\'s offers today!');
	}

	else if (command === 'updates'){
		var info = 'Hi! It\'s been a while. During this time, crazy coder Brian has made the following adjustments:\n'
		info += 'I stopped using Heroku Redis, it was not the right platform. I now use MongoDB! Since I have migrated, you will need to input again.\n'
		info += 'My incapability of listing out all the prices of the day has been fixed. Plus, now it *should* list out all the prices from highest to lowest.\n'
		info += 'My incapability of listing out everything in one message has been fixed.\n'
		info += 'I can now identify an actual number, so don\'t feed me SHIT again.\n'
		info += 'You can now tag multiple people in one take! Refer to **!turnip help** for more info!\n'
		info += '...hmm, I think that\'s pretty much it. Please let Brian know if I\'m not working again.'


		message.channel.send(info);

	}



});	

client.login(process.env.BOT_TOKEN);


//var targetMember = await client.users.fetch(id);
						//result = result.concat(result,`${targetMember}'s island is buying turnips at **`, reply, '** bells!\n');
						//message.channel.send(`${targetMember}'s island is buying turnips at **` + reply + '** bells!\n');
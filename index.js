const Discord = require('discord.js');
const Redis = require ('redis');

const mongodb = require ('mongodb');
const mongoClient = mongodb.MongoClient;
const client = new Discord.Client();
var collection;

const redisClient = Redis.createClient(process.env.REDIS_URL);
const prefix = process.env.PREFIX;

const userIDindex = { userid: 1 }
const priceIndex = { price: -1 }


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
			// message.guild.members.cache.forEach(user => {
			// 	var id = user.toString().replace(/[\\<>@#&!]/g, "");
			// 	redisClient.get(id, async(error, reply) => {
			// 		if(!error && reply) {
						
			// 			var targetMember = await client.users.fetch(id);
			// 			result = result.concat(result,`${targetMember}'s island is buying turnips at **`, reply, '** bells!\n');
			// 			message.channel.send(`${targetMember}'s island is buying turnips at **` + reply + '** bells!\n');

			// 			//client.users.fetch(id).then(user => {
			// 			//	result += (`${user}'s island is buying turnips at **` + reply + '** bells!\n')
			// 			//})
			// 		}
			// 		else{
			// 			console.log(error);
			// 		}
			// 	})
			// });
			// console.log(result);
			// message.channel.send(result);

			collection.find().sort(priceIndex).forEach(async function (doc){
				var targetMember = await client.users.fetch(doc.userid);
				result += `${targetMember}'s island is buying turnips at **`;
			})

		    message.channel.send(result);


		}
		else {
			for (var i = 0; i < args.length; i++){
				console.log(args[i]);
				var id = args[i].toString().replace(/[\\<>@#&!]/g, "");
				// redisClient.get(id, async(error, reply) => {
				// 	if(!error && reply)	{
				// 		var targetMember = await client.users.fetch(id);
				// 		message.channel.send(`${targetMember}'s island is buying turnips at **` + reply + '** bells!');
				// 	}
				// 	else{
				// 		console.log(error);
				// 		message.channel.send(`${targetMember} has not reported their turnip price of the day. bad bad!`)
				// 	}1
				// })
				
				collection.findOne({userid: id}, async function (err, result){
					if(err){
						console.log("An error has occured when trying to retrieve record for" + id.toString() + ":", err);
					}
					else{
						var targetMember = await client.users.fetch(id);
						message.channel.send(`${targetMember}'s island is buying turnips at **` + result.price + '** bells!')
					}
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
				return message.reply("It's not a number!");
				
			}
			console.log(message.author.toString());
			var id = message.author.id;
			collection.updateOne({ userid: id }, { $set: { price: parseInt(args[0])}}, { upsert: true});
			message.channel.send(`${message.author} has set their turnip price of the day at ${args[0]}`);
		}
	}

	else if (command === 'help'){
		message.channel.send('Hi! This is Warren Turnip. I help keep track of everyone\'s turnip price of the day.');
		message.channel.send('Use **!turnip setprice [PRICE]** to report your price today');
		message.channel.send('Use **!turnip getprice [USER]** to check for their offer today (If USER is not specified, I will tell you everyone\'s offers today!');
	}



});	

client.login(process.env.BOT_TOKEN);


//var targetMember = await client.users.fetch(id);
						//result = result.concat(result,`${targetMember}'s island is buying turnips at **`, reply, '** bells!\n');
						//message.channel.send(`${targetMember}'s island is buying turnips at **` + reply + '** bells!\n');
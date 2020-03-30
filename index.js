const Discord = require('discord.js');

const mongodb = require ('mongodb');
const mongoClient = mongodb.MongoClient;
const client = new Discord.Client();

var collection;
var salesRecordCollection;


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
		turnipCollection = returncollection;
	});
	turnipCollection.createIndex(userIDindex, {unique: true}, function(err, result){
		if(err){
			console.log('unable to create index to this collection. Error dump: ', err);
		}
	});

	collection.createIndex(priceIndex);
	collection.createIndex(expIndex, {expireAfterSeconds : 0});

	client.db().collection('SalesRecord', function (err, returncollection) {

		if(err){
			console.log('unable to connect to the designated db/collection. Error dump: ', err);
		}
		else {
			console.log('Connection to db and collection estalished.');
		}

		salesRecordCollection = returncollection;
	});
	salesRecordCollection.createIndex(userIDindex, {unique: true}, function(err, result){
		if(err){
			console.log('unable to create index to the salesRecordCollection. Error dump: ', err);
		}
	})

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
			 await turnipCollection.find().sort(priceIndex).forEach(async function (doc){
				message.guild.members.fetch(doc.userid).then( function (value){
					result += ( value.displayName + `'s island is buying turnips at **` + doc.price + '** bells!\n');
				}).catch(() =>{
					console.error("There was an error while trying to access this id: ", doc.userid);
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
				message.guild.members.fetch(id).then (function (value){
					turnipCollection.findOne({userid: value.id}).then( function (result){
						if (!result){
							message.channel.send(`${value} has not reported their price today. Bad bad!`);
						}
						else{
							message.channel.send( value.displayName + `'s island is buying turnips at **` + result.price + '** bells!')
						}
					}).catch((err) => {
						console.error("An error has occured when trying to retrieve record for" + id.toString() + ":", err);
					})
				}).catch((()=>{
					return message.channel.send('**' + id + '** is not a valid member in this server!');
				}))
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

			var dayModifier = 0;
			if (expDate.getUTCHours() > 11) dayModifier = 1; 
			expDate = new Date(expDate.getUTCFullYear(), expDate.getUTCMonth(), expDate.getUTCDate() + dayModifier, 11, 0, 0, 0);
			collection.updateOne({ userid: id }, { $set: { price: parseInt(args[0]), expireAt: expDate}}, { upsert: true});

			message.channel.send(`${message.author} has set their turnip price of the day at ${args[0]}`);
		}
	}

	else if (command == 'boughtat'){
		if(args.length !== 2){
			return message.channel.send('You have invalid number of arguments: ' + args.length);
		}
		else if (isNaN(args[0]) || isNaN(args[1])){
			return message.channel.send('At least one of your arguments is not a number!');
		}
		
		var authorId = message.author.id;
		salesRecordCollection.updateOne({ userid: authorId }, { $set: {buyprice: parseInt(args[0]), qty: parseInt(args[1])}}, { upsert: true});
		message.channel.send(message.author.displayName + ' has bought ' + args[1] + ' turnips at ' + args[0] + ' bells!');
	}


	else if (command === 'help'){
		message.channel.send('Hi! This is Warren Turnip. I help keep track of everyone\'s turnip price of the day.');
		message.channel.send('Use **!turnip setprice [PRICE]** to report your price today');
		message.channel.send('Use **!turnip getprice [@USER1, @USER2, @USER3...]** to check for their offers today (If USER is not specified, I will tell you everyone\'s offers today!');
	}

	else if (command === 'updates'){
		var info = 'Hi! It\'s Warren Turnip here. I hope you all had a good night\'s sleep. Here\'s what has changed:\n'
		info += '- The **getprice** command will not mention people anymore.\n'
		info += '- Fixed an async/await bug where the individual price checking returns erroneous results.\n'
		info += '...\nThat\'s pretty much it! Let Brian know if anything wrong happens to me again!\n'


		message.channel.send(info);

	}



});	

client.login(process.env.BOT_TOKEN);


//var targetMember = await client.users.fetch(id);
						//result = result.concat(result,`${targetMember}'s island is buying turnips at **`, reply, '** bells!\n');
						//message.channel.send(`${targetMember}'s island is buying turnips at **` + reply + '** bells!\n');
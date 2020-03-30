const Discord = require('discord.js');
const mongodb = require ('mongodb');
const stringSimilarity = require ('string-similarity')


const mongoClient = mongodb.MongoClient;
const client = new Discord.Client();

var turnipCollection;
var salesRecordCollection;
var wrongCommandsCollection;


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

	turnipCollection.createIndex(priceIndex);
	turnipCollection.createIndex(expIndex, {expireAfterSeconds : 0});

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
	});

	client.db().collection('WrongCommands', function (err, returncollection) {
		
		if(err){
			console.log(err);
		}
		else{
			console.log('connected!');
		}
		wrongCommandsCollection = returncollection;
	});
	wrongCommandsCollection.createIndex(userIDindex, {unique: true}, function(err, result){
		if(err){
			console.log('unable to create index to the wrongCommandsCollection. Error dump: ', err);
		}
	});
	wrongCommandsCollection.createIndex(expIndex, {expireAfterSeconds : 20})
})

client.once('ready', function () {
	console.log('Ready!');
});

client.on('message', async message => {
	//if (!message.content.startsWith(prefix) || message.author.bot) return;
	var actualCommand;
	
	if (message.author.bot) return;
	
	if (message.content.startsWith('!fuck')){
		wrongCommandsCollection.findOne({userid: message.author.id}).then(async function (result){
			if(!result){
				return message.channel.send('But sir, there\'s nothing to be corrected...');
			}
			console.log("Result:" + result.command);
			await processCommand(result.command, message);
		}).catch( (err) =>{
			console.log(err);
		})
	}
	else if (!message.content.startsWith(prefix)){
		var falseCommand = message.content.substr(0, message.content.indexOf(' '));
		if(stringSimilarity.compareTwoStrings(prefix, falseCommand) > 0.6){
			message.channel.send("Did you mean: **!turnip**?");
		}
		return;
	}	
	else{
		actualCommand = message.content;
		await processCommand(message.content, message);
	}
})


async function processCommand(actualCommand, message){
	console.log("Passed in command: " + actualCommand);
	
	const args = actualCommand.slice(prefix.length).trim().split(/ +/);
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
			turnipCollection.updateOne({ userid: id }, { $set: { price: parseInt(args[0]), expireAt: expDate}}, { upsert: true});

			message.channel.send(`${message.author} has set their turnip price of the day at ${args[0]}`);
		}
	}

	else if (command === 'boughtat'){
		if(args.length !== 2){
			return message.channel.send('The **boughtat** command takes exactly **2** arguments. You typed in: ' + args.length);
		}
		else if (isNaN(args[0]) || isNaN(args[1])){
			return message.channel.send('At least one of your arguments is not a number!');
		}
		
		var authorId = message.author.id;
		salesRecordCollection.updateOne({ userid: authorId }, { $setOnInsert:{netprofit: 0}, $set: {buyprice: parseInt(args[0]), qty: parseInt(args[1])}}, { upsert: true});
		message.channel.send(message.guild.member(message.author).displayName + ' has bought ' + args[1] + ' turnips at ' + args[0] + ' bells!');
	}

	else if (command === 'soldat'){
		if(args.length !== 2){
			return message.channel.send('The **soldat** command takes exactly **2** arguments. You typed in: ' + args.length);
		}
		else if (isNaN(args[0]) || isNaN(args[1])){
			return message.channel.send('At least one of your arguments is not a number!');
		}

		var authorId = message.author.id;
		salesRecordCollection.findOne({userid: authorId}).then( function(result){
			if(!result){
				return message.reply("it seems like you don't have any sales records with me yet!");
			}
			else if(result.qty < parseInt(args[1])){
				return message.reply("it seems like you're selling more than what you have...");
			}

			var currProfit = (parseInt(args[1])) * (parseInt(args[0]) - result.buyprice);
			var remainingQty = result.qty - parseInt(args[1]);

			salesRecordCollection.updateOne({userid:authorId}, {$set: {netprofit: currProfit, qty: remainingQty}});
			message.channel.send(message.guild.member(message.author).displayName + 'has sold ' + args[1] + ' turnips at ' + args[0] + ' bells, making them a net profit of **' + currProfit + '** bells!');
		}).catch( (err) => {
			console.log(err);
		})
	}

	else if (command === 'getrecords'){

	}


	else if (command === 'help'){
		message.channel.send('Hi! This is Warren Turnip. I help keep track of everyone\'s turnip price of the day.');
		message.channel.send('Use **!turnip setprice [PRICE]** to report your price today');
		message.channel.send('Use **!turnip getprice [@USER1, @USER2, @USER3...]** to check for their offers today (If USER is not specified, I will tell you everyone\'s offers today!');
		message.channel.send('Use **!turnip boughtat [PRICE] [QUANTITY] to report how many turnips you bought at PRICE.');
		message.channel.send('Use **!turnip soldat [PRICE] [QUANTITY] to report how many turnips you sold at PRICE.');
		message.channel.send('(The _soughtat_, _boughtat_ commands assume an "all in, all out" policy. If you buy in different strategies, I might not be able to calculate your profit correctly.)')
	}

	else if (command === 'updates'){
		var info = 'Hi! It\'s Warren Turnip here. I can now do more things:\n'
		info += '- **boughtat [price] [quantity]** will record how many turnips you bought, at what price on Sunday, conversely:\n'
		info += '- **soldat [price] [quantity]** will record how many turnips you sold at a given price. I\'ll also take notes of the net profit you\'ve earned!\n'
		info += '...\nThat\'s pretty much it! Let Brian know if anything wrong happens to me again!\n'


		message.channel.send(info);
	}

	else{
		var correctedString = stringSimilarity.findBestMatch(command, ['getprice','setprice','boughtat','soldat','help','updates']).bestMatch.target;
		var correctedCommand = '!turnip '+ correctedString;
		if(args.length > 0) correctedCommand += ' ' + args.join(' ');
		wrongCommandsCollection.updateOne({userid: message.author.id}, { $set: { command: correctedCommand }}, {upsert: true});
		message.channel.send("Did you mean: **" + correctedCommand + "**?");
	};	
}


client.login(process.env.BOT_TOKEN);


//var targetMember = await client.users.fetch(id);
						//result = result.concat(result,`${targetMember}'s island is buying turnips at **`, reply, '** bells!\n');
						//message.channel.send(`${targetMember}'s island is buying turnips at **` + reply + '** bells!\n');
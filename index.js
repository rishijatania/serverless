const aws = require("aws-sdk");
var ddb = new aws.DynamoDB({ apiVersion: "2012-08-10" });
var ses = new aws.SES();
aws.config.update({ region: "us-east-1" });
var docClient = new aws.DynamoDB.DocumentClient();
exports.emailService = function (event, context, callback) {
	let message = event.Records[0].Sns.Message;
	let messageJson = JSON.parse(message);
	let user = messageJson.user;
	let billsDue = messageJson.billsDue;
	console.log("Test Message: " + messageJson);
	console.log("Test user: " + user);
	console.log("Test billsdue: " + billsDue);
	let currentTime = new Date().getTime();
	let ttl = 60 * 60 * 1000;
	let expirationTime = (currentTime + ttl).toString();
	var emailParams = {
		Destination: {
			/* required */
			ToAddresses: [
				user.email_address
				/* more items */
			]
		},
		Message: {
			/* required */
			Body: {
				Text: {
					Charset: "UTF-8",
					Data: billsDue
				}
			},
			Subject: {
				Charset: "UTF-8",
				Data: "Bill that are due"
			}
		},
		Source: "no-reply@" + process.env.DOMAIN_NAME /* required */
	};
	let putParams = {
		TableName: "csye6225",
		Item: {
			id: { S: user.email_address },
			bills: { S: billsDue },
			ttl: { N: expirationTime }
		}
	};
	let queryParams = {
		TableName: 'csye6225',
		Key: {
			'id': { S: user.email_address }
		},
	};
	// first get item and check if email exists
	//if does not exist put item and send email,
	//if exists check if ttl > currentTime,
	// if ttl is greater than current time do nothing,
	// else send email
	ddb.getItem(queryParams, (err, data) => {
		if (err) console.log(err)
		else {
			// console.log('getItemttl: '+JSON.stringify(data, null, 2));
			console.log(data.Item)
			let jsonData = JSON.stringify(data)
			console.log(jsonData)
			let parsedJson = JSON.parse(jsonData);
			console.log(parsedJson)
			if (data.Item == null) {
				ddb.putItem(putParams, (err, data) => {
					if (err) console.log(err);
					else {
						console.log(data);
						console.log('sent from 1st function')
						var sendPromise = ses.sendEmail(emailParams).promise();
						sendPromise
							.then(function (data) {
								console.log(data.MessageId);
							})
							.catch(function (err) {
								console.error(err, err.stack);
							});
					}
				});
			} else {
				let curr = new Date().getTime();
				let ttl = Number(parsedJson.Item.ttl.N);
				console.log(typeof curr + ' ' + curr);
				console.log(typeof ttl + ' ' + ttl);
				if (curr > ttl) {

					ddb.putItem(putParams, (err, data) => {
						if (err) console.log(err);
						else {
							console.log(data);
							console.log('sent from 1st function')
							var sendPromise = ses.sendEmail(emailParams).promise();
							sendPromise
								.then(function (data) {
									console.log(data.MessageId);
								})
								.catch(function (err) {
									console.error(err, err.stack);
								});
						}
					});
				}
			}
		}
	});
};
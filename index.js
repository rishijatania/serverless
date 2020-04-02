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
	let noOfDays = messageJson.noOfDays;
	console.log("Test Message: " + JSON.stringify(messageJson));
	console.log("Test user: " + JSON.stringify(user));
	console.log("Test billsdue: " + billsDue);
	console.log("Test noOfDays: " + noOfDays);
	let currentTime = new Date().getTime();
	let ttl = 60 * 60 * 1000;
	let expirationTime = (currentTime + ttl).toString();
	let emailBody = "Hi " + user.first_name + ", \n\n You have " + billsDue.length + " bills due in next " +noOfDays+ " days you requested for. \n\n Please click the links below to view them. Only you're authorised to view them. \n\n";
	for (var i = 0; i < billsDue.length; i++) {
		let url = billsDue[i];
		emailBody += url + " \n";
	}
	emailBody += "\n Thanks, \n" + process.env.DomainName;
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
					Data: emailBody
				}
			},
			Subject: {
				Charset: "UTF-8",
				Data: "Bill that are due"
			}
		},
		Source: "no-reply@" + process.env.DomainName /* required */
	};
	console.log('email params ' + JSON.stringify(emailParams));
	let putParams = {
		TableName: "csye6225",
		Item: {
			id: { S: user.email_address },
			ttl: { N: expirationTime }
		}
	};
	console.log('put params ' + JSON.stringify(putParams));
	let queryParams = {
		TableName: 'csye6225',
		Key: {
			'id': { S: user.email_address }
		},
	};
	console.log('query params ' + JSON.stringify(queryParams));
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
			console.log('Before checking if Item Present');
			if (data.Item == null || data.Item == undefined) {
				console.log('Item Not Present');
				ddb.putItem(putParams, (err, result) => {
					if (err) console.log(err);
					else {
						console.log('Send Email');
						console.log(result);
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
				console.log('If Item Present');
				let curr = new Date().getTime();
				let ttl = Number(parsedJson.Item.ttl.N);
				console.log(typeof curr + ' ' + curr);
				console.log(typeof ttl + ' ' + ttl);
				if (curr > ttl) {
					console.log('Over 60 Minutes');
					ddb.putItem(putParams, (err, data) => {
						if (err) console.log(err);
						else {
							console.log(data);
							console.log('Send Email')
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

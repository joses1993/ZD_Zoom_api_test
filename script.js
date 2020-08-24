const http = require("http");
const https = require("https");
const request = require("request");
const creds = require("./creds");
var express = require('express');
const async = require('async');
var app = express();
var base = "https://testy4860.zendesk.com";
console.log(creds.zd_token)
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', 1337);
app.use(express.static(__dirname + '/public'));



// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

var options = {
   uri: base+"/api/v2/users.json", 
   headers: {
   	   'Authorization' : "Basic "+creds.zd_token,
       'User-Agent': 'Zoom-api-Jwt-Request',
       'content-type': 'application/json'
   },
   json: true //Parse the JSON string in the response
};



var getTix = {
   uri: base+"/api/v2/users.json", 
   headers: {
   	   'Authorization' : "Basic "+creds.zd_token,
       'User-Agent': 'Zoom-api-Jwt-Request',
       'content-type': 'application/json'
   },
   json: true //Parse the JSON string in the response
};




app.post('/createZdUser',function(req,res,next){


	console.log("******creating new user*****");

  	var context = {};
  	options.uri = base+'/api/v2/users.json';
	options.body = {"user":{"name": req.body.first_name  + " " + req.body.last_name,"email": req.body.email}}

  	request.post(options, (err, resZD, body) => {
		if(err){console.log("error: ", error)}
		console.log("redirecting home");
		res.redirect("/");
	})
  
});


//get user info and whether they are zoom user
app.get('/user/:id', function(req,res,next){

	var context = {};
	var id = req.params.id;

	mainRes = res;

	options.uri = base + '/api/v2/users/' + id + ".json"
	request.get(options, function(req,res,body){
		context = body.user

		options.uri = base + "/api/v2/users/" + id + "/tickets/requested.json";
		request.get(options, function(req,res,body2){
			context.tickets = body2;



			if(context.email) {

				var today = new Date();
				var dd = String(today.getDate()).padStart(2, '0');
				var mm = String(today.getMonth() ).padStart(2, '0'); //January is 0!
				var yyyy = today.getFullYear();

				prevMonth = mm + '-' + dd + '-' + yyyy;
				console.log("prevMonth",prevMonth);

				zoom_options =  
				{  uri: "https://api.zoom.us/v2/report/users/"+ context.email + "/meetings", 
				   qs: {
				       status: 'scheduled', 
				       page_size: 300,
				       from: prevMonth
				   },
				   auth: {
				       'bearer': creds.zoom_jwt
				   },
				   headers: {
				       'User-Agent': 'Zoom-api-Jwt-Request',
				       'content-type': 'application/json'
				   },
				   json: true //Parse the JSON string in the response
				};

				context.zoom = {};

				//get zoom meetings
				request.get(zoom_options, function(req,res,body3){

					//console.log("body3: ",res.statusCode)

					if(res.statusCode == 200)
					{
						//console.log("body3",body3);							
						context.zoom.zoom_user = 'yes';
						context.zoom.meetings = body3.meetings;
					} 

					options.uri = base + "/api/v2/users/" + context.id + "/tickets/requested.json";
					//get ZD tix
					request.get(options, (err, resTix, bodyTix) => {
						if(err) {console.log("error: ",err)}
						
						context.tickets = bodyTix;
						console.log(context.tickets);

						mainRes.render('user', context);
					})

				})

			} else {
				mainRes.render('user',context)
			}
		})

	})

	
});


app.post('/createZdTicket',function(req,res,next){


	console.log(req.body);

  	var context = {};
  	options.uri = base+'/api/v2/tickets.json';
	options.body = {"ticket":{"subject": req.body.ZdEmail  + " " + req.body.meeting_id,"requester_id": req.body.ZdId, "description": req.body.ZdEmail  + " " + req.body.meeting_id}}

	
	console.log(options.body);

  	request.post(options, (err, resZD, body) => {
		if(err){console.log("error: ", error)}
		console.log("new Ticket Resp: ", resZD.statusMessage, resZD.statusCode);
		console.log('body: ', body)
;
		res.redirect("/user/"+req.body.ZdId);
	})


  
});


app.get('/', function(req,res,next){

  	var context = {};
  	context.help = "help";
  	options.uri = base +"/api/v2/users.json";

	request.get(options, (err, resZD, body) => {
		if(err){console.log("error: ", error)}

		context.users = body.users;
		//console.log("context.users: ",context.users)

		async.each(context.users, function(user, callback) {
			//user.ZdId = user.id;
			options.uri = base + "/api/v2/users/"+ user.id+"/tickets/requested.json";
			request.get(options, (err, resTix, bodyTix) => {
				if(err) {console.log("error: ",err)}
				//console.log("bodyTix: ",bodyTix);
				user.count = bodyTix.count;
				//console.log("user.count: ",user.count);
				callback(null);

			});
		}, function(err){console.log("rendering home"); res.render('home', context)});

	});

});

app.use(function(req,res){
  res.status(404);
  res.redirect('/');
});

app.use(function(err, req, res, next){
  console.error(err);
  res.status(500);
  res.redirect('/');
});


app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});


/*authorizing w/zd
1. {email_address}/token:{api_token} = jdoe@example.com/token:6wiIBWbGkBMo1mRDMuVwkw1EPsNkeUj95PIz2akv
2. base64(jdoe@example.com/token:6wiIBWbGkBMo1mRDMuVwkw1EPsNkeUj95PIz2akv)
3. "Authorization: Basic xxxxBASE64ENCODEDSTRING" 

*/

		// async.each(context.users, function(user) {

		// 	options.uri = "https://testy4860.zendesk.com/api/v2/users/"+ user.id+"/tickets/requested.json";
		// 	console.log(options.uri);
		// 	request.get(options, (err, resTix, bodyTix) => {
		// 		if(err) {console.log("error: ",err)}
		// 		console.log("bodyTix: ",bodyTix);
		// 		user.count = bodyTix.count;
		// 		console.log("user.count: ",user.count);

		// 	});
		// }, function(){console.log("rendering home"); res.render('home', context)});




// /**Working get request to zd**/
// request.get(options, (err, res, body) => {
// 	console.log("options: ", options)
// 	if(err){console.log("error: ", error)}
// 	//console.log("count: ",body.users)

// 	for( var i in body.users) {
// 		console.log(body.users[i].email);
// 	}
// })











// request('http://www.google.com', function (error, response, body) {
//   console.error('error:', error); // Print the error if one occurred
//   console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//   console.log('body:', body); // Print the HTML for the Google homepage.
// });

// const express = require('express')
// const app = express()

// app.get("/", (req,res) => {

// 	console.log("responding to root route", req)
// 	res.send("Hi")
// })

// app.get("/users", (req,res) => {

// 	console.log("responding to root route", req)
// 	res.send("Hi")
// })

// app.listen('3003', () => {

// 	console.log("server is up and listening 3003...")
// })

 // url: https://api.darksky.net/forecast/2f469c75fad07af26d13d173cd65ee40/37.8267,-122.4233
 // api key: 2f469c75fad07af26d13d173cd65ee40


//zoom
//api key: NURr60ALSp2UzCXEZ4U5Ig
//api secret: 59LFTTYSq9lnt2B0XF3zt9DFUxS3QUd9J8cG

/**Working JWT token**/
// const jwt = require("jsonwebtoken")

// header = {

// 	"alg": "HS256",
// 	"typ": "JWT"
// }


//  const payload = {
//     iss: "NURr60ALSp2UzCXEZ4U5Ig",
//     exp: ((new Date()).getTime() + 50000)
// };

// const token = jwt.sign(payload, "59LFTTYSq9lnt2B0XF3zt9DFUxS3QUd9J8cG");
// console.log("token: ", token)



 // request("https://api.darksky.net/forecast/2f469c75fad07af26d13d173cd65ee40/37.8267,-122.4233", {json: true},(err, res, body) => {

 // 	console.log("body: ", res.body.daily.data)
 // })

// const email = "jose.sanchez@email.com";

// var options = {
//    uri: "https://api.zoom.us/v2/users/"+email, 
//    qs: {
//        status: 'active' 
//    },
//    auth: {
//        'bearer': token
//    },
//    headers: {
//        'User-Agent': 'Zoom-api-Jwt-Request',
//        'content-type': 'application/json'
//    },
//    json: true //Parse the JSON string in the response
// };



// /**Working get request**/
// request.get(options, (err, res, body) => {

// 	if(err){console.log("error: ", error)}
// 	console.log(res, body)
// })


/**Oauth request**/

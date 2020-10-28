const http = require('http');
const express = require('express');
//const request = require('request');
//const rp = require('request-promise');
const axios = require('axios');
const HTMLParser = require('node-html-parser');
const moment = require('moment');
const util = require('util');

// referenz auf express
const app = express();

let spielplan = {};
let teams = [];

const server = http.createServer(app);

server.listen(3001, () => {
	console.log('Server listening on port 3001');
	updateSpielplan();

	// update alle 24 h
	setInterval(updateSpielplan, 1000 * 60 * 60 * 24);
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.route('/').get((req,res) => {
	console.log("get:");
	//console.log(util.inspect(req));
    //console.log(team);


    if(req.query.team){

		let team = req.query.team;
		console.log(team);
		let spiele = getSpieleVonTeam(team);
	        
		res.send(spiele);
	} else {
		res.sendFile('pages/index.html' , { root : __dirname});
	}
});

app.route('/update').get((req,res) => {
	console.log("get: updateSpielplan");
	updateSpielplan();
	res.send("updated spielplan");
});

app.route('/teams').get((req,res) => {
	console.log("get: teams");
	res.send(teams);
});

app.route('/spielplan').get((req, res) => {
	console.log("get: spielplan");
	res.send(spielplan);
});

app.route('/weekend').get((req, res) => {
	console.log("get: weekend");
	res.send(getWochenProgramm());
});




function updateSpielplan(){
	axios.get("https://nuliga.bhv-online.de/clubspage.html?seasonID=22&addressId=60272&seasonIDnum=19%2F20")
	.then(function(response){
		//console.log(util.inspect(response));
		let tree = HTMLParser.parse(response.data);
		//console.log(tree.firstChild.structure);

		let table = tree.querySelector('.meetings')
		  //console.log(table);

		// date as key:
		let date;

		table.childNodes.forEach(node => {
	  	//console.log(node.rawText);
		  	let line = node.structuredText;
		  	//let line = node.text;
		  	//let line = node.rawText;

		  	let row = line.split("\n");
		  	// console.log(row.length);
		  	//console.log(row);

		  	// neues Datum:
		  	if(row.length == 8){
		  		date = row[0];
		  		spielplan[date] = [];
		  		// delete date element in row
		  		row.shift();
		  	}

		  	// V aus Uhrzeit entfernen
		  	if(row[0].indexOf("V") >= 0){
		  		row[0] = row[0].slice(0, row[0].indexOf("V")).trim();
		  	}

		  	if(row[0].trim() != "00:00"){
			  	spielplan[date].push(row);
			}
		});
		console.log("spielplan loaded");
		//console.log(spielplan);
		getAllTeams();

		console.log("lastUpdate: " + new Date());


		//console.log(util.inspect(spielplan));
	})
	.catch(function(error){
		console.log("failed loading spielplan");
		console.log(error);
	});
}

function getAllTeams(){
	for(let date in spielplan){
		//console.log(date);

		spielplan[date].forEach(game =>{
			//console.log(game[3]);
			if(teams.includes(game[3]) == false){
				teams.push(game[3]);
			}
		});
	}
	console.log(teams);
}

function getSpieleFromNow(){
	let data = {};

	Object.keys(spielplan).forEach(function(key) {
		let momentDate = moment(key.slice(3), 'DD-MM-YYYY');
		let jsDate = momentDate.toDate();


		var d = new Date();
		d.setDate(d.getDate() - 1);
		//d.setFullYear(2020, 9, 9);

		if(jsDate >= d){
			data[key] = spielplan[key];
		}
	});

	return data;
}

function getSpieleVonTeam(name){
	let data = {};
	let spielplanFromNow = getSpieleFromNow();

	Object.keys(spielplanFromNow).forEach(function(key) {

		// check date key
		//console.log("Date: " + key);

		spielplanFromNow[key].forEach(row => {
				//console.log(row);
				//console.log(row[3]);

				// check team:
				if(row[3] == name){
					console.log(row[0]);

					data[key] = row;
				}
		});
	});
	return data;
}

function getWochenProgramm(){
	let data = []

	let spiele = getSpieleFromNow();

	Object.keys(spiele).forEach(function(key) {
		let momentDate = moment(key.slice(3), 'DD-MM-YYYY');
		let jsDate = momentDate.toDate();

		var d = new Date();
		d.setDate(d.getDate() - 1);
		//d.setFullYear(2020, 9, 9);

		console.log("last day:");
		console.log(d);

		let diff = jsDate - d;
		//console.log("jsDate - new Date()");
		//console.log(diff);

		if(diff > 0 && diff < (7- d.getDay()) * 24 * 60 * 60 * 1000){
			//console.log("in");
			let dayObject = {};
			dayObject[key] = spielplan[key];
			data.push(dayObject);
		}
	});

	console.log(data);

	return data;
}
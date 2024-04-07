import fetch from 'node-fetch';
import fs from 'fs';
import csv from 'fast-csv';

const scheduleurl = (startDate, endDate) => "https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate="+startDate+"&endDate="+endDate;
const gameurl = (gamepk) => "https://statsapi.mlb.com/api/v1.1/game/"+gamepk+"/feed/live";
const formatDate = (date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

//set up the csv stream for writing data to file//
const ws = fs.createWriteStream('./data.csv');
const stream = csv.format();
stream.pipe(ws);

//make a header row for csv//
stream.write(['date', 'teamAbbrv', 'pitcher_name', 'throws', 'win', 'loss', 'tie', 'finished5']);
//these lines determine which dates to scrape//
const today = new Date();
const yesterday = new Date(today.setDate(today.getDate() - 1));
const date = formatDate(yesterday);
const url = scheduleurl (`2024-3-28`, date)

//fetch the gamepk data from the given dates//
  fetch(url)
    .then(res => res.json())
    .then(json => setGamepks(json) )
    .catch(err => console.error(err));

//loop through each date to extract the game data//
function setGamepks(data) {
  const gpks = [];
  for (let d = 0; d < data.dates.length; d++) {
    const total = data.dates[d].games.length;
    const games = data.dates[d].games;
    for(let g = 0; g < total; g++) {
      gpks.push(games[g].gamePk);
    }
  }
  
  //removes duplicate gamepks//
  const gamepks = gpks.unique();
  
  next(gamepks);
}

//go through each gamepk, fetch data from the internet, send to the scrape function//
function next(gamepks) {
  for (let game = 0; game < gamepks.length; game++) {

    const gamepk = gamepks[game];
    const url = gameurl(gamepk);
    
    fetch(url)
      .then(res => res.json())
      .then(json => scrape(json) )
      .catch(err => console.error(err));
  }
}

function scrape(data) {
  //temporarily save chunks of data as "output" that will be written to file//
  let output = [];
  
  //check to see if the game is a completed regular season game, if not skip the game//
  const game_status = data.gameData.status.abstractGameState;
  const game_type = data.gameData.game.type;
  if (game_status !== "Final" && game_type === "R") { return }
  
  
  const gamepk = data.gameData.game.pk;
    let topFirst = data.liveData.plays.playsByInning[0].top[0];
    let bottomFirst = data.liveData.plays.playsByInning[0].bottom[0];
    let topFifth = data.liveData.plays.playsByInning[4].top[Object.keys(data.liveData.plays.playsByInning[4].top).length - 1]
    let bottomFifth = data.liveData.plays.playsByInning[4].bottom[Object.keys(data.liveData.plays.playsByInning[4].bottom).length - 1]
    
    const play = {}
    const ab = data.liveData.plays.allPlays[topFirst];
    // TOP FIRST: 
    play.gamepk = gamepk;
    play.date = data.gameData.datetime.officialDate;
    play.pitcher = ab.matchup.pitcher.id;
    play.pitcher_name = ab.matchup.pitcher.fullName;
    play.throws = ab.matchup.pitchHand.code;
    play.events = ab.result.event;
    play.des = ab.result.description;
    play.inning = ab.about.inning;
    play.topbot = ab.about.halfInning;
    const teamAbbrv = play.topbot == 'top' ? data.gameData.teams.home.abbreviation : data.gameData.teams.away.abbreviation;
    play.teamAbbrv = teamAbbrv;
    play.season = data.gameData.game.season;
    play.home_Score = ab.result.homeScore;
    play.away_Score = ab.result.awayScore;
    
    // // BOTTOM FIRST
    const playTwo = {}
    const zb = data.liveData.plays.allPlays[bottomFirst];
    // TOP FIRST: 
    playTwo.gamepk = gamepk;
    playTwo.date = data.gameData.datetime.officialDate;
    playTwo.pitcher = zb.matchup.pitcher.id;
    playTwo.pitcher_name = zb.matchup.pitcher.fullName;
    playTwo.throws = zb.matchup.pitchHand.code;
    playTwo.events = zb.result.event;
    playTwo.des = zb.result.description;
    playTwo.inning = zb.about.inning;
    playTwo.topbot = zb.about.halfInning;
    const zbteamAbbrv = playTwo.topbot == 'top' ? data.gameData.teams.home.abbreviation : data.gameData.teams.away.abbreviation;
    playTwo.teamAbbrv = zbteamAbbrv;
    playTwo.season = data.gameData.game.season;
    playTwo.home_Score = zb.result.homeScore;
    playTwo.away_Score = zb.result.awayScore;

    // Bottom FIFTH
    const playFour = {}
    const tb = data.liveData.plays.allPlays[bottomFifth];
    // TOP FIRST: 
    playFour.gamepk = gamepk;
    playFour.date = data.gameData.datetime.officialDate;
    playFour.pitcher = tb.matchup.pitcher.id;
    playFour.pitcher_name = tb.matchup.pitcher.fullName;
    playFour.throws = tb.matchup.pitchHand.code;
    playFour.events = tb.result.event;
    playFour.des = tb.result.description;
    playFour.inning = tb.about.inning;
    playFour.topbot = tb.about.halfInning;
    const tbteamAbbrv = playFour.topbot == 'top' ? data.gameData.teams.home.abbreviation : data.gameData.teams.away.abbreviation;
    playFour.teamAbbrv = tbteamAbbrv;
    if(playFour.pitcher_name == playTwo.pitcher_name){
        const finishedFive = 1
        playFour.finished5 = finishedFive;
        playFour.pitcher_name = tb.matchup.pitcher.fullName;
    } else {
        const finishedFive = 0
        playFour.finished5 = finishedFive;
        playFour.pitcher_name = zb.matchup.pitcher.fullName;
    }
    playFour.season = data.gameData.game.season;
    playFour.home_Score = tb.result.homeScore;
    playFour.away_Score = tb.result.awayScore;

    // TOP FIFTH
    const playThree = {}
    
    const fb = data.liveData.plays.allPlays[topFifth];
    // TOP FIRST: 
    playThree.gamepk = gamepk;
    playThree.date = data.gameData.datetime.officialDate;
    playThree.pitcher = fb.matchup.pitcher.id;
    playThree.pitcher_name = fb.matchup.pitcher.fullName;
    playThree.throws = fb.matchup.pitchHand.code;
    playThree.events = fb.result.event;
    playThree.des = fb.result.description;
    playThree.inning = fb.about.inning;
    playThree.topbot = fb.about.halfInning;
    const fbteamAbbrv = playThree.topbot == 'top' ? data.gameData.teams.home.abbreviation : data.gameData.teams.away.abbreviation;
    playThree.teamAbbrv = fbteamAbbrv;
    if(playThree.pitcher_name == play.pitcher_name){
        const finishedFive = 1
        playThree.finished5 = finishedFive;
        playThree.pitcher_name = fb.matchup.pitcher.fullName;
    } else {
        const finishedFive = 0
        playThree.finished5 = finishedFive;
        playThree.pitcher_name = ab.matchup.pitcher.fullName;
    }
    if(playFour.home_Score > playFour.away_Score){
        const won = 1;
        const loss = 0;
        const tie = 0;
        playThree.win = won;
        playThree.loss = loss;
        playThree.tie = tie;
    } else if(playFour.home_Score < playFour.away_Score){
        const loss = 1;
        const won = 0;
        const tie = 0;
        playThree.loss = loss;
        playThree.win = won;
        playThree.tie = tie;
    } else{
        const loss = 0;
        const won = 0;
        const tie = 1;
        playThree.loss = loss;
        playThree.win = won;
        playThree.tie = tie;
    }
    if(playFour.home_Score < playFour.away_Score){
        const won = 1;
        const loss = 0;
        const tie = 0;
        playFour.win = won;
        playFour.loss = loss;
        playFour.tie = tie;
    } else if(playFour.home_Score > playFour.away_Score){
        const loss = 1;
        const won = 0;
        const tie = 0;
        playFour.loss = loss;
        playFour.win = won;
        playFour.tie = tie;
    } else{
        const loss = 0;
        const won = 0;
        const tie = 1;
        playFour.loss = loss;
        playFour.win = won;
        playFour.tie = tie;
    }
    playThree.season = data.gameData.game.season;
    playThree.home_Score = fb.result.homeScore;
    playThree.away_Score = fb.result.awayScore;

    //push data to the output array//
    output.push( playThree, playFour );

  
  //send output to be written to file//
  writeToFile(output);
}


//takes an array and writes each line to csv file//
function writeToFile(data) {
  data.forEach( (row) => stream.write(row) );
}

//added functionality to array function to allow easy deletion of duplicates//
Array.prototype.contains = function(v) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === v) return true;
  }
  return false;
};

Array.prototype.unique = function() {
  var arr = [];
  for (var i = 0; i < this.length; i++) {
    if (!arr.contains(this[i])) {
      arr.push(this[i]);
    }
  }
  return arr;
}
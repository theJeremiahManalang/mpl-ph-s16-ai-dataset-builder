// --- 1. Get Input Data ---
// Assuming $input.all()[0] contains all the extracted HTML data for a single match (1 link)
const inputItem = $input.all()[0].json;

const team1Values = inputItem.Team1_Value; 
const team2Values = inputItem.Team2_Value; 
const loseTeamArray = inputItem.Lose_Team || []; 
const winTeamName = inputItem.Win_Team; // Assumed winner of Game 1 (single string)
const urlContent = inputItem.Date_Value?.content || ''; 

// --- 2. Determine Dynamic Team Names ---

// 1. Collect all known team names from the input
let teamNames = [];
if (winTeamName) {
    teamNames.push(winTeamName);
}
// 2. Add all team names from the Lose_Team array
teamNames = teamNames.concat(loseTeamArray);

// 3. Filter to get the two unique team names
const UNIQUE_TEAM_NAMES = teamNames.filter(name => name).filter((v, i, a) => a.indexOf(v) === i);

// Assign them dynamically. PRIMARY_TEAM will be the team associated with team1Values.
const PRIMARY_TEAM = UNIQUE_TEAM_NAMES[0] || 'Team_A';
const SECONDARY_TEAM = UNIQUE_TEAM_NAMES[1] || 'Team_B';

// --- 3. Extract and Format Date ---
const dateMatch = urlContent.match(/(\d{8})$/); 
let formattedDate = 'Date Not Found';

if (dateMatch && dateMatch[1]) {
    const dateString = dateMatch[1];
    formattedDate = `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
}

// --- 4. Filter Arrays for Games ---
const GAME_LENGTH = 12; // 12 stats per game

// Game 1: Index 0 to 11
const game1_team1 = team1Values ? team1Values.slice(0, GAME_LENGTH) : [];
const game1_team2 = team2Values ? team2Values.slice(0, GAME_LENGTH) : [];

// Game 2: Index 12 to 23
const game2_team1 = team1Values ? team1Values.slice(GAME_LENGTH, GAME_LENGTH * 2) : [];
const game2_team2 = team2Values ? team2Values.slice(GAME_LENGTH, GAME_LENGTH * 2) : [];

// Game 3: Index 24 to 35
const game3_team1 = team1Values ? team1Values.slice(GAME_LENGTH * 2, GAME_LENGTH * 3) : [];
const game3_team2 = team2Values ? team2Values.slice(GAME_LENGTH * 2, GAME_LENGTH * 3) : [];


// --- 5. Define Stat Categories ---
const STAT_NAMES = [
    "Total Kills", "Total Assists", "Total Deaths", "Total Gold", 
    "Gold / Min", "Total Damage", "Damage / Min", "Red Buff", 
    "Blue Buff", "Lord Kill", "Tortoise Kill", "Tower Destroy" 
];

// --- New Tracking Variables ---
let team1MatchWins = 0; 
let team2MatchWins = 0; 
// Use dynamic keys for the final match result
let finalMatchResult = { [PRIMARY_TEAM]: '', [SECONDARY_TEAM]: '' };


// --- 6. Helper Functions ---
const outputItems = [];

/**
 * Checks win counters to determine the overall match result (first to 2 wins).
 */
function setMatchResult(currentTeam1Wins, currentTeam2Wins) {
    if (currentTeam1Wins === 2) {
        finalMatchResult = { [PRIMARY_TEAM]: 'W', [SECONDARY_TEAM]: 'L' };
    } else if (currentTeam2Wins === 2) {
        finalMatchResult = { [PRIMARY_TEAM]: 'L', [SECONDARY_TEAM]: 'W' };
    }
}

/**
 * Transforms an array of 12 stat values into a single wide object (one row).
 * @param {Array} teamValues - Array of 12 stat values.
 * @param {boolean} isPrimaryTeam - True if data belongs to the team mapped to team1Values.
 * @param {number} gameNumber - The current game number (1, 2, or 3).
 */
function transformGameData(teamValues, isPrimaryTeam, gameNumber) {
    if (teamValues.length === 0) {
        return; 
    }

    const teamName = isPrimaryTeam ? PRIMARY_TEAM : SECONDARY_TEAM;
    const opponentName = isPrimaryTeam ? SECONDARY_TEAM : PRIMARY_TEAM;
    
    // Determine Win/Loss using the Lose_Team array
    const losingTeam = loseTeamArray[gameNumber - 1];
    const winLoss = (teamName === losingTeam) ? 'L' : 'W';
    
    // --- Win Counting Logic ---
    let currentTeam1Wins = team1MatchWins;
    let currentTeam2Wins = team2MatchWins;
    
    if (winLoss === 'W') {
        if (isPrimaryTeam) {
            currentTeam1Wins++;
        } else {
            currentTeam2Wins++;
        }
    }
    
    // Check for match end condition (first to 2 wins) and update the global tracker
    setMatchResult(currentTeam1Wins, currentTeam2Wins);
    
    // Update global win counters for the next game check
    team1MatchWins = currentTeam1Wins;
    team2MatchWins = currentTeam2Wins;

    // --- Object Construction ---
    let newObject = {};
    
    newObject["Match_Date"] = formattedDate;
    newObject["Game_Number"] = gameNumber;
    newObject["Team_Name"] = teamName;
    newObject["Opponent_Name"] = opponentName;
    newObject["Win_Lose"] = winLoss; // Individual game W/L
    
    // --- Conditional Match Result Insertion (FIXED LOGIC) ---
    // The match result is inserted IF:
    // 1. The match has been decided (finalMatchResult is set).
    // 2. The current game is the final game played (gameNumber equals the total wins).
    const totalGamesPlayed = team1MatchWins + team2MatchWins;
    const matchDecided = finalMatchResult[PRIMARY_TEAM] !== '';
    
    if (matchDecided && (gameNumber === totalGamesPlayed)) {
        newObject["Match Win/Lose"] = finalMatchResult[teamName]; 
    } else {
        newObject["Match Win/Lose"] = ''; // Keep it blank for non-deciding games
    }

    // Loop through the values and create STAT NAME columns
    for (let i = 0; i < teamValues.length; i++) {
        const statName = STAT_NAMES[i];
        const statValue = teamValues[i];
        
        newObject[statName] = statValue;
    }
    
    outputItems.push({ json: newObject });
}


// --- 7. Execute Transformation for All Games/Teams ---

// Game 1
transformGameData(game1_team1, true, 1); // Team 1 (PRIMARY_TEAM)
transformGameData(game1_team2, false, 1); // Team 2 (SECONDARY_TEAM)

// Game 2
// Only run if the match wasn't decided in Game 1
if (finalMatchResult[PRIMARY_TEAM] === '') {
    transformGameData(game2_team1, true, 2);
    transformGameData(game2_team2, false, 2);
}

// Game 3
// Only run if the match wasn't decided in Game 2
// Note: team1MatchWins + team2MatchWins === 2 check is redundant here because
// the IF condition above prevents this from running if the match was 2-0 after Game 2.
if (finalMatchResult[PRIMARY_TEAM] === '') {
    transformGameData(game3_team1, true, 3);
    transformGameData(game3_team2, false, 3);
}


// --- 8. Output Final Structured Data ---
return outputItems;

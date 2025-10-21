const inputItems = $input.all();
// Assuming all necessary data arrays are found under the first input item
const inputData = inputItems[0].json;

// Input arrays are assumed to be flat lists: [T1, T2, T3, T4, ...]
const teamsInput = inputData.Teams || [];
const matchWinInput = inputData.Match_Win || [];
const matchWinLoseInput = inputData.MatchWinLose || [];
const matchDateInput = inputData.Match_Date || []; // This input array is named Match_Date

const outputItems = [];

// --- Helper function to convert the class string to 1 (win) or 0 (loss) ---
function statusToWin(statusString) {
    // We check for the unique class that signifies a win
    if (typeof statusString === 'string' && statusString.includes('forest-green-text')) {
        return 1;
    }
    return 0;
}

// --- Helper function to extract and format the date to YYYY-MM-DD ---
function formatMatchDate(dateTimeString) {
    if (typeof dateTimeString !== 'string' || !dateTimeString) {
        return '';
    }
    
    // 1. Extract the date part (e.g., "August 22, 2025") by splitting on the hyphen
    const datePart = dateTimeString.split(' - ')[0].trim();
    
    // 2. Try to parse the date part using the Date object
    const date = new Date(datePart);
    
    // 3. Check if parsing was successful (Date.parse returns NaN for invalid dates)
    if (isNaN(date.getTime())) {
        console.error(`Could not parse date: ${datePart}`);
        return datePart; // Return original date part if formatting fails
    }
    
    // 4. Format to YYYY-MM-DD
    const year = date.getFullYear();
    // Month is 0-indexed, so add 1 and pad with '0'
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    // Day of the month, pad with '0'
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Replaces specified team abbreviations (FLCP, ONPH, TWPH) with their target names.
 * @param {string} teamName - The original team name.
 * @returns {string} The corrected team name.
 */
function normalizeTeamName(teamName) {
    if (teamName === 'FLCP') {
        return 'FLCN';
    }
    if (teamName === 'ONPH') {
        return 'ONIC';
    }
    if (teamName === 'TWPH') {
        return 'TWIS';
    }
    return teamName;
}


// 1. Index Pre-Calculation (Determine W/L data boundaries for each match)
const totalElements = Math.min(teamsInput.length, matchWinInput.length);
const totalMatches = Math.floor(totalElements / 2);

let currentMatchWinLoseIndex = 0;
// Stores the start index in MatchWinLose for each match
let matchWinLoseIndices = []; 

for (let i = 0; i < totalMatches; i++) {
    const scoreIndex = i * 2;
    const team1Score = parseInt(matchWinInput[scoreIndex] || '0', 10);
    const team2Score = parseInt(matchWinInput[scoreIndex + 1] || '0', 10);
    const totalGames = team1Score + team2Score;

    // Each game uses 2 elements (Team 1 Status, Team 2 Status)
    const elementsUsed = totalGames * 2;

    matchWinLoseIndices.push(currentMatchWinLoseIndex);
    currentMatchWinLoseIndex += elementsUsed;
}


// 2. Match Iteration and Pivoting Transformation
for (let i = 0; i < totalMatches; i++) {
    const teamsIndex = i * 2;

    // --- Data Extraction ---
    // Apply normalization immediately
    const team1Name = normalizeTeamName(teamsInput[teamsIndex] || '');
    const team2Name = normalizeTeamName(teamsInput[teamsIndex + 1] || '');
    const team1OverallScoreStr = matchWinInput[teamsIndex] || '0';
    const team2OverallScoreStr = matchWinInput[teamsIndex + 1] || '0';
    
    // CRITICAL CHANGE: Use 'i' (the match index) to get one date per match
    const rawDate = matchDateInput[i] || ''; 
    // Call the new formatting function
    const matchDate = formatMatchDate(rawDate); 

    const team1OverallScoreInt = parseInt(team1OverallScoreStr, 10);
    const team2OverallScoreInt = parseInt(team2OverallScoreStr, 10);
    const scoreSum = team1OverallScoreInt + team2OverallScoreInt;


    // 3. Game Iteration: Only proceed if 2 or 3 games were played
    if (scoreSum === 2 || scoreSum === 3) {
        const gamesToProcess = scoreSum;
        const startWLIndex = matchWinLoseIndices[i];

        // Process the required number of games (2 or 3)
        for (let game = 0; game < gamesToProcess; game++) {
            const gameNumber = game + 1;
            const wlIndex = startWLIndex + (game * 2);

            // W/L status strings from the input
            const t1Status = matchWinLoseInput[wlIndex];
            const t2Status = matchWinLoseInput[wlIndex + 1];

            // Convert status to 1 (Win) or 0 (Loss)
            const t1Win = statusToWin(t1Status);
            const t2Win = statusToWin(t2Status);

            // Determine Win/Loss status strings for the output column
            const t1WinStatus = t1Win === 1 ? 'W' : 'L';
            const t2WinStatus = t2Win === 1 ? 'W' : 'L';

            // --- Pivot: Create two output rows for this single game ---

            // 4. Output Row 1 (Team 1's perspective)
            outputItems.push({
                json: {
                    Match_Date: matchDate, // YYYY-MM-DD format
                    Game_Number: gameNumber,
                    Team_Name: team1Name,
                    Opponent_Name: team2Name,
                    Win_Status: t1WinStatus,
                }
            });

            // 5. Output Row 2 (Team 2's perspective)
            outputItems.push({
                json: {
                    Match_Date: matchDate, // YYYY-MM-DD format
                    Game_Number: gameNumber,
                    Team_Name: team2Name,
                    Opponent_Name: team1Name,
                    Win_Status: t2WinStatus,
                }
            });
        }
    }
}

return outputItems;

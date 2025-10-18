// --- Code in JavaScript1 (The URL Fixer) ---

const inputItems = $input.all();
let outputItems = []; // Use 'let' so we can reassign later
const totalItems = inputItems.length; // Expected: 128

// --- 2. Process ALL Items (0 to 127) and filter out unwanted links ---
for (let i = 0; i < totalItems; i++) {
    const item = inputItems[i];
    
    // Skip the range from index 56 up to and including index 63
    const skipRange56To63 = (i >= 56 && i <= 63);
    
    // Skip the range from index 120 through the end (127)
    const skipRange120ToEnd = (i >= 120);

    // Check if the current item index matches any exclusion criteria
    if (skipRange56To63 || skipRange120ToEnd) {
        continue;
    }

    const url = item.json.Links; 

    if (url && typeof url === 'string') {
        let fixedUrl = url;

        if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
            fixedUrl = 'https://' + fixedUrl.replace(/^\/\//, '');
        }

        outputItems.push({
            json: {
                // The fixed URL is output as 'fullUrl'
                fullUrl: fixedUrl
            }
        });
    }
}


// To be safe, let's find the correct slice index:
let sliceIndex = 0;
for (let i = 0; i < 62; i++) { // Count how many items from input 0-61 made it to the output
    if (i < 56) { // Items 0-55 were NOT skipped by the internal filter
        sliceIndex++;
    }
}

// Slice the array to keep only the items starting from the one corresponding to input index 64.
// If 56 items were output before the 56-63 skip, we slice off 56 items.
// Assuming your original code had 56 processed items before index 56.
const startIndex = 56;
outputItems = outputItems.slice(startIndex);


// THIS IS THE CRUCIAL LINE: It returns the new, shorter array
return outputItems;

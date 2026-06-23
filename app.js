// Prolog Detective: The Castle Mystery
// Frontend and Tau Prolog Glue Code

// 1. Data Definitions
const suspects = {
    clara: { name: "Lady Clara", shoe: 6, hair: "blonde", fp: "whorl", color: "#f2a6ff" },
    mustard: { name: "Colonel Mustard", shoe: 11, hair: "grey", fp: "loop", color: "#ffd56b" },
    plum: { name: "Professor Plum", shoe: 9, hair: "brown", fp: "arch", color: "#a5a6ff" },
    scarlet: { name: "Miss Scarlet", shoe: 7, hair: "red", fp: "whorl", color: "#ff8b8b" },
    green: { name: "Mr. Green", shoe: 10, hair: "black", fp: "loop", color: "#8bff9d" }
};

const rooms = {
    hall: { name: "Grand Hall", desc: "The grand foyer of the castle. The fireplace is cold, and footprints lead in several directions." },
    library: { name: "Library", desc: "Smells of old paper and mahogany. Floor-to-ceiling bookshelves line the walls." },
    billiard: { name: "Billiard Room", desc: "A green-felt table sits in the center. Cue racks are mounted on the wall." },
    kitchen: { name: "Kitchen", desc: "Copper pans hang from the ceiling. A chopping block sits near the pantry." },
    conservatory: { name: "Conservatory", desc: "Glass walls show the starry night. Exotic plants cast long shadows." }
};

const weapons = {
    revolver: { name: "Revolver", wound: "bullet" },
    rope: { name: "Rope", wound: "marks" },
    knife: { name: "Knife", wound: "cuts" },
    pipe: { name: "Lead Pipe", wound: "blunt" },
    poison: { name: "Poison", wound: "residue" }
};

const clueTypesDisplay = {
    footprint: "Muddy Footprint",
    hair: "Strand of Hair",
    fingerprint: "Dusty Fingerprint"
};

// 2. Game State Variables
let session = null;
let currentRoom = 'hall';
let gameSolution = { culprit: '', room: '', weapon: '' };
let characterLocations = {}; // Person -> Room
let roomWeapons = {}; // Room -> Weapon
let roomClues = {}; // Room -> Clue
let suspectStatements = {}; // Person -> Statement object
let exploredRooms = new Set();
let searchedRooms = new Set();
let interviewedSuspects = new Set();
let discoveredClues = [];
let discoveredStatements = [];
let currentTab = 'clues';

// 3. Tau Prolog Helpers
function termToVal(term) {
    if (!term) return null;
    if (term.type === "atom") {
        return term.id;
    } else if (term.type === "number") {
        return term.value;
    }
    return term.toString();
}

function logToConsole(text, type = 'system') {
    const consoleBody = document.getElementById('prolog-console-output');
    if (!consoleBody) return;
    
    const line = document.createElement('span');
    line.className = `${type}-line`;
    
    if (type === 'query') {
        line.innerText = `?- ${text}`;
    } else if (type === 'result') {
        line.innerText = text;
    } else {
        line.innerText = `%% ${text}`;
    }
    
    consoleBody.appendChild(line);
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

function updateConsoleStatus(status, text) {
    const dot = document.querySelector('#console-status .dot');
    const label = document.querySelector('#console-status').childNodes[1];
    
    if (status === 'ready') {
        dot.className = 'dot green';
        label.nodeValue = ' Ready';
    } else if (status === 'busy') {
        dot.className = 'dot yellow';
        label.nodeValue = ' Processing...';
    }
}

// Execute an assertion/retraction query
function executeAssert(queryStr) {
    session.query(queryStr, {
        success: function() {
            session.answer(function(answer) {
                // Done
            });
        },
        error: function(err) {
            console.error("Assert Error:", err, queryStr);
        }
    });
}

// 4. Shuffle Helper
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 5. Game Initialization
function initProlog() {
    logToConsole("Initializing Tau Prolog Engine...");
    session = pl.create(10000);
    
    fetch('game.pl')
        .then(response => {
            if (!response.ok) {
                throw new Error("Could not fetch game.pl. Make sure server is running.");
            }
            return response.text();
        })
        .then(code => {
            session.consult(code, {
                success: function() {
                    logToConsole("Loaded game.pl database successfully.", "system");
                    restartMystery();
                },
                error: function(err) {
                    logToConsole("Compilation failed: " + err, "system");
                    console.error("Consult error:", err);
                }
            });
        })
        .catch(err => {
            logToConsole("Error loading Prolog code: " + err.message, "system");
            console.error(err);
        });
}

function restartMystery() {
    logToConsole("Clearing old crime scene logs...", "system");
    
    // Retract all facts from Prolog
    executeAssert("retractall(clue_found(_, _, _)).");
    executeAssert("retractall(statement_made(_, _, _, _)).");
    executeAssert("retractall(alibi_claimed(_, _, _)).");
    executeAssert("retractall(crime(_, _, _)).");
    
    // Reset UI and State
    currentRoom = 'hall';
    exploredRooms = new Set(['hall']);
    searchedRooms = new Set();
    interviewedSuspects = new Set();
    discoveredClues = [];
    discoveredStatements = [];
    
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('active', 'searched');
        const rId = card.id.replace('room-', '');
        document.getElementById(`status-${rId}`).innerText = "Unexplored";
    });
    
    document.getElementById('room-hall').classList.add('active');
    document.getElementById('status-hall').innerText = "Investigating";
    
    document.getElementById('action-feedback').innerHTML = '<p class="placeholder-text">Select an action above to start investigating this room.</p>';
    document.getElementById('action-feedback').className = 'feedback-area';
    
    // Generate Solution
    const suspectIds = Object.keys(suspects);
    const roomIds = Object.keys(rooms);
    const weaponIds = Object.keys(weapons);
    
    shuffle(suspectIds);
    shuffle(roomIds);
    shuffle(weaponIds);
    
    gameSolution.culprit = suspectIds[0];
    gameSolution.room = roomIds[0];
    gameSolution.weapon = weaponIds[0];
    
    console.log("GAME SOLUTION GENERATED:", gameSolution);
    
    // Set 10 PM locations
    characterLocations = {};
    for (let i = 0; i < suspectIds.length; i++) {
        characterLocations[suspectIds[i]] = roomIds[i];
    }
    
    // Distribute weapons to rooms
    roomWeapons = {};
    const shuffledRooms = shuffle([...Object.keys(rooms)]);
    const shuffledWeapons = shuffle([...Object.keys(weapons)]);
    for (let i = 0; i < 5; i++) {
        roomWeapons[shuffledRooms[i]] = shuffledWeapons[i];
    }
    
    // Distribute clues to rooms
    // In each room, there is a physical clue pointing to the person who was there at 10 PM
    roomClues = {};
    const clueTypes = ['footprint', 'hair', 'fingerprint'];
    
    Object.keys(rooms).forEach(rId => {
        // Find who was in this room at 10 PM
        const personInRoom = Object.keys(characterLocations).find(pId => characterLocations[pId] === rId);
        const personInfo = suspects[personInRoom];
        
        // Randomly pick clue type
        const cType = clueTypes[Math.floor(Math.random() * clueTypes.length)];
        let cDetail = "";
        let desc = "";
        
        if (cType === 'footprint') {
            cDetail = personInfo.shoe;
            desc = `muddy footprint of size ${cDetail}`;
        } else if (cType === 'hair') {
            cDetail = personInfo.hair;
            desc = `strand of ${cDetail} hair`;
        } else {
            cDetail = personInfo.fp;
            desc = `dusty ${cDetail} fingerprint`;
        }
        
        roomClues[rId] = { type: cType, detail: cDetail, text: desc };
    });
    
    // Generate suspect statements
    suspectStatements = {};
    Object.keys(suspects).forEach(pId => {
        const personInfo = suspects[pId];
        const isKiller = (pId === gameSolution.culprit);
        
        if (!isKiller) {
            // Innocent telling the truth
            const actualRoom = characterLocations[pId];
            const actualRoomName = rooms[actualRoom].name;
            
            // Witness statement: mention another innocent character
            const otherInnocents = Object.keys(suspects).filter(id => id !== gameSolution.culprit && id !== pId);
            const randomWitness = otherInnocents[Math.floor(Math.random() * otherInnocents.length)];
            const witnessRoomName = rooms[characterLocations[randomWitness]].name;
            
            suspectStatements[pId] = {
                alibiRoom: actualRoom,
                quote: `I was in the ${actualRoomName} at 10:00 PM. I'm completely innocent!`,
                witness: {
                    person: randomWitness,
                    room: characterLocations[randomWitness],
                    quote: `I'm also certain that ${suspects[randomWitness].name} was in the ${witnessRoomName} around that time.`
                }
            };
        } else {
            // Killer lying
            // Killer claims to be in a random room that is NOT the crime room
            const availableRooms = Object.keys(rooms).filter(r => r !== gameSolution.room);
            const claimedRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
            const claimedRoomName = rooms[claimedRoom].name;
            
            // Killer lies about seeing someone else to throw off suspicion
            const otherSuspects = Object.keys(suspects).filter(id => id !== pId);
            const randomSuspect = otherSuspects[Math.floor(Math.random() * otherSuspects.length)];
            // Lies that they were in some other room
            const lieRoom = Object.keys(rooms).filter(r => r !== characterLocations[randomSuspect])[0];
            
            suspectStatements[pId] = {
                alibiRoom: claimedRoom,
                quote: `I was resting in the ${claimedRoomName} at 10:00 PM. It was quiet.`,
                witness: {
                    person: randomSuspect,
                    room: lieRoom,
                    quote: `By the way, I think I saw ${suspects[randomSuspect].name} in the ${rooms[lieRoom].name} at that time.`
                }
            };
        }
    });
    
    // Assert the crime details (crime scene, crime time, and wound type matching murder weapon)
    const sceneWound = weapons[gameSolution.weapon].wound;
    executeAssert(`assertz(crime(${gameSolution.room}, 10, ${sceneWound})).`);
    logToConsole(`New case generated. Victim: Dr. Black, Room: ${rooms[gameSolution.room].name}.`, "system");
    
    updateUI();
    renderLists();
}

// 6. UI Updates
function updateUI() {
    // Current location display
    document.getElementById('current-location-text').innerText = rooms[currentRoom].name;
    document.getElementById('action-room-title').innerText = rooms[currentRoom].name;
    document.getElementById('action-room-desc').innerText = rooms[currentRoom].desc;
    
    // Suspects list in current room
    const suspectsList = document.getElementById('room-suspects-list');
    suspectsList.innerHTML = '';
    
    // Find suspects currently in this room (during investigation we assume they stay in their 10 PM locations)
    const suspectsInRoom = Object.keys(characterLocations).filter(pId => characterLocations[pId] === currentRoom);
    
    if (suspectsInRoom.length === 0) {
        suspectsList.innerHTML = '<span class="text-muted italic" style="font-size: 0.9rem;">No suspects in this room.</span>';
    } else {
        suspectsInRoom.forEach(pId => {
            const btn = document.createElement('button');
            btn.className = 'suspect-btn';
            btn.style.borderLeft = `3px solid ${suspects[pId].color}`;
            btn.innerHTML = `<i class="fa-solid fa-comment"></i> Talk to ${suspects[pId].name}`;
            btn.onclick = () => interviewSuspect(pId);
            suspectsList.appendChild(btn);
        });
    }
    
    // Search room button status
    const searchBtn = document.getElementById('btn-search-room');
    if (searchedRooms.has(currentRoom)) {
        searchBtn.disabled = true;
        searchBtn.style.opacity = 0.5;
        searchBtn.style.cursor = 'not-allowed';
        searchBtn.querySelector('span').innerText = "Room Searched";
    } else {
        searchBtn.disabled = false;
        searchBtn.style.opacity = 1;
        searchBtn.style.cursor = 'pointer';
        searchBtn.querySelector('span').innerText = "Search Room for Clues";
    }
}

function selectRoom(rId) {
    if (rId === currentRoom) return;
    
    // Update active room classes
    document.querySelectorAll('.room-card').forEach(card => card.classList.remove('active'));
    document.getElementById(`room-${rId}`).classList.add('active');
    
    // Update status displays
    exploredRooms.add(rId);
    document.querySelectorAll('.room-card').forEach(card => {
        const cardRoomId = card.id.replace('room-', '');
        if (cardRoomId === rId) {
            document.getElementById(`status-${cardRoomId}`).innerText = "Investigating";
        } else if (searchedRooms.has(cardRoomId)) {
            document.getElementById(`status-${cardRoomId}`).innerText = "Searched";
            card.classList.add('searched');
        } else if (exploredRooms.has(cardRoomId)) {
            document.getElementById(`status-${cardRoomId}`).innerText = "Explored";
        } else {
            document.getElementById(`status-${cardRoomId}`).innerText = "Unexplored";
        }
    });
    
    currentRoom = rId;
    updateUI();
    
    // Clear feedback area on movement
    document.getElementById('action-feedback').innerHTML = '<p class="placeholder-text">Select an action above to start investigating this room.</p>';
    document.getElementById('action-feedback').className = 'feedback-area';
}

function searchRoom() {
    if (searchedRooms.has(currentRoom)) return;
    
    searchedRooms.add(currentRoom);
    document.getElementById(`room-${currentRoom}`).classList.add('searched');
    
    // Get weapon and clue in this room
    const rWeapon = roomWeapons[currentRoom];
    const rClue = roomClues[currentRoom];
    
    // Assert clue to Prolog
    // clue_found(Type, RoomOrWeapon, Detail)
    executeAssert(`assertz(clue_found(${rClue.type}, ${currentRoom}, ${rClue.detail})).`);
    logToConsole(`assertz(clue_found(${rClue.type}, ${currentRoom}, ${rClue.detail})).`, "query");
    
    // Build discovered clue objects
    const clueObj = {
        room: rooms[currentRoom].name,
        type: clueTypesDisplay[rClue.type],
        text: `Found a ${rClue.text} in the ${rooms[currentRoom].name}.`,
        raw: `clue_found(${rClue.type}, ${currentRoom}, ${rClue.detail})`
    };
    discoveredClues.push(clueObj);
    
    // Also discover weapon in room
    const weaponObj = {
        room: rooms[currentRoom].name,
        type: "Weapon Discovered",
        text: `Found the ${weapons[rWeapon].name} discarded in the ${rooms[currentRoom].name}.`,
        raw: `weapon_discovered(${rWeapon}, ${currentRoom})`
    };
    discoveredClues.push(weaponObj);
    
    // Update Feedback area
    const feedback = document.getElementById('action-feedback');
    feedback.className = 'feedback-area success-find';
    feedback.innerHTML = `
        <div class="feedback-title"><i class="fa-solid fa-circle-check text-success"></i> Search Results:</div>
        <div class="feedback-body">
            <p><strong>Evidence:</strong> ${clueObj.text}</p>
            <p style="margin-top:0.4rem;"><strong>Item:</strong> ${weaponObj.text}</p>
            <p style="margin-top:0.6rem; font-size:0.75rem; color:var(--text-muted);">Prolog fact asserted: <code>${clueObj.raw}.</code></p>
        </div>
    `;
    
    updateUI();
    renderLists();
}

function interviewSuspect(pId) {
    if (interviewedSuspects.has(pId)) {
        // Just show statement again
        showSuspectDialogue(pId);
        return;
    }
    
    interviewedSuspects.add(pId);
    const stmt = suspectStatements[pId];
    
    // Assert facts into Prolog
    // alibi_claimed(Person, Room, Time)
    executeAssert(`assertz(alibi_claimed(${pId}, ${stmt.alibiRoom}, 10)).`);
    logToConsole(`assertz(alibi_claimed(${pId}, ${stmt.alibiRoom}, 10)).`, "query");
    
    // statement_made(Speaker, Subject, Room, Time)
    executeAssert(`assertz(statement_made(${pId}, ${stmt.witness.person}, ${stmt.witness.room}, 10)).`);
    logToConsole(`assertz(statement_made(${pId}, ${stmt.witness.person}, ${stmt.witness.room}, 10)).`, "query");
    
    // Add to notebook statements
    discoveredStatements.push({
        speaker: suspects[pId].name,
        color: suspects[pId].color,
        text: stmt.quote,
        witnessText: stmt.witness.quote,
        rawAlibi: `alibi_claimed(${pId}, ${stmt.alibiRoom}, 10)`,
        rawWitness: `statement_made(${pId}, ${stmt.witness.person}, ${stmt.witness.room}, 10)`
    });
    
    showSuspectDialogue(pId);
    renderLists();
}

function showSuspectDialogue(pId) {
    const stmt = suspectStatements[pId];
    const feedback = document.getElementById('action-feedback');
    feedback.className = 'feedback-area dialogue';
    feedback.innerHTML = `
        <div class="feedback-title" style="color:${suspects[pId].color}">
            <i class="fa-solid fa-user-tie"></i> ${suspects[pId].name}:
        </div>
        <div class="feedback-body">
            <p>"${stmt.quote}"</p>
            <p style="margin-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 0.5rem;">
                "${stmt.witness.quote}"
            </p>
            <p style="margin-top:0.6rem; font-size:0.75rem; color:var(--text-muted);">
                Prolog claims asserted: <code>alibi_claimed(${pId}, ${stmt.alibiRoom}, 10).</code> and <code>statement_made(${pId}, ${stmt.witness.person}, ${stmt.witness.room}, 10).</code>
            </p>
        </div>
    `;
}

function renderLists() {
    // Clues list render
    const cluesList = document.getElementById('discovered-clues-list');
    if (discoveredClues.length === 0) {
        cluesList.innerHTML = '<li class="empty-list-msg">No physical clues found yet. Go search some rooms!</li>';
    } else {
        cluesList.innerHTML = '';
        discoveredClues.forEach(c => {
            const li = document.createElement('li');
            li.className = 'clue-item';
            li.innerHTML = `
                <div class="clue-header">
                    <span class="clue-room">${c.room}</span>
                    <span>${c.type}</span>
                </div>
                <div class="clue-text">${c.text}</div>
            `;
            cluesList.appendChild(li);
        });
    }
    
    // Statements list render
    const stmtList = document.getElementById('discovered-statements-list');
    if (discoveredStatements.length === 0) {
        stmtList.innerHTML = '<li class="empty-list-msg">No statements recorded yet. Talk to suspects in different rooms!</li>';
    } else {
        stmtList.innerHTML = '';
        discoveredStatements.forEach(s => {
            const li = document.createElement('li');
            li.className = 'statement-item';
            li.style.borderLeftColor = s.color;
            li.innerHTML = `
                <div class="statement-header" style="color:${s.color}">${s.speaker}</div>
                <div class="statement-text">"${s.text}"</div>
                <div class="statement-text" style="margin-top:0.3rem; opacity:0.85;">"${s.witnessText}"</div>
            `;
            stmtList.appendChild(li);
        });
    }
}

// 7. Navigation Tab Switching
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Find the button and trigger active class
    const eventSrc = typeof event !== 'undefined' ? event.target : null;
    if (eventSrc && eventSrc.tagName === 'BUTTON') {
        eventSrc.classList.add('active');
    } else {
        // Find via matching tab-btn text or custom mapping
        const buttons = document.querySelectorAll('.tab-btn');
        if (tabId === 'clues') buttons[0].classList.add('active');
        if (tabId === 'statements') buttons[1].classList.add('active');
        if (tabId === 'deductor') buttons[2].classList.add('active');
    }
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// 8. Deductions & Prolog Solver Queries
function runDeductions() {
    updateConsoleStatus('busy');
    logToConsole("Running logic deduction queries...", "system");
    
    // Query 1: innocent(X, Reason)
    logToConsole("innocent(X, Reason).", "query");
    
    const innocentList = document.getElementById('proven-innocent-list');
    innocentList.innerHTML = '';
    const innocents = new Set();
    const innocentReasons = {};
    
    let queryActive = true;
    
    session.query("innocent(X, Reason).", {
        success: function() {
            var getInnocent = function() {
                session.answer(function(answer) {
                    if (pl.type.is_substitution(answer)) {
                        const xVal = termToVal(answer.links["X"]);
                        const reasonVal = termToVal(answer.links["Reason"]);
                        innocents.add(xVal);
                        innocentReasons[xVal] = reasonVal;
                        
                        logToConsole(`X = ${xVal}, Reason = '${reasonVal}' ;`, "result");
                        getInnocent();
                    } else {
                        // End of query 1. Run Query 2: contradiction(Msg)
                        runContradictions(innocents, innocentReasons);
                    }
                });
            };
            getInnocent();
        },
        error: function(err) {
            console.error(err);
            updateConsoleStatus('ready');
        }
    });
}

function runContradictions(innocents, innocentReasons) {
    logToConsole("contradiction(Msg).", "query");
    
    const contradictionsList = document.getElementById('contradictions-list');
    contradictionsList.innerHTML = '';
    const contradictions = [];
    
    session.query("contradiction(Msg).", {
        success: function() {
            var getContradiction = function() {
                session.answer(function(answer) {
                    if (pl.type.is_substitution(answer)) {
                        const msgVal = termToVal(answer.links["Msg"]);
                        contradictions.push(msgVal);
                        
                        logToConsole(`Msg = '${msgVal}' ;`, "result");
                        getContradiction();
                    } else {
                        // End of query 2. Run Query 3: guilty(X, Reason)
                        runGuilty(innocents, innocentReasons, contradictions);
                    }
                });
            };
            getContradiction();
        },
        error: function(err) {
            console.error(err);
            updateConsoleStatus('ready');
        }
    });
}

function runGuilty(innocents, innocentReasons, contradictions) {
    logToConsole("guilty(X, Reason).", "query");
    
    const guiltySuspects = {};
    
    session.query("guilty(X, Reason).", {
        success: function() {
            var getGuilty = function() {
                session.answer(function(answer) {
                    if (pl.type.is_substitution(answer)) {
                        const xVal = termToVal(answer.links["X"]);
                        const reasonVal = termToVal(answer.links["Reason"]);
                        guiltySuspects[xVal] = reasonVal;
                        
                        logToConsole(`X = ${xVal}, Reason = '${reasonVal}' ;`, "result");
                        getGuilty();
                    } else {
                        // End of all queries, render the output panels
                        updateConsoleStatus('ready');
                        renderDeductionResults(innocents, innocentReasons, contradictions, guiltySuspects);
                    }
                });
            };
            getGuilty();
        },
        error: function(err) {
            console.error(err);
            updateConsoleStatus('ready');
        }
    });
}

function renderDeductionResults(innocents, innocentReasons, contradictions, guiltySuspects) {
    // 1. Render Proven Innocent list
    const innocentList = document.getElementById('proven-innocent-list');
    if (innocents.size === 0) {
        innocentList.innerHTML = '<li class="empty-list-msg">No suspects proven innocent yet.</li>';
    } else {
        innocents.forEach(pId => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${suspects[pId].name}</strong>: ${innocentReasons[pId]}`;
            innocentList.appendChild(li);
        });
    }
    
    // 2. Render Contradictions list
    const contradictionsList = document.getElementById('contradictions-list');
    if (contradictions.length === 0) {
        contradictionsList.innerHTML = '<li class="empty-list-msg">No contradictions found. All statements seem consistent.</li>';
    } else {
        // Filter unique contradictions to avoid duplicate display
        const uniqueContradictions = [...new Set(contradictions)];
        uniqueContradictions.forEach(msg => {
            const li = document.createElement('li');
            li.style.color = 'var(--accent-red)';
            li.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
            contradictionsList.appendChild(li);
        });
    }
    
    // 3. Render Suspect Status cards
    const statusGrid = document.getElementById('suspects-status-grid');
    statusGrid.innerHTML = '';
    
    Object.keys(suspects).forEach(pId => {
        let tagClass = 'suspect';
        let tagName = 'SUSPECT';
        
        if (innocents.has(pId)) {
            tagClass = 'innocent';
            tagName = 'INNOCENT';
        } else if (guiltySuspects[pId]) {
            tagClass = 'guilty';
            tagName = 'LIES DETECTED';
        }
        
        const card = document.createElement('div');
        card.className = 'suspect-status-card';
        card.style.borderLeft = `4px solid ${suspects[pId].color}`;
        card.innerHTML = `
            <span class="suspect-name">${suspects[pId].name}</span>
            <span class="status-tag ${tagClass}">${tagName}</span>
        `;
        statusGrid.appendChild(card);
    });
}

// 9. Accusations
function submitAccusation(e) {
    e.preventDefault();
    
    const suspect = document.getElementById('accuse-suspect').value;
    const room = document.getElementById('accuse-room').value;
    const weapon = document.getElementById('accuse-weapon').value;
    
    closeModal('modal-accuse');
    
    const isCorrect = (suspect === gameSolution.culprit && room === gameSolution.room && weapon === gameSolution.weapon);
    
    const goIcon = document.getElementById('gameover-icon');
    const goTitle = document.getElementById('gameover-title');
    const goMsg = document.getElementById('gameover-msg');
    const goDetails = document.getElementById('gameover-details');
    
    if (isCorrect) {
        goIcon.className = 'fa-solid fa-circle-check text-success id-card-icon';
        goTitle.innerText = "Case Solved!";
        goMsg.innerText = "Outstanding work, Detective! You successfully pieced together the logical evidence and caught the killer.";
    } else {
        goIcon.className = 'fa-solid fa-circle-xmark text-danger id-card-icon';
        goTitle.innerText = "Incorrect Accusation";
        goMsg.innerText = "The details of your accusation do not match the facts. The real killer got away!";
    }
    
    goDetails.innerHTML = `
        <div><strong>The Killer:</strong> ${suspects[gameSolution.culprit].name} ${suspect === gameSolution.culprit ? '✅' : '❌ (You accused ' + suspects[suspect].name + ')'}</div>
        <div><strong>The Crime Scene:</strong> ${rooms[gameSolution.room].name} ${room === gameSolution.room ? '✅' : '❌ (You accused ' + rooms[room].name + ')'}</div>
        <div><strong>The Weapon:</strong> ${weapons[gameSolution.weapon].name} ${weapon === gameSolution.weapon ? '✅' : '❌ (You accused ' + weapons[weapon].name + ')'}</div>
        <p style="margin-top:0.8rem; font-size:0.8rem; opacity:0.8; font-style:italic;">
            "The killer, ${suspects[gameSolution.culprit].name}, hid the ${weapons[gameSolution.weapon].name} in the ${rooms[gameSolution.room].name} and claimed to be in the ${rooms[suspectStatements[gameSolution.culprit].alibiRoom].name}."
        </p>
    `;
    
    openModal('modal-gameover');
}

// 10. Modal Utilities
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 11. Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    document.getElementById('btn-restart').onclick = restartMystery;
    document.getElementById('btn-how-to').onclick = () => openModal('modal-help');
    document.getElementById('btn-accuse-main').onclick = () => openModal('modal-accuse');
    document.getElementById('btn-search-room').onclick = searchRoom;
    document.getElementById('btn-run-deductions').onclick = runDeductions;
    
    // Close modal on background click
    document.querySelectorAll('.modal').forEach(m => {
        m.onclick = (e) => {
            if (e.target === m) {
                closeModal(m.id);
            }
        };
    });
    
    // Initialize
    initProlog();
});

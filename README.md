# Prolog Detective: The Castle Mystery

An interactive, logic-deduction murder mystery game where the reasoning engine is powered by **Prolog** (running client-side in the browser via **Tau Prolog**), packaged inside a premium dark-themed dashboard.

---

## 🔍 General Concept & How it Works

The player acts as a detective investigating the murder of **Dr. Black** at a Victorian estate. The crime occurred at **10:00 PM**. 

The game uses **Prolog's pattern matching and logical reasoning capabilities** to solve the mystery. As you gather evidence and interview suspects, facts are dynamically asserted into the Prolog database. The game's engine then runs queries to identify contradictions, rule out suspects, and deduce the killer.

### The Core Logic Rules:
1. **Physical Evidence is Absolute Truth**: Any trace evidence (fingerprints, footprints, hair fibers) found in a room is 100% correct.
2. **Innocent Suspects Tell the Truth**: Innocent characters always report their true location at 10:00 PM.
3. **The Killer Lies**: The killer always provides a **false alibi** (claiming to be in a room other than the crime scene, which will contradict physical evidence or other testimonies).

---

## 🚀 How to Run the App

1. Clone or download this repository to your computer.
2. Open a terminal (e.g., PowerShell on Windows) in the project directory (`d:\PROLOG`) and run a local web server:
   ```bash
   python -m http.server 8000
   ```
3. Open your web browser and go to:
   👉 **[http://localhost:8000](http://localhost:8000)**
4. (Optional) Force-refresh (`Ctrl + F5` or `Ctrl + Shift + R`) if your browser serves cached assets.

---

## 📸 Walkthrough & Screenshot Analysis

The repository includes screenshots showcasing the gameplay, user interface, and the underlying Prolog logs. Below is a detailed description of how the app works using these photos:

### 1. Investigating Rooms & Discovering Clues
![Conservatory Search](photos/Screenshot%202026-06-23%20162848.png)
*When navigating to the **Conservatory** and clicking **Search Room**, the game uncovers physical evidence and discarded weapons. Here, the player found an **arch fingerprint** and **Poison**, which automatically asserted the Prolog fact `clue_found(fingerprint, conservatory, arch).*

---

### 2. Discovered Physical Evidence List
![Discovered Clues](photos/Screenshot%202026-06-23%20162855.png)
*The **Clues** tab in the notebook acts as a case file. It compiles all physical trace evidence (shoe sizes, hair colors, fingerprints) and item locations discovered by searching rooms. These represent the absolute logical truths in the database.*

---

### 3. Suspect Interrogations
![Interrogating Mr. Green](photos/Screenshot%202026-06-23%20162906.png)
*Interrogating **Mr. Green** in his room. Suspects provide their alibi and mention where they saw someone else. Here, Mr. Green claims he was in the Conservatory and saw Professor Plum in the Grand Hall, asserting `alibi_claimed(green, conservatory, 10)` and `statement_made(green, plum, hall, 10).*

---

### 4. Compiled Suspect Statements
![Statements Notebook](photos/Screenshot%202026-06-23%20162916.png)
*The **Statements** tab lists all verbal alibis and testimonies collected from suspects. While innocent suspect alibis will match physical evidence, the killer's alibi is a logical fabrication.*

---

### 5. The Prolog Reasoner (Ask Deductor)
![Ask Deductor Tab](photos/Screenshot%202026-06-23%20162925.png)
*In the **Ask Deductor** tab, the player triggers the Prolog reasoner. It queries the engine and lists:*
- ***Proven Innocent***: *Suspects ruled out by conflicting physical evidence at the crime scene, or verified alibis.*
- ***Contradictions Detected***: *Flags inconsistencies (e.g., Miss Scarlet claiming she was in the Library, but her fingerprint was found in the Grand Hall).*
- ***Suspect Status Cards***: *Dynamically tags suspects as INNOCENT, SUSPECT, or LIES DETECTED.*

---

### 6. Raw Prolog Query Console Output
![Prolog Console Logs](photos/Screenshot%202026-06-23%20163005.png)
*A log from the **Prolog Query Console** showing the exact logical evaluations:*
- `?- innocent(X, Reason).`: *Evaluates who is innocent and why (e.g., shoe size mismatch or verified presence in another room).*
- `?- contradiction(Msg).`: *Matches claims against scene details (e.g., catching Miss Scarlet and Mr. Green lying about their alibis).*
- `?- guilty(X, Reason).`: *Identifies the culprit (e.g., ruling out Clara, Scarlet, and Green for lying, leaving the true killer).*

---

## 🛠️ Technology Stack
- **Prolog Backend** ([game.pl](game.pl)): Implements dynamic facts, negation-as-failure (`\+`), and custom rules for alibi validation and accusation solving.
- **Frontend** ([index.html](index.html) & [style.css](style.css)): A responsive CSS Grid/Flexbox layout featuring a blueprint castle map, holographic terminal logs, and glassmorphism cards.
- **JavaScript Core** ([app.js](app.js)): Randomly generates the mystery solution at startup, coordinates room/clue states, and translates JS variables to Tau Prolog queries.
% Prolog Detective: The Castle Mystery
% Core Logic Engine

:- dynamic(clue_found/3).          % clue_found(Type, RoomOrWeapon, Detail)
:- dynamic(statement_made/4).      % statement_made(Speaker, Subject, Room, Time)
:- dynamic(alibi_claimed/3).       % alibi_claimed(Person, Room, Time)
:- dynamic(crime/3).               % crime(Room, Time, WoundType)

% Characters and their attributes
% char_attr(ID, DisplayName, ShoeSize, HairColor, FingerprintType)
char_attr(clara, 'Lady Clara', 6, blonde, whorl).
char_attr(mustard, 'Colonel Mustard', 11, grey, loop).
char_attr(plum, 'Professor Plum', 9, brown, arch).
char_attr(scarlet, 'Miss Scarlet', 7, red, whorl).
char_attr(green, 'Mr. Green', 10, black, loop).

% Weapons and their properties
% weapon_attr(ID, DisplayName, WoundType)
weapon_attr(revolver, 'Revolver', bullet).
weapon_attr(rope, 'Rope', marks).
weapon_attr(knife, 'Knife', cuts).
weapon_attr(pipe, 'Lead Pipe', blunt).
weapon_attr(poison, 'Poison', residue).

% Room display names
room_name(hall, 'Grand Hall').
room_name(library, 'Library').
room_name(billiard, 'Billiard Room').
room_name(kitchen, 'Kitchen').
room_name(conservatory, 'Conservatory').

% Helper predicates
character(X) :- char_attr(X, _, _, _, _).
name(X, Name) :- char_attr(X, Name, _, _, _).
shoe(X, Size) :- char_attr(X, _, Size, _, _).
hair(X, Color) :- char_attr(X, _, _, Color, _).
fingerprint(X, Fp) :- char_attr(X, _, _, _, Fp).

weapon(W) :- weapon_attr(W, _, _).
weapon_name(W, Name) :- weapon_attr(W, Name, _).

room(R) :- room_name(R, _).

% DEDUCTION RULES

% 1. Physical evidence is always true.
% Presence of a character can be physically verified in a room.
presence_clue(X, Room) :-
    char_attr(X, _, Size, _, _),
    clue_found(footprint, Room, Size).
presence_clue(X, Room) :-
    char_attr(X, _, _, Color, _),
    clue_found(hair, Room, Color).
presence_clue(X, Room) :-
    char_attr(X, _, _, _, Fp),
    clue_found(fingerprint, Room, Fp).

% A character X is ruled out (innocent) if:
% A. The physical evidence found at the crime scene contradicts X's attributes.
innocent(X, 'Crime scene footprint size does not match') :-
    char_attr(X, _, Size, _, _),
    crime(CrimeRoom, _, _),
    clue_found(footprint, CrimeRoom, SceneSize),
    Size \= SceneSize.

innocent(X, 'Crime scene hair color does not match') :-
    char_attr(X, _, _, Color, _),
    crime(CrimeRoom, _, _),
    clue_found(hair, CrimeRoom, SceneColor),
    Color \= SceneColor.

innocent(X, 'Crime scene fingerprint does not match') :-
    char_attr(X, _, _, _, Fp),
    crime(CrimeRoom, _, _),
    clue_found(fingerprint, CrimeRoom, SceneFp),
    Fp \= SceneFp.

% B. X has a verified alibi (was in a different room at the time of the crime).
% An alibi is verified if they claimed to be in a room, that room is not the CrimeRoom,
% and we have physical evidence or witness statements placing them there.
innocent(X, Reason) :-
    char_attr(X, Name, _, _, _),
    crime(CrimeRoom, CrimeTime, _),
    alibi_claimed(X, Room, CrimeTime),
    Room \= CrimeRoom,
    verified_presence(X, Room, CrimeTime),
    room_name(Room, RName),
    atom_concat(Name, ' was confirmed to be in the ', Temp),
    atom_concat(Temp, RName, Temp2),
    atom_concat(Temp2, ' at 10 PM.', Reason).

% C. X was seen in a different room by a physical clue (footprint/hair/fingerprint)
innocent(X, Reason) :-
    char_attr(X, Name, _, _, _),
    crime(CrimeRoom, _, _),
    presence_clue(X, Room),
    Room \= CrimeRoom,
    room_name(Room, RName),
    atom_concat(Name, '\'s physical trace was found in the ', Temp),
    atom_concat(Temp, RName, Temp2),
    atom_concat(Temp2, ', proving they were not at the crime scene.', Reason).

% Helper: Presence in Room at Time is verified if we found a physical clue or a statement of another person
verified_presence(X, Room, _Time) :-
    presence_clue(X, Room).
verified_presence(X, Room, Time) :-
    statement_made(Witness, X, Room, Time),
    Witness \= X.

% CONTRADICTIONS
% A contradiction occurs if:
% A. A person claims an alibi in Room1, but physical evidence proves they were in Room2.
contradiction(Msg) :-
    alibi_claimed(X, Room1, _),
    presence_clue(X, Room2),
    Room1 \= Room2,
    char_attr(X, Name, _, _, _),
    room_name(Room1, RN1),
    room_name(Room2, RN2),
    atom_concat(Name, ' claims to have been in the ', T1),
    atom_concat(T1, RN1, T2),
    atom_concat(T2, ', but physical evidence places them in the ', T3),
    atom_concat(T3, RN2, T4),
    atom_concat(T4, '!', Msg).

% B. A person's alibi claims they were in Room1, but a witness claims they were in Room2.
contradiction(Msg) :-
    alibi_claimed(X, Room1, Time),
    statement_made(W, X, Room2, Time),
    X \= W,
    Room1 \= Room2,
    char_attr(X, Name, _, _, _),
    char_attr(W, WName, _, _, _),
    room_name(Room1, RN1),
    room_name(Room2, RN2),
    atom_concat(Name, ' claims to have been in the ', T1),
    atom_concat(T1, RN1, T2),
    atom_concat(T2, ', but ', T3),
    atom_concat(T3, WName, T4),
    atom_concat(T4, ' claims they were in the ', T5),
    atom_concat(T5, RN2, T6),
    atom_concat(T6, '!', Msg).

% C. Two people make conflicting statements about someone's location.
contradiction(Msg) :-
    statement_made(W1, X, Room1, Time),
    statement_made(W2, X, Room2, Time),
    Room1 \= Room2,
    char_attr(X, Name, _, _, _),
    char_attr(W1, N1, _, _, _),
    char_attr(W2, N2, _, _, _),
    room_name(Room1, RN1),
    room_name(Room2, RN2),
    atom_concat(N1, ' claims ', C1),
    atom_concat(C1, Name, C2),
    atom_concat(C2, ' was in the ', C3),
    atom_concat(C3, RN1, C4),
    atom_concat(C4, ', but ', C5),
    atom_concat(C5, N2, C6),
    atom_concat(C6, ' claims they were in the ', C7),
    atom_concat(C7, RN2, C8),
    atom_concat(C8, '!', Msg).

% GUILTY LOGIC
% A suspect X is guilty if:
% A. They are caught lying (their alibi contradicts physical evidence).
guilty(X, 'Caught lying about their alibi!') :-
    character(X),
    alibi_claimed(X, Room1, _),
    presence_clue(X, Room2),
    Room1 \= Room2.

% B. They are the only suspect not proven innocent.
guilty(X, 'The only remaining suspect without a valid alibi or conflicting evidence.') :-
    character(X),
    \+ innocent(X, _),
    \+ other_suspect_might_be_guilty(X).

other_suspect_might_be_guilty(X) :-
    character(Y),
    X \= Y,
    \+ innocent(Y, _).

% WEAPON DEDUCTION
deduced_weapon(W, Reason) :-
    crime(_, _, WoundType),
    weapon_attr(W, Name, WoundType),
    atom_concat('The victim\'s wounds show traces of a ', Temp1),
    atom_concat(Temp1, WoundType, Temp2),
    atom_concat(Temp2, ' injury, which uniquely matches the ', Temp3),
    atom_concat(Temp3, Name, Reason).

% ROOM DEDUCTION
deduced_room(R, Reason) :-
    crime(R, _, _),
    room_name(R, Name),
    atom_concat('The victim\'s body was discovered in the ', Temp1),
    atom_concat(Temp1, Name, Reason).

% SOLUTION DEDUCTION
deduced_solution(Culprit, Room, Weapon) :-
    guilty(Culprit, _),
    crime(Room, _, _),
    deduced_weapon(Weapon, _).

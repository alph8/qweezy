// Roster + starting ratings from "WCC_mens_league_doubles_roster.xlsx" (Men's
// Doubles, Spring 2026), "Team Ratings" tab -- refreshed Oct 2026 to add
// Brian Frederick and Jeff Anderson.
//
// individualRating = USTA/NTRP. doublesRating is the STARTING point for the
// live ratings engine (see lib/ratings.ts) -- Eric's own projection where he
// gave one, falling back to the individual rating where the sheet left it
// blank. From here on, doublesRating moves on its own after every logged
// match; this array is only ever used to seed a player the first time
// they're imported, never to overwrite an existing rating.
// teamNumber / teamRank = the sheet's team # and proposed 1-30 ranking.
// Brian Frederick and Jeff Anderson are subs (no team yet).
export type RosterEntry = {
  name: string;
  individualRating: number;
  doublesRating: number | null;
  teamNumber: number | null;
  teamRank: number | null;
};

export const ROSTER: RosterEntry[] = [
  { name: "Eric Brown", individualRating: 4.5, doublesRating: 4.8, teamNumber: 1, teamRank: 2 },
  { name: "Kyle Ozaki", individualRating: 4.5, doublesRating: 4.6, teamNumber: 1, teamRank: 2 },
  { name: "John Barton", individualRating: 4.5, doublesRating: 4.8, teamNumber: 2, teamRank: 1 },
  { name: "Keith Bray", individualRating: 4.5, doublesRating: 4.9, teamNumber: 2, teamRank: 1 },
  { name: "Eric Marquez", individualRating: 4.5, doublesRating: 4.4, teamNumber: 3, teamRank: 4 },
  { name: "Asad Sawani", individualRating: 4, doublesRating: 4.3, teamNumber: 3, teamRank: 4 },
  { name: "Michael Tarsha", individualRating: 4.5, doublesRating: 4.5, teamNumber: 4, teamRank: 6 },
  { name: "Michael Turner", individualRating: 4, doublesRating: 4, teamNumber: 4, teamRank: 6 },
  { name: "Tim Chapman", individualRating: 4, doublesRating: 4, teamNumber: 5, teamRank: 5 },
  { name: "Ricky Doyle", individualRating: 4.5, doublesRating: 4.5, teamNumber: 5, teamRank: 5 },
  { name: "Matthew Haralson", individualRating: 4, doublesRating: 4.3, teamNumber: 6, teamRank: 3 },
  { name: "Nik Pai", individualRating: 4.5, doublesRating: 4.4, teamNumber: 6, teamRank: 3 },
  { name: "Jonathan Lass", individualRating: 4, doublesRating: 4, teamNumber: 7, teamRank: 10 },
  { name: "Vikram Grover", individualRating: 4, doublesRating: 4, teamNumber: 7, teamRank: 10 },
  { name: "St.John Dunne", individualRating: 4, doublesRating: 4, teamNumber: 8, teamRank: 11 },
  { name: "Juan Gonzalez", individualRating: 4, doublesRating: 4, teamNumber: 8, teamRank: 11 },
  { name: "Eddie Lewis", individualRating: 4, doublesRating: 4.2, teamNumber: 9, teamRank: 7 },
  { name: "Todd Preheim", individualRating: 4, doublesRating: 4.3, teamNumber: 9, teamRank: 7 },
  { name: "Troy Madres", individualRating: 4, doublesRating: 4.1, teamNumber: 10, teamRank: 8 },
  { name: "Jeff Kalikstein", individualRating: 4, doublesRating: 4.3, teamNumber: 10, teamRank: 8 },
  { name: "Jeff Albrecht", individualRating: 4, doublesRating: 4.3, teamNumber: 11, teamRank: 9 },
  { name: "Omar Boulden", individualRating: 4, doublesRating: 4, teamNumber: 11, teamRank: 9 },
  { name: "Jose Rodriguez", individualRating: 4, doublesRating: 4.2, teamNumber: 12, teamRank: 12 },
  { name: "Bob Del Pietro", individualRating: 3.5, doublesRating: 3.7, teamNumber: 12, teamRank: 12 },
  { name: "Dave Muhich", individualRating: 3.5, doublesRating: 3.8, teamNumber: 13, teamRank: 13 },
  { name: "Garrett Sprowls", individualRating: 4, doublesRating: 4.1, teamNumber: 13, teamRank: 13 },
  { name: "Jay Morrison", individualRating: 4, doublesRating: 4, teamNumber: 14, teamRank: 14 },
  { name: "Eric Giesler", individualRating: 3.5, doublesRating: 3.8, teamNumber: 14, teamRank: 14 },
  { name: "Jeff Jumonville", individualRating: 4, doublesRating: 4, teamNumber: 15, teamRank: 18 },
  { name: "Will Crenshaw", individualRating: 3.5, doublesRating: 3.5, teamNumber: 15, teamRank: 18 },
  { name: "Tom Carstens", individualRating: 3.5, doublesRating: 3.5, teamNumber: 16, teamRank: 20 },
  { name: "John McManus", individualRating: 3.5, doublesRating: 3.8, teamNumber: 16, teamRank: 20 },
  { name: "Eric Sellars", individualRating: 3.5, doublesRating: 3.9, teamNumber: 17, teamRank: 15 },
  { name: "Ryan Crossland", individualRating: 3.5, doublesRating: 3.8, teamNumber: 17, teamRank: 15 },
  { name: "Jay Snodgrass", individualRating: 3.5, doublesRating: 3.5, teamNumber: 18, teamRank: 21 },
  { name: "Blair Duncan", individualRating: 3.5, doublesRating: 3.7, teamNumber: 18, teamRank: 21 },
  { name: "Eric Webber", individualRating: 3.5, doublesRating: 3.8, teamNumber: 19, teamRank: 17 },
  { name: "Thiru Lakshman", individualRating: 3.5, doublesRating: 3.8, teamNumber: 19, teamRank: 17 },
  { name: "Chris Moose", individualRating: 3.5, doublesRating: 3.8, teamNumber: 20, teamRank: 16 },
  { name: "Lee Smith", individualRating: 3.5, doublesRating: 3.9, teamNumber: 20, teamRank: 16 },
  { name: "Josh Kerr", individualRating: 3.5, doublesRating: 3.7, teamNumber: 21, teamRank: 19 },
  { name: "Ken Leonard", individualRating: 3.5, doublesRating: 3.7, teamNumber: 21, teamRank: 19 },
  { name: "Brent Turnipseed", individualRating: 3.5, doublesRating: 3.5, teamNumber: 22, teamRank: 22 },
  { name: "Chris Morris", individualRating: 3.5, doublesRating: 3.5, teamNumber: 22, teamRank: 22 },
  { name: "Trey Dolezal", individualRating: 3.5, doublesRating: 3.5, teamNumber: 23, teamRank: 23 },
  { name: "Brian Pratt", individualRating: 3.5, doublesRating: 3.5, teamNumber: 23, teamRank: 23 },
  { name: "Ken Womack", individualRating: 3.5, doublesRating: 3.5, teamNumber: 24, teamRank: 24 },
  { name: "Chris Stutzman", individualRating: 3.5, doublesRating: 3.5, teamNumber: 24, teamRank: 24 },
  { name: "Brian McNamara", individualRating: 3.5, doublesRating: 3.5, teamNumber: 25, teamRank: 25 },
  { name: "Giulio Pappal", individualRating: 3.5, doublesRating: 3.5, teamNumber: 25, teamRank: 25 },
  { name: "Andrew Gallo", individualRating: 3.5, doublesRating: 3.5, teamNumber: 26, teamRank: 26 },
  { name: "Robert Bastion", individualRating: 3, doublesRating: 3, teamNumber: 26, teamRank: 26 },
  { name: "Eagle Robinson", individualRating: 3.5, doublesRating: 3.5, teamNumber: 27, teamRank: 27 },
  { name: "Rickey Hall", individualRating: 3, doublesRating: 3, teamNumber: 27, teamRank: 27 },
  { name: "Bill Brennan", individualRating: 3.5, doublesRating: 3.5, teamNumber: 28, teamRank: 28 },
  { name: "Tanner Bond", individualRating: 3, doublesRating: 3, teamNumber: 28, teamRank: 28 },
  { name: "Brett Birkeland", individualRating: 3, doublesRating: 3, teamNumber: 29, teamRank: 29 },
  { name: "Mark McKenzie", individualRating: 3, doublesRating: 3, teamNumber: 29, teamRank: 29 },
  { name: "Todd Davis", individualRating: 3, doublesRating: 3, teamNumber: 30, teamRank: 30 },
  { name: "Ed Winn", individualRating: 3, doublesRating: 3, teamNumber: 30, teamRank: 30 },
  { name: "Brian Frederick", individualRating: 4.8, doublesRating: null, teamNumber: null, teamRank: null },
  { name: "Jeff Anderson", individualRating: 4.3, doublesRating: null, teamNumber: null, teamRank: null },

  // Substitutes who showed up in week 1-3 scores but aren't on a team.
  // Ratings are Eric's own estimate (Oct 2026), not from the sheet above.
  // These players likely won't be used in the betting app, but are here so
  // a match involving them can still be rated if it ever is.
  { name: "Suhail Ubaidur", individualRating: 4.4, doublesRating: 4.4, teamNumber: null, teamRank: null },
  { name: "Tony Montero", individualRating: 4.3, doublesRating: 4.3, teamNumber: null, teamRank: null },
  { name: "Licinio Sousa", individualRating: 4.1, doublesRating: 4.1, teamNumber: null, teamRank: null },
  { name: "Ryan South", individualRating: 3.7, doublesRating: 3.7, teamNumber: null, teamRank: null },
  { name: "Malkani", individualRating: 3.2, doublesRating: 3.2, teamNumber: null, teamRank: null },
  { name: "Oldham", individualRating: 3.7, doublesRating: 3.7, teamNumber: null, teamRank: null },
  { name: "Knippa", individualRating: 3.7, doublesRating: 3.7, teamNumber: null, teamRank: null },
];

// Alternate spellings seen in the weekly score sheets that should resolve to
// the same roster player above (typos, nicknames, "St. John" vs "St.John",
// etc). Matching is case/whitespace-insensitive either way; this only
// covers cases where the spelling itself differs.
export const ROSTER_ALIASES: Record<string, string> = {
  "st. johne dunne": "St.John Dunne",
  "st john dunne": "St.John Dunne",
  "juan gonzales": "Juan Gonzalez",
  "juan pablo gonzalez": "Juan Gonzalez",
  "micheal turner": "Michael Turner",
  "oman boulden": "Omar Boulden",
  "willow crenshaw": "Will Crenshaw",
  "matt haralson": "Matthew Haralson",
  "malkani (sub)": "Malkani",
  "oldham (sub)": "Oldham",
  "knippa (sub)": "Knippa",
};

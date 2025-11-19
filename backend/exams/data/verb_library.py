from __future__ import annotations

from typing import Dict, List


INTRO_STYLES: Dict[str, Dict[str, str]] = {
    "meaningful": {"nb": "meningsfullt", "nn": "meiningsfullt", "en": "meaningful"},
    "useful": {"nb": "nyttig", "nn": "nyttig", "en": "useful"},
    "encouraging": {"nb": "oppmuntrende", "nn": "oppmuntrande", "en": "encouraging"},
    "inspiring": {"nb": "inspirerende", "nn": "inspirerande", "en": "inspiring"},
    "calming": {"nb": "rolig", "nn": "rolig", "en": "calming"},
    "safe": {"nb": "trygt", "nn": "trygt", "en": "safe"},
    "practical": {"nb": "praktisk", "nn": "praktisk", "en": "practical"},
    "energizing": {"nb": "energigivende", "nn": "energigjevande", "en": "energizing"},
    "creative": {"nb": "kreativt", "nn": "kreativt", "en": "creative"},
    "balanced": {"nb": "balansert", "nn": "balansert", "en": "balanced"},
}


SUBJECTS: Dict[str, Dict[str, str]] = {
    "jeg": {"nb": "Jeg", "nn": "Eg", "en": "I", "person": "first"},
    "vi": {"nb": "Vi", "nn": "Me", "en": "We", "person": "plural"},
    "de": {"nb": "De", "nn": "Dei", "en": "They", "person": "plural"},
    "hun": {"nb": "Hun", "nn": "Ho", "en": "She", "person": "third_singular"},
    "han": {"nb": "Han", "nn": "Han", "en": "He", "person": "third_singular"},
    "teamet": {"nb": "Teamet", "nn": "Laget", "en": "The team", "person": "third_singular"},
    "studentene": {"nb": "Studentene", "nn": "Studentane", "en": "The students", "person": "plural"},
    "læreren": {"nb": "Læreren", "nn": "Læraren", "en": "The teacher", "person": "third_singular"},
    "klassen": {"nb": "Klassen", "nn": "Klassa", "en": "The class", "person": "plural"},
    "instruktøren": {"nb": "Instruktøren", "nn": "Instruktøren", "en": "The instructor", "person": "third_singular"},
    "familien": {"nb": "Familien", "nn": "Familien", "en": "The family", "person": "third_singular"},
}


CONTEXT_TEMPLATES: Dict[str, Dict[str, Dict[str, str]]] = {
    "project": {
        "nb": {
            "inf": "fokusert på prosjektplanen sammen med laget",
            "present": "på designkontoret hver fredag",
            "past": "i prosjektrommet i fjor høst",
            "perfect": "med kollegaene siden januar",
        },
        "nn": {
            "inf": "fokusert på prosjektplanen saman med laget",
            "present": "på designkontoret kvar fredag",
            "past": "i prosjektrommet i fjor haust",
            "perfect": "med kollegaene sidan januar",
        },
        "en": {
            "inf": "focused on the project plan with the team",
            "present": "at the design office every Friday",
            "past": "in the project room last autumn",
            "perfect": "with colleagues since January",
        },
    },
    "library": {
        "nb": {
            "inf": "i lesegruppa etter middag",
            "present": "på biblioteket hver kveld",
            "past": "ved langbordet i går kveld",
            "perfect": "med studiegruppa hele semesteret",
        },
        "nn": {
            "inf": "i lesegruppa etter middag",
            "present": "på biblioteket kvar kveld",
            "past": "ved langbordet i går kveld",
            "perfect": "med studiegruppa heile semesteret",
        },
        "en": {
            "inf": "in the reading group after dinner",
            "present": "at the library every evening",
            "past": "at the long table last night",
            "perfect": "with the study group all semester",
        },
    },
    "travel": {
        "nb": {
            "inf": "langs kysten med klassen",
            "present": "til campus med toget hver uke",
            "past": "gjennom fjordene i fjor vinter",
            "perfect": "med kursdeltakerne mange ganger",
        },
        "nn": {
            "inf": "langs kysten med klassa",
            "present": "til campus med toget kvar veke",
            "past": "gjennom fjordane i fjor vinter",
            "perfect": "med kursdeltakarane mange gongar",
        },
        "en": {
            "inf": "along the coast with the class",
            "present": "to campus by train every week",
            "past": "through the fjords last winter",
            "perfect": "with course participants many times",
        },
    },
    "kitchen": {
        "nb": {
            "inf": "på kjøkkenet sammen med familien",
            "present": "til lunsj i dag",
            "past": "til høstfesten i går",
            "perfect": "til alle samlingene i år",
        },
        "nn": {
            "inf": "på kjøkenet saman med familien",
            "present": "til lunsj i dag",
            "past": "til haustfesten i går",
            "perfect": "til alle samlingane i år",
        },
        "en": {
            "inf": "in the kitchen together with the family",
            "present": "for lunch today",
            "past": "for the autumn party yesterday",
            "perfect": "for every gathering this year",
        },
    },
    "community": {
        "nb": {
            "inf": "for nabolaget når noen trenger det",
            "present": "for naboene hver helg",
            "past": "på kulturhuset i går",
            "perfect": "for frivilligsenteret siden i vår",
        },
        "nn": {
            "inf": "for nabolaget når nokon treng det",
            "present": "for naboane kvar helg",
            "past": "på kulturhuset i går",
            "perfect": "for frivilligsenteret sidan i vår",
        },
        "en": {
            "inf": "for the neighborhood whenever someone needs help",
            "present": "for the neighbours every weekend",
            "past": "at the community hall yesterday",
            "perfect": "for the volunteer center since spring",
        },
    },
    "training": {
        "nb": {
            "inf": "på banen for å holde formen",
            "present": "på treningssenteret hver tirsdag",
            "past": "rundt innsjøen i går morges",
            "perfect": "med laget gjennom hele sesongen",
        },
        "nn": {
            "inf": "på bana for å halde forma",
            "present": "på treningssenteret kvar tysdag",
            "past": "rundt innsjøen i går morgon",
            "perfect": "med laget gjennom heile sesongen",
        },
        "en": {
            "inf": "on the field to stay in shape",
            "present": "at the gym every Tuesday",
            "past": "around the lake yesterday morning",
            "perfect": "with the team throughout the season",
        },
    },
    "nature": {
        "nb": {
            "inf": "i fjellet med turgruppa",
            "present": "langs stien hver søndag",
            "past": "over vidda i sommer",
            "perfect": "på nye ruter i flere år",
        },
        "nn": {
            "inf": "i fjellet med turgruppa",
            "present": "langs stien kvar sundag",
            "past": "over vidda i sommar",
            "perfect": "på nye ruter i fleire år",
        },
        "en": {
            "inf": "in the mountains with the hiking group",
            "present": "along the trail every Sunday",
            "past": "across the plateau this summer",
            "perfect": "on new routes for several years",
        },
    },
    "art": {
        "nb": {
            "inf": "i atelieret med rolige toner",
            "present": "i studioet hver kveld",
            "past": "til skolekonserten i fjor",
            "perfect": "i kreative prosjekter hele året",
        },
        "nn": {
            "inf": "i atelieret med rolege tonar",
            "present": "i studioet kvar kveld",
            "past": "til skulekonserten i fjor",
            "perfect": "i kreative prosjekt heile året",
        },
        "en": {
            "inf": "in the studio with calm tones",
            "present": "in the studio every evening",
            "past": "for the school concert last year",
            "perfect": "in creative projects all year",
        },
    },
    "communication": {
        "nb": {
            "inf": "for å holde kontakten med familien",
            "present": "med teamet hver mandag",
            "past": "med klassen i går ettermiddag",
            "perfect": "med studentene siden skolestart",
        },
        "nn": {
            "inf": "for å halde kontakten med familien",
            "present": "med teamet kvar måndag",
            "past": "med klassa i går ettermiddag",
            "perfect": "med studentane sidan skulestart",
        },
        "en": {
            "inf": "to stay in touch with the family",
            "present": "with the team every Monday",
            "past": "with the class yesterday afternoon",
            "perfect": "with the students since school started",
        },
    },
    "health": {
        "nb": {
            "inf": "i ro etter lange møter",
            "present": "på yogamatten hver morgen",
            "past": "på hytta sist helg",
            "perfect": "på faste pauser hele måneden",
        },
        "nn": {
            "inf": "i ro etter lange møte",
            "present": "på yogamatta kvar morgon",
            "past": "på hytta sist helg",
            "perfect": "på faste pauser heile månaden",
        },
        "en": {
            "inf": "in calm moments after long meetings",
            "present": "on the yoga mat every morning",
            "past": "at the cabin last weekend",
            "perfect": "during scheduled breaks all month",
        },
    },
    "city": {
        "nb": {
            "inf": "i sentrum for å oppleve byen",
            "present": "på torget hver torsdag",
            "past": "i gamlebyen i går",
            "perfect": "på nye steder hele våren",
        },
        "nn": {
            "inf": "i sentrum for å oppleve byen",
            "present": "på torget kvar torsdag",
            "past": "i gamlebyen i går",
            "perfect": "på nye stader heile våren",
        },
        "en": {
            "inf": "downtown to experience the city",
            "present": "at the square every Thursday",
            "past": "in the old town yesterday",
            "perfect": "in new places all spring",
        },
    },
    "digital": {
        "nb": {
            "inf": "med digitale verktøy for å dele ideer",
            "present": "i samarbeidsrommet hver dag",
            "past": "via nettmøtet i går",
            "perfect": "på plattformen siden lansering",
        },
        "nn": {
            "inf": "med digitale verktøy for å dele idear",
            "present": "i samarbeidsrommet kvar dag",
            "past": "via nettmøtet i går",
            "perfect": "på plattforma sidan lansering",
        },
        "en": {
            "inf": "with digital tools to share ideas",
            "present": "in the collaboration room every day",
            "past": "during the online meeting yesterday",
            "perfect": "on the platform since launch",
        },
    },
    "family": {
        "nb": {
            "inf": "med familien etter middag",
            "present": "med barna hver kveld",
            "past": "i stua i går",
            "perfect": "som rutine siden nyttår",
        },
        "nn": {
            "inf": "med familien etter middag",
            "present": "med barna kvar kveld",
            "past": "i stova i går",
            "perfect": "som rutine sidan nyttår",
        },
        "en": {
            "inf": "with the family after dinner",
            "present": "with the children every evening",
            "past": "in the living room yesterday",
            "perfect": "as a routine since New Year",
        },
    },
    "classroom": {
        "nb": {
            "inf": "for å støtte elevene i timen",
            "present": "i klasserommet hver morgen",
            "past": "under seminaret i går",
            "perfect": "i undervisningen hele året",
        },
        "nn": {
            "inf": "for å støtte elevane i timen",
            "present": "i klasserommet kvar morgon",
            "past": "under seminaret i går",
            "perfect": "i undervisninga heile året",
        },
        "en": {
            "inf": "to support the students during class",
            "present": "in the classroom every morning",
            "past": "during the seminar yesterday",
            "perfect": "in the teaching all year",
        },
    },
    "service": {
        "nb": {
            "inf": "for kunder når spørsmål dukker opp",
            "present": "på hjelpesenteret hver dag",
            "past": "for deltakerne i går kveld",
            "perfect": "med brukerne siden i sommer",
        },
        "nn": {
            "inf": "for kundar når spørsmål dukkar opp",
            "present": "på hjelpesenteret kvar dag",
            "past": "for deltakarane i går kveld",
            "perfect": "med brukarane sidan i sommar",
        },
        "en": {
            "inf": "for customers when questions appear",
            "present": "at the help desk every day",
            "past": "for the participants last night",
            "perfect": "with the users since summer",
        },
    },
    "research": {
        "nb": {
            "inf": "i laboratoriet når data skal tolkes",
            "present": "med funnene hver onsdag",
            "past": "på feltstudien i fjor",
            "perfect": "i rapportene siden prosjektstart",
        },
        "nn": {
            "inf": "i laboratoriet når data skal tolkast",
            "present": "med funna kvar onsdag",
            "past": "på feltstudien i fjor",
            "perfect": "i rapportane sidan prosjektstart",
        },
        "en": {
            "inf": "in the lab when data must be interpreted",
            "present": "with the findings every Wednesday",
            "past": "during the field study last year",
            "perfect": "in the reports since the project began",
        },
    },
    "culture": {
        "nb": {
            "inf": "på museet for å bli inspirert",
            "present": "på utstillingen hver måned",
            "past": "i teateret i går kveld",
            "perfect": "på kulturarrangementer i flere år",
        },
        "nn": {
            "inf": "på museet for å bli inspirert",
            "present": "på utstillinga kvar månad",
            "past": "i teateret i går kveld",
            "perfect": "på kulturarrangement i fleire år",
        },
        "en": {
            "inf": "at the museum to get inspired",
            "present": "at the exhibition every month",
            "past": "at the theatre last night",
            "perfect": "at cultural events for years",
        },
    },
    "media": {
        "nb": {
            "inf": "med podkaster for å følge nyheter",
            "present": "på øreklokkene hver morgen",
            "past": "med intervjuet i går",
            "perfect": "med favorittseriene hele sesongen",
        },
        "nn": {
            "inf": "med podkastar for å følge nyheiter",
            "present": "på øyreklokkene kvar morgon",
            "past": "med intervjuet i går",
            "perfect": "med favorittseriane heile sesongen",
        },
        "en": {
            "inf": "with podcasts to follow the news",
            "present": "on the headphones every morning",
            "past": "with the interview yesterday",
            "perfect": "with favorite series all season",
        },
    },
    "planning": {
        "nb": {
            "inf": "for å sikre at alt er klart i forkant",
            "present": "i kalenderen hver uke",
            "past": "på planleggingsmøtet i går",
            "perfect": "med sjekklistene siden i fjor",
        },
        "nn": {
            "inf": "for å sikre at alt er klart på førehand",
            "present": "i kalenderen kvar veke",
            "past": "på planleggingsmøtet i går",
            "perfect": "med sjekklistene sidan i fjor",
        },
        "en": {
            "inf": "to make sure everything is ready ahead of time",
            "present": "in the calendar every week",
            "past": "at the planning meeting yesterday",
            "perfect": "with the checklists since last year",
        },
    },
    "logistics": {
        "nb": {
            "inf": "på lageret før reisen starter",
            "present": "på terminalen hver morgen",
            "past": "på stasjonen i går",
            "perfect": "til kundene siden i høst",
        },
        "nn": {
            "inf": "på lageret før reisa startar",
            "present": "på terminalen kvar morgon",
            "past": "på stasjonen i går",
            "perfect": "til kundane sidan i haust",
        },
        "en": {
            "inf": "at the warehouse before the trip begins",
            "present": "at the terminal every morning",
            "past": "at the station yesterday",
            "perfect": "to the customers since autumn",
        },
    },
}


VERB_BLUEPRINTS: List[Dict] = [
    {
        "key": "arbeide",
        "tags": ["work"],
        "context": "project",
        "intro": "meaningful",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å arbeide",
            "present": "arbeider",
            "past": "arbeidet",
            "perfect": "har arbeidet",
        },
        "nynorsk": {
            "infinitive": "å arbeide",
            "present": "arbeider",
            "past": "arbeidde",
            "perfect": "har arbeidd",
        },
        "english": {
            "infinitive": "to work",
            "present": "work / works",
            "past": "worked",
            "perfect": "have worked / has worked",
        },
    },
    {
        "key": "planlegge",
        "tags": ["planning"],
        "context": "planning",
        "intro": "useful",
        "subjects": {"present": "vi", "past": "de", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å planlegge",
            "present": "planlegger",
            "past": "planla",
            "perfect": "har planlagt",
        },
        "nynorsk": {
            "infinitive": "å planleggje",
            "present": "planlegg",
            "past": "planla",
            "perfect": "har planlagt",
        },
        "english": {
            "infinitive": "to plan",
            "present": "plan / plans",
            "past": "planned",
            "perfect": "have planned / has planned",
        },
    },
    {
        "key": "organisere",
        "tags": ["planning"],
        "context": "project",
        "intro": "practical",
        "subjects": {"present": "hun", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å organisere",
            "present": "organiserer",
            "past": "organiserte",
            "perfect": "har organisert",
        },
        "nynorsk": {
            "infinitive": "å organisere",
            "present": "organiserer",
            "past": "organiserte",
            "perfect": "har organisert",
        },
        "english": {
            "infinitive": "to organize",
            "present": "organize / organizes",
            "past": "organized",
            "perfect": "have organized / has organized",
        },
    },
    {
        "key": "samarbeide",
        "tags": ["digital"],
        "context": "digital",
        "intro": "encouraging",
        "subjects": {"present": "vi", "past": "klassen", "perfect": "studentene"},
        "bokmaal": {
            "infinitive": "å samarbeide",
            "present": "samarbeider",
            "past": "samarbeidet",
            "perfect": "har samarbeidet",
        },
        "nynorsk": {
            "infinitive": "å samarbeide",
            "present": "samarbeider",
            "past": "samarbeidde",
            "perfect": "har samarbeidd",
        },
        "english": {
            "infinitive": "to collaborate",
            "present": "collaborate / collaborates",
            "past": "collaborated",
            "perfect": "have collaborated / has collaborated",
        },
    },
    {
        "key": "levere",
        "tags": ["logistics"],
        "context": "logistics",
        "intro": "practical",
        "subjects": {"present": "de", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å levere",
            "present": "leverer",
            "past": "leverte",
            "perfect": "har levert",
        },
        "nynorsk": {
            "infinitive": "å levere",
            "present": "leverer",
            "past": "leverte",
            "perfect": "har levert",
        },
        "english": {
            "infinitive": "to deliver",
            "present": "deliver / delivers",
            "past": "delivered",
            "perfect": "have delivered / has delivered",
        },
    },
    {
        "key": "analysere",
        "tags": ["research"],
        "context": "research",
        "intro": "meaningful",
        "subjects": {"present": "han", "past": "vi", "perfect": "instruktøren"},
        "bokmaal": {
            "infinitive": "å analysere",
            "present": "analyserer",
            "past": "analyserte",
            "perfect": "har analysert",
        },
        "nynorsk": {
            "infinitive": "å analysere",
            "present": "analyserer",
            "past": "analyserte",
            "perfect": "har analysert",
        },
        "english": {
            "infinitive": "to analyze",
            "present": "analyze / analyzes",
            "past": "analyzed",
            "perfect": "have analyzed / has analyzed",
        },
    },
    {
        "key": "undersøke",
        "tags": ["research"],
        "context": "research",
        "intro": "inspiring",
        "subjects": {"present": "hun", "past": "de", "perfect": "instruktøren"},
        "bokmaal": {
            "infinitive": "å undersøke",
            "present": "undersøker",
            "past": "undersøkte",
            "perfect": "har undersøkt",
        },
        "nynorsk": {
            "infinitive": "å undersøkje",
            "present": "undersøkjer",
            "past": "undersøkte",
            "perfect": "har undersøkt",
        },
        "english": {
            "infinitive": "to investigate",
            "present": "investigate / investigates",
            "past": "investigated",
            "perfect": "have investigated / has investigated",
        },
    },
    {
        "key": "dokumentere",
        "tags": ["research"],
        "context": "research",
        "intro": "balanced",
        "subjects": {"present": "vi", "past": "hun", "perfect": "læreren"},
        "bokmaal": {
            "infinitive": "å dokumentere",
            "present": "dokumenterer",
            "past": "dokumenterte",
            "perfect": "har dokumentert",
        },
        "nynorsk": {
            "infinitive": "å dokumentere",
            "present": "dokumenterer",
            "past": "dokumenterte",
            "perfect": "har dokumentert",
        },
        "english": {
            "infinitive": "to document",
            "present": "document / documents",
            "past": "documented",
            "perfect": "have documented / has documented",
        },
    },
    {
        "key": "skrive",
        "tags": ["library"],
        "context": "library",
        "intro": "inspiring",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "studentene"},
        "bokmaal": {
            "infinitive": "å skrive",
            "present": "skriver",
            "past": "skrev",
            "perfect": "har skrevet",
        },
        "nynorsk": {
            "infinitive": "å skrive",
            "present": "skriv",
            "past": "skreiv",
            "perfect": "har skrive",
        },
        "english": {
            "infinitive": "to write",
            "present": "write / writes",
            "past": "wrote",
            "perfect": "have written / has written",
        },
    },
    {
        "key": "lese",
        "tags": ["library"],
        "context": "library",
        "intro": "calming",
        "subjects": {"present": "hun", "past": "klassen", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å lese",
            "present": "leser",
            "past": "leste",
            "perfect": "har lest",
        },
        "nynorsk": {
            "infinitive": "å lese",
            "present": "les",
            "past": "las",
            "perfect": "har lese",
        },
        "english": {
            "infinitive": "to read",
            "present": "read / reads",
            "past": "read",
            "perfect": "have read / has read",
        },
    },
    {
        "key": "studere",
        "tags": ["library"],
        "context": "library",
        "intro": "useful",
        "subjects": {"present": "vi", "past": "de", "perfect": "studentene"},
        "bokmaal": {
            "infinitive": "å studere",
            "present": "studerer",
            "past": "studerte",
            "perfect": "har studert",
        },
        "nynorsk": {
            "infinitive": "å studere",
            "present": "studerer",
            "past": "studerte",
            "perfect": "har studert",
        },
        "english": {
            "infinitive": "to study",
            "present": "study / studies",
            "past": "studied",
            "perfect": "have studied / has studied",
        },
    },
    {
        "key": "lære",
        "tags": ["classroom"],
        "context": "classroom",
        "intro": "encouraging",
        "subjects": {"present": "de", "past": "vi", "perfect": "klassen"},
        "bokmaal": {
            "infinitive": "å lære",
            "present": "lærer",
            "past": "lærte",
            "perfect": "har lært",
        },
        "nynorsk": {
            "infinitive": "å lære",
            "present": "lærar",
            "past": "lærte",
            "perfect": "har lært",
        },
        "english": {
            "infinitive": "to learn",
            "present": "learn / learns",
            "past": "learned",
            "perfect": "have learned / has learned",
        },
    },
    {
        "key": "undervise",
        "tags": ["classroom"],
        "context": "classroom",
        "intro": "meaningful",
        "subjects": {"present": "læreren", "past": "han", "perfect": "instruktøren"},
        "bokmaal": {
            "infinitive": "å undervise",
            "present": "underviser",
            "past": "underviste",
            "perfect": "har undervist",
        },
        "nynorsk": {
            "infinitive": "å undervise",
            "present": "underviser",
            "past": "underviste",
            "perfect": "har undervist",
        },
        "english": {
            "infinitive": "to teach",
            "present": "teach / teaches",
            "past": "taught",
            "perfect": "have taught / has taught",
        },
    },
    {
        "key": "forklare",
        "tags": ["classroom"],
        "context": "classroom",
        "intro": "practical",
        "subjects": {"present": "hun", "past": "vi", "perfect": "instruktøren"},
        "bokmaal": {
            "infinitive": "å forklare",
            "present": "forklarer",
            "past": "forklarte",
            "perfect": "har forklart",
        },
        "nynorsk": {
            "infinitive": "å forklare",
            "present": "forklarar",
            "past": "forklarte",
            "perfect": "har forklart",
        },
        "english": {
            "infinitive": "to explain",
            "present": "explain / explains",
            "past": "explained",
            "perfect": "have explained / has explained",
        },
    },
    {
        "key": "repetere",
        "tags": ["classroom"],
        "context": "classroom",
        "intro": "safe",
        "subjects": {"present": "vi", "past": "klassen", "perfect": "studentene"},
        "bokmaal": {
            "infinitive": "å repetere",
            "present": "repeterer",
            "past": "repeterte",
            "perfect": "har repetert",
        },
        "nynorsk": {
            "infinitive": "å repetere",
            "present": "repeterer",
            "past": "repeterte",
            "perfect": "har repetert",
        },
        "english": {
            "infinitive": "to review",
            "present": "review / reviews",
            "past": "reviewed",
            "perfect": "have reviewed / has reviewed",
        },
    },
    {
        "key": "diskutere",
        "tags": ["communication"],
        "context": "communication",
        "intro": "energizing",
        "subjects": {"present": "vi", "past": "de", "perfect": "klassen"},
        "bokmaal": {
            "infinitive": "å diskutere",
            "present": "diskuterer",
            "past": "diskuterte",
            "perfect": "har diskutert",
        },
        "nynorsk": {
            "infinitive": "å diskutere",
            "present": "diskuterer",
            "past": "diskuterte",
            "perfect": "har diskutert",
        },
        "english": {
            "infinitive": "to discuss",
            "present": "discuss / discusses",
            "past": "discussed",
            "perfect": "have discussed / has discussed",
        },
    },
    {
        "key": "presentere",
        "tags": ["project"],
        "context": "project",
        "intro": "inspiring",
        "subjects": {"present": "teamet", "past": "vi", "perfect": "hun"},
        "bokmaal": {
            "infinitive": "å presentere",
            "present": "presenterer",
            "past": "presenterte",
            "perfect": "har presentert",
        },
        "nynorsk": {
            "infinitive": "å presentere",
            "present": "presenterer",
            "past": "presenterte",
            "perfect": "har presentert",
        },
        "english": {
            "infinitive": "to present",
            "present": "present / presents",
            "past": "presented",
            "perfect": "have presented / has presented",
        },
    },
    {
        "key": "møte",
        "tags": ["communication"],
        "context": "communication",
        "intro": "balanced",
        "subjects": {"present": "hun", "past": "vi", "perfect": "klassen"},
        "bokmaal": {
            "infinitive": "å møte",
            "present": "møter",
            "past": "møtte",
            "perfect": "har møtt",
        },
        "nynorsk": {
            "infinitive": "å møte",
            "present": "møter",
            "past": "møtte",
            "perfect": "har møtt",
        },
        "english": {
            "infinitive": "to meet",
            "present": "meet / meets",
            "past": "met",
            "perfect": "have met / has met",
        },
    },
    {
        "key": "avtale",
        "tags": ["planning"],
        "context": "planning",
        "intro": "safe",
        "subjects": {"present": "vi", "past": "de", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å avtale",
            "present": "avtaler",
            "past": "avtalte",
            "perfect": "har avtalt",
        },
        "nynorsk": {
            "infinitive": "å avtale",
            "present": "avtaler",
            "past": "avtalte",
            "perfect": "har avtalt",
        },
        "english": {
            "infinitive": "to schedule",
            "present": "schedule / schedules",
            "past": "scheduled",
            "perfect": "have scheduled / has scheduled",
        },
    },
    {
        "key": "hjelpe",
        "tags": ["community"],
        "context": "community",
        "intro": "meaningful",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å hjelpe",
            "present": "hjelper",
            "past": "hjalp",
            "perfect": "har hjulpet",
        },
        "nynorsk": {
            "infinitive": "å hjelpe",
            "present": "hjelper",
            "past": "hjelpte",
            "perfect": "har hjelpt",
        },
        "english": {
            "infinitive": "to help",
            "present": "help / helps",
            "past": "helped",
            "perfect": "have helped / has helped",
        },
    },
    {
        "key": "støtte",
        "tags": ["community"],
        "context": "community",
        "intro": "encouraging",
        "subjects": {"present": "de", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å støtte",
            "present": "støtter",
            "past": "støttet",
            "perfect": "har støttet",
        },
        "nynorsk": {
            "infinitive": "å støtte",
            "present": "støttar",
            "past": "støtta",
            "perfect": "har støtta",
        },
        "english": {
            "infinitive": "to support",
            "present": "support / supports",
            "past": "supported",
            "perfect": "have supported / has supported",
        },
    },
    {
        "key": "veilede",
        "tags": ["community"],
        "context": "community",
        "intro": "meaningful",
        "subjects": {"present": "læreren", "past": "vi", "perfect": "instruktøren"},
        "bokmaal": {
            "infinitive": "å veilede",
            "present": "veileder",
            "past": "veiledet",
            "perfect": "har veiledet",
        },
        "nynorsk": {
            "infinitive": "å rettleie",
            "present": "rettleier",
            "past": "rettleidde",
            "perfect": "har rettleidt",
        },
        "english": {
            "infinitive": "to guide",
            "present": "guide / guides",
            "past": "guided",
            "perfect": "have guided / has guided",
        },
    },
    {
        "key": "dele",
        "tags": ["digital"],
        "context": "digital",
        "intro": "creative",
        "subjects": {"present": "vi", "past": "de", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å dele",
            "present": "deler",
            "past": "delte",
            "perfect": "har delt",
        },
        "nynorsk": {
            "infinitive": "å dele",
            "present": "delar",
            "past": "delte",
            "perfect": "har delt",
        },
        "english": {
            "infinitive": "to share",
            "present": "share / shares",
            "past": "shared",
            "perfect": "have shared / has shared",
        },
    },
    {
        "key": "sende",
        "tags": ["communication"],
        "context": "digital",
        "intro": "practical",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å sende",
            "present": "sender",
            "past": "sendte",
            "perfect": "har sendt",
        },
        "nynorsk": {
            "infinitive": "å sende",
            "present": "sender",
            "past": "sendte",
            "perfect": "har sendt",
        },
        "english": {
            "infinitive": "to send",
            "present": "send / sends",
            "past": "sent",
            "perfect": "have sent / has sent",
        },
    },
    {
        "key": "ringe",
        "tags": ["communication"],
        "context": "communication",
        "intro": "safe",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å ringe",
            "present": "ringer",
            "past": "ringte",
            "perfect": "har ringt",
        },
        "nynorsk": {
            "infinitive": "å ringe",
            "present": "ringar",
            "past": "ringde",
            "perfect": "har ringt",
        },
        "english": {
            "infinitive": "to call",
            "present": "call / calls",
            "past": "called",
            "perfect": "have called / has called",
        },
    },
    {
        "key": "besøke",
        "tags": ["culture"],
        "context": "culture",
        "intro": "inspiring",
        "subjects": {"present": "de", "past": "vi", "perfect": "klassen"},
        "bokmaal": {
            "infinitive": "å besøke",
            "present": "besøker",
            "past": "besøkte",
            "perfect": "har besøkt",
        },
        "nynorsk": {
            "infinitive": "å besøkje",
            "present": "besøkjer",
            "past": "besøkte",
            "perfect": "har besøkt",
        },
        "english": {
            "infinitive": "to visit",
            "present": "visit / visits",
            "past": "visited",
            "perfect": "have visited / has visited",
        },
    },
    {
        "key": "utforske",
        "tags": ["travel"],
        "context": "travel",
        "intro": "inspiring",
        "subjects": {"present": "vi", "past": "de", "perfect": "hun"},
        "bokmaal": {
            "infinitive": "å utforske",
            "present": "utforsker",
            "past": "utforsket",
            "perfect": "har utforsket",
        },
        "nynorsk": {
            "infinitive": "å utforske",
            "present": "utforskar",
            "past": "utforska",
            "perfect": "har utforska",
        },
        "english": {
            "infinitive": "to explore",
            "present": "explore / explores",
            "past": "explored",
            "perfect": "have explored / has explored",
        },
    },
    {
        "key": "oppleve",
        "tags": ["city"],
        "context": "city",
        "intro": "creative",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å oppleve",
            "present": "opplever",
            "past": "opplevde",
            "perfect": "har opplevd",
        },
        "nynorsk": {
            "infinitive": "å oppleve",
            "present": "opplever",
            "past": "opplevde",
            "perfect": "har opplevd",
        },
        "english": {
            "infinitive": "to experience",
            "present": "experience / experiences",
            "past": "experienced",
            "perfect": "have experienced / has experienced",
        },
    },
    {
        "key": "vandre",
        "tags": ["nature"],
        "context": "nature",
        "intro": "calming",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å vandre",
            "present": "vandrer",
            "past": "vandret",
            "perfect": "har vandret",
        },
        "nynorsk": {
            "infinitive": "å vandre",
            "present": "vandrar",
            "past": "vandra",
            "perfect": "har vandra",
        },
        "english": {
            "infinitive": "to wander",
            "present": "wander / wanders",
            "past": "wandered",
            "perfect": "have wandered / has wandered",
        },
    },
    {
        "key": "trene",
        "tags": ["training"],
        "context": "training",
        "intro": "energizing",
        "subjects": {"present": "vi", "past": "de", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å trene",
            "present": "trener",
            "past": "trente",
            "perfect": "har trent",
        },
        "nynorsk": {
            "infinitive": "å trene",
            "present": "trenar",
            "past": "trena",
            "perfect": "har trena",
        },
        "english": {
            "infinitive": "to train",
            "present": "train / trains",
            "past": "trained",
            "perfect": "have trained / has trained",
        },
    },
    {
        "key": "løpe",
        "tags": ["training"],
        "context": "training",
        "intro": "energizing",
        "subjects": {"present": "de", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å løpe",
            "present": "løper",
            "past": "løp",
            "perfect": "har løpt",
        },
        "nynorsk": {
            "infinitive": "å springe",
            "present": "spring",
            "past": "sprang",
            "perfect": "har sprunge",
        },
        "english": {
            "infinitive": "to run",
            "present": "run / runs",
            "past": "ran",
            "perfect": "have run / has run",
        },
    },
    {
        "key": "svømme",
        "tags": ["training"],
        "context": "training",
        "intro": "calming",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å svømme",
            "present": "svømmer",
            "past": "svømte",
            "perfect": "har svømt",
        },
        "nynorsk": {
            "infinitive": "å symje",
            "present": "sym",
            "past": "sumde",
            "perfect": "har sumt",
        },
        "english": {
            "infinitive": "to swim",
            "present": "swim / swims",
            "past": "swam",
            "perfect": "have swum / has swum",
        },
    },
    {
        "key": "øve",
        "tags": ["training"],
        "context": "art",
        "intro": "balanced",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "studentene"},
        "bokmaal": {
            "infinitive": "å øve",
            "present": "øver",
            "past": "øvde",
            "perfect": "har øvd",
        },
        "nynorsk": {
            "infinitive": "å øve",
            "present": "øvar",
            "past": "øvde",
            "perfect": "har øvd",
        },
        "english": {
            "infinitive": "to practice",
            "present": "practice / practices",
            "past": "practiced",
            "perfect": "have practiced / has practiced",
        },
    },
    {
        "key": "spille",
        "tags": ["art"],
        "context": "art",
        "intro": "creative",
        "subjects": {"present": "vi", "past": "de", "perfect": "klassen"},
        "bokmaal": {
            "infinitive": "å spille",
            "present": "spiller",
            "past": "spilte",
            "perfect": "har spilt",
        },
        "nynorsk": {
            "infinitive": "å spele",
            "present": "spelar",
            "past": "spelte",
            "perfect": "har spela",
        },
        "english": {
            "infinitive": "to play",
            "present": "play / plays",
            "past": "played",
            "perfect": "have played / has played",
        },
    },
    {
        "key": "synge",
        "tags": ["art"],
        "context": "art",
        "intro": "inspiring",
        "subjects": {"present": "hun", "past": "klassen", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å synge",
            "present": "synger",
            "past": "sang",
            "perfect": "har sunget",
        },
        "nynorsk": {
            "infinitive": "å synge",
            "present": "syng",
            "past": "song",
            "perfect": "har sunge",
        },
        "english": {
            "infinitive": "to sing",
            "present": "sing / sings",
            "past": "sang",
            "perfect": "have sung / has sung",
        },
    },
    {
        "key": "tegne",
        "tags": ["art"],
        "context": "art",
        "intro": "creative",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "studentene"},
        "bokmaal": {
            "infinitive": "å tegne",
            "present": "tegner",
            "past": "tegnet",
            "perfect": "har tegnet",
        },
        "nynorsk": {
            "infinitive": "å teikne",
            "present": "teiknar",
            "past": "teikna",
            "perfect": "har teikna",
        },
        "english": {
            "infinitive": "to draw",
            "present": "draw / draws",
            "past": "drew",
            "perfect": "have drawn / has drawn",
        },
    },
    {
        "key": "male",
        "tags": ["art"],
        "context": "art",
        "intro": "creative",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å male",
            "present": "maler",
            "past": "malte",
            "perfect": "har malt",
        },
        "nynorsk": {
            "infinitive": "å male",
            "present": "målar",
            "past": "måla",
            "perfect": "har måla",
        },
        "english": {
            "infinitive": "to paint",
            "present": "paint / paints",
            "past": "painted",
            "perfect": "have painted / has painted",
        },
    },
    {
        "key": "lage",
        "tags": ["kitchen"],
        "context": "kitchen",
        "intro": "creative",
        "subjects": {"present": "hun", "past": "vi", "perfect": "familien"},
        "bokmaal": {
            "infinitive": "å lage",
            "present": "lager",
            "past": "laget",
            "perfect": "har laget",
        },
        "nynorsk": {
            "infinitive": "å lage",
            "present": "lagar",
            "past": "laga",
            "perfect": "har laga",
        },
        "english": {
            "infinitive": "to make",
            "present": "make / makes",
            "past": "made",
            "perfect": "have made / has made",
        },
    },
    {
        "key": "bake",
        "tags": ["kitchen"],
        "context": "kitchen",
        "intro": "calming",
        "subjects": {"present": "vi", "past": "de", "perfect": "familien"},
        "bokmaal": {
            "infinitive": "å bake",
            "present": "baker",
            "past": "bakte",
            "perfect": "har bakt",
        },
        "nynorsk": {
            "infinitive": "å bake",
            "present": "bakar",
            "past": "bakte",
            "perfect": "har baka",
        },
        "english": {
            "infinitive": "to bake",
            "present": "bake / bakes",
            "past": "baked",
            "perfect": "have baked / has baked",
        },
    },
    {
        "key": "koke",
        "tags": ["kitchen"],
        "context": "kitchen",
        "intro": "practical",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å koke",
            "present": "koker",
            "past": "kokte",
            "perfect": "har kokt",
        },
        "nynorsk": {
            "infinitive": "å koke",
            "present": "kokar",
            "past": "kokte",
            "perfect": "har kokt",
        },
        "english": {
            "infinitive": "to cook",
            "present": "cook / cooks",
            "past": "cooked",
            "perfect": "have cooked / has cooked",
        },
    },
    {
        "key": "rydde",
        "tags": ["family"],
        "context": "family",
        "intro": "safe",
        "subjects": {"present": "vi", "past": "familien", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å rydde",
            "present": "rydder",
            "past": "ryddet",
            "perfect": "har ryddet",
        },
        "nynorsk": {
            "infinitive": "å rydde",
            "present": "ryddar",
            "past": "rydda",
            "perfect": "har rydda",
        },
        "english": {
            "infinitive": "to tidy",
            "present": "tidy / tidies",
            "past": "tidied",
            "perfect": "have tidied / has tidied",
        },
    },
    {
        "key": "vaske",
        "tags": ["family"],
        "context": "family",
        "intro": "balanced",
        "subjects": {"present": "hun", "past": "vi", "perfect": "familien"},
        "bokmaal": {
            "infinitive": "å vaske",
            "present": "vasker",
            "past": "vasket",
            "perfect": "har vasket",
        },
        "nynorsk": {
            "infinitive": "å vaske",
            "present": "vaskar",
            "past": "vaska",
            "perfect": "har vaska",
        },
        "english": {
            "infinitive": "to wash",
            "present": "wash / washes",
            "past": "washed",
            "perfect": "have washed / has washed",
        },
    },
    {
        "key": "hvile",
        "tags": ["health"],
        "context": "health",
        "intro": "calming",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å hvile",
            "present": "hviler",
            "past": "hvilte",
            "perfect": "har hvilt",
        },
        "nynorsk": {
            "infinitive": "å kvile",
            "present": "kviler",
            "past": "kvilte",
            "perfect": "har kvilt",
        },
        "english": {
            "infinitive": "to rest",
            "present": "rest / rests",
            "past": "rested",
            "perfect": "have rested / has rested",
        },
    },
    {
        "key": "sove",
        "tags": ["health"],
        "context": "health",
        "intro": "safe",
        "subjects": {"present": "de", "past": "vi", "perfect": "familien"},
        "bokmaal": {
            "infinitive": "å sove",
            "present": "sover",
            "past": "sov",
            "perfect": "har sovet",
        },
        "nynorsk": {
            "infinitive": "å sove",
            "present": "søv",
            "past": "sov",
            "perfect": "har sove",
        },
        "english": {
            "infinitive": "to sleep",
            "present": "sleep / sleeps",
            "past": "slept",
            "perfect": "have slept / has slept",
        },
    },
    {
        "key": "våkne",
        "tags": ["health"],
        "context": "health",
        "intro": "balanced",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å våkne",
            "present": "våkner",
            "past": "våknet",
            "perfect": "har våknet",
        },
        "nynorsk": {
            "infinitive": "å vakne",
            "present": "vaknar",
            "past": "vakna",
            "perfect": "har vakna",
        },
        "english": {
            "infinitive": "to wake",
            "present": "wake / wakes",
            "past": "woke",
            "perfect": "have woken / has woken",
        },
    },
    {
        "key": "tenke",
        "tags": ["digital"],
        "context": "digital",
        "intro": "balanced",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å tenke",
            "present": "tenker",
            "past": "tenkte",
            "perfect": "har tenkt",
        },
        "nynorsk": {
            "infinitive": "å tenke",
            "present": "tenkjer",
            "past": "tenkte",
            "perfect": "har tenkt",
        },
        "english": {
            "infinitive": "to think",
            "present": "think / thinks",
            "past": "thought",
            "perfect": "have thought / has thought",
        },
    },
    {
        "key": "drømme",
        "tags": ["health"],
        "context": "media",
        "intro": "creative",
        "subjects": {"present": "de", "past": "vi", "perfect": "hun"},
        "bokmaal": {
            "infinitive": "å drømme",
            "present": "drømmer",
            "past": "drømte",
            "perfect": "har drømt",
        },
        "nynorsk": {
            "infinitive": "å drøyme",
            "present": "drøymer",
            "past": "drøymde",
            "perfect": "har drøymt",
        },
        "english": {
            "infinitive": "to dream",
            "present": "dream / dreams",
            "past": "dreamed",
            "perfect": "have dreamed / has dreamed",
        },
    },
    {
        "key": "bestille",
        "tags": ["service"],
        "context": "planning",
        "intro": "practical",
        "subjects": {"present": "jeg", "past": "vi", "perfect": "klassen"},
        "bokmaal": {
            "infinitive": "å bestille",
            "present": "bestiller",
            "past": "bestilte",
            "perfect": "har bestilt",
        },
        "nynorsk": {
            "infinitive": "å bestille",
            "present": "bestiller",
            "past": "bestilte",
            "perfect": "har bestilt",
        },
        "english": {
            "infinitive": "to book",
            "present": "book / books",
            "past": "booked",
            "perfect": "have booked / has booked",
        },
    },
    {
        "key": "betale",
        "tags": ["service"],
        "context": "service",
        "intro": "practical",
        "subjects": {"present": "de", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å betale",
            "present": "betaler",
            "past": "betalte",
            "perfect": "har betalt",
        },
        "nynorsk": {
            "infinitive": "å betale",
            "present": "betaler",
            "past": "betalte",
            "perfect": "har betalt",
        },
        "english": {
            "infinitive": "to pay",
            "present": "pay / pays",
            "past": "paid",
            "perfect": "have paid / has paid",
        },
    },
    {
        "key": "hente",
        "tags": ["logistics"],
        "context": "logistics",
        "intro": "useful",
        "subjects": {"present": "vi", "past": "teamet", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å hente",
            "present": "henter",
            "past": "hentet",
            "perfect": "har hentet",
        },
        "nynorsk": {
            "infinitive": "å hente",
            "present": "hentar",
            "past": "henta",
            "perfect": "har henta",
        },
        "english": {
            "infinitive": "to pick up",
            "present": "pick up / picks up",
            "past": "picked up",
            "perfect": "have picked up / has picked up",
        },
    },
    {
        "key": "pakke",
        "tags": ["logistics"],
        "context": "logistics",
        "intro": "balanced",
        "subjects": {"present": "vi", "past": "de", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å pakke",
            "present": "pakker",
            "past": "pakket",
            "perfect": "har pakket",
        },
        "nynorsk": {
            "infinitive": "å pakke",
            "present": "pakkar",
            "past": "pakka",
            "perfect": "har pakka",
        },
        "english": {
            "infinitive": "to pack",
            "present": "pack / packs",
            "past": "packed",
            "perfect": "have packed / has packed",
        },
    },
    {
        "key": "starte",
        "tags": ["project"],
        "context": "project",
        "intro": "energizing",
        "subjects": {"present": "teamet", "past": "de", "perfect": "vi"},
        "bokmaal": {
            "infinitive": "å starte",
            "present": "starter",
            "past": "startet",
            "perfect": "har startet",
        },
        "nynorsk": {
            "infinitive": "å starte",
            "present": "startar",
            "past": "starta",
            "perfect": "har starta",
        },
        "english": {
            "infinitive": "to start",
            "present": "start / starts",
            "past": "started",
            "perfect": "have started / has started",
        },
    },
    {
        "key": "gjennomføre",
        "tags": ["project"],
        "context": "project",
        "intro": "practical",
        "subjects": {"present": "vi", "past": "teamet", "perfect": "instruktøren"},
        "bokmaal": {
            "infinitive": "å gjennomføre",
            "present": "gjennomfører",
            "past": "gjennomførte",
            "perfect": "har gjennomført",
        },
        "nynorsk": {
            "infinitive": "å gjennomføre",
            "present": "gjennomfører",
            "past": "gjennomførte",
            "perfect": "har gjennomført",
        },
        "english": {
            "infinitive": "to complete",
            "present": "complete / completes",
            "past": "completed",
            "perfect": "have completed / has completed",
        },
    },
    {
        "key": "evaluere",
        "tags": ["research"],
        "context": "research",
        "intro": "balanced",
        "subjects": {"present": "de", "past": "vi", "perfect": "teamet"},
        "bokmaal": {
            "infinitive": "å evaluere",
            "present": "evaluerer",
            "past": "evaluerte",
            "perfect": "har evaluert",
        },
        "nynorsk": {
            "infinitive": "å evaluere",
            "present": "evaluerer",
            "past": "evaluerte",
            "perfect": "har evaluert",
        },
        "english": {
            "infinitive": "to evaluate",
            "present": "evaluate / evaluates",
            "past": "evaluated",
            "perfect": "have evaluated / has evaluated",
        },
    },
    {
        "key": "feire",
        "tags": ["culture"],
        "context": "culture",
        "intro": "inspiring",
        "subjects": {"present": "vi", "past": "familien", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å feire",
            "present": "feirer",
            "past": "feiret",
            "perfect": "har feiret",
        },
        "nynorsk": {
            "infinitive": "å feire",
            "present": "feirar",
            "past": "feira",
            "perfect": "har feira",
        },
        "english": {
            "infinitive": "to celebrate",
            "present": "celebrate / celebrates",
            "past": "celebrated",
            "perfect": "have celebrated / has celebrated",
        },
    },
    {
        "key": "invitere",
        "tags": ["community"],
        "context": "community",
        "intro": "encouraging",
        "subjects": {"present": "hun", "past": "vi", "perfect": "de"},
        "bokmaal": {
            "infinitive": "å invitere",
            "present": "inviterer",
            "past": "inviterte",
            "perfect": "har invitert",
        },
        "nynorsk": {
            "infinitive": "å invitere",
            "present": "inviterer",
            "past": "inviterte",
            "perfect": "har invitert",
        },
        "english": {
            "infinitive": "to invite",
            "present": "invite / invites",
            "past": "invited",
            "perfect": "have invited / has invited",
        },
    },
]


def strip_prefix(value: str, prefix: str) -> str:
    token = value.strip()
    prefix_lower = prefix.strip().lower()
    if token.lower().startswith(f"{prefix_lower} "):
        return token[len(prefix) + 1 :].strip()
    if token.lower().startswith(prefix_lower):
        return token[len(prefix) :].strip()
    return token


def sentence_from_parts(*parts: str) -> str:
    text = " ".join(part.strip() for part in parts if part and part.strip())
    return text.strip() + "."


def choose_variant(value: str, requires_third: bool) -> str:
    parts = [part.strip() for part in value.split("/") if part.strip()]
    if not parts:
        return value.strip()
    if requires_third and len(parts) > 1:
        return parts[1]
    return parts[0]


def build_examples(blueprint: Dict, language: str) -> str:
    lang_key = {"bokmaal": "nb", "nynorsk": "nn", "english": "en"}[language]
    context = CONTEXT_TEMPLATES[blueprint["context"]][lang_key]
    intro = INTRO_STYLES[blueprint["intro"]][lang_key]
    forms = blueprint[language]
    subjects = blueprint["subjects"]
    present_subject = SUBJECTS[subjects["present"]][lang_key]
    past_subject = SUBJECTS[subjects["past"]][lang_key]
    perfect_subject = SUBJECTS[subjects["perfect"]][lang_key]
    needs_third = SUBJECTS[subjects["present"]]["person"] == "third_singular"
    sentences = []
    if language == "english":
        inf_base = strip_prefix(forms["infinitive"], "to")
        sentences.append(sentence_from_parts("It is", intro, "to", inf_base, context["inf"]))
        present_form = choose_variant(forms["present"], needs_third)
        sentences.append(sentence_from_parts(present_subject, present_form, context["present"]))
        sentences.append(sentence_from_parts(past_subject, forms["past"], context["past"]))
        perfect_form = choose_variant(forms["perfect"], SUBJECTS[subjects["perfect"]]["person"] == "third_singular")
        sentences.append(sentence_from_parts(perfect_subject, perfect_form, context["perfect"]))
    else:
        inf_base = strip_prefix(forms["infinitive"], "å")
        sentences.append(sentence_from_parts("Det er", intro, "å", inf_base, context["inf"]))
        sentences.append(sentence_from_parts(present_subject, forms["present"], context["present"]))
        sentences.append(sentence_from_parts(past_subject, forms["past"], context["past"]))
        sentences.append(sentence_from_parts(perfect_subject, forms["perfect"], context["perfect"]))
    return "\n".join(sentences)


def build_verbs() -> Dict[str, List[Dict]]:
    by_stream = {"bokmaal": [], "nynorsk": [], "english": []}
    for blueprint in VERB_BLUEPRINTS:
        for language in ("bokmaal", "nynorsk", "english"):
            payload = {
                "verb": blueprint[language]["infinitive"],
                "infinitive": blueprint[language]["infinitive"],
                "present": blueprint[language]["present"],
                "past": blueprint[language]["past"],
                "perfect": blueprint[language]["perfect"],
                "examples": build_examples(blueprint, language),
                "tags": blueprint.get("tags", []),
            }
            by_stream[language].append(payload)
    return by_stream


VERBS_BY_STREAM = build_verbs()

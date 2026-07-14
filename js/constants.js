const KEYWORDS = {
    solar: ["scorch", "ignite", "cure", "restoration", "radiant", "solar", "fire", "burn", "daybreak", "well of radiance", "golden gun", "blade barrage", "hammer of sol", "burning maul", "fusion grenade"],
    void: ["suppress", "weaken", "volatile", "devour", "invisibility", "overshield", "void", "nova bomb", "nova warp", "shadowshot", "spectral blades", "ward of dawn", "sentinel shield", "tether"],
    arc: ["jolt", "blind", "amplified", "ionic trace", "arc", "lightning", "stormtrance", "chaos reach", "arc staff", "gathering storm", "fists of havoc", "thundercrash", "electricity"],
    stasis: ["slow", "freeze", "shatter", "stasis crystal", "stasis", "winter's wrath", "silence and squall", "glacial quake", "ice", "cold", "duskfield", "coldsnap"],
    strand: ["suspend", "unravel", "sever", "woven mail", "tangle", "strand", "needlestorm", "silkstrike", "bladefury", "thread", "threadling"],
    prismatic: ["prismatic", "transcendence", "facet", "ascension", "devotion", "hope"],
    neutral: ["melee", "grenade", "class ability", "precision", "finisher", "orb of power", "kinetic", "reload", "handling", "sprint", "slide", "airborne", "poison"]
};

const CLASS_TYPES = {
    0: "Titan",
    1: "Hunter",
    2: "Warlock"
};

const SUBCLASS_MAPPING = {
    "striker": "arc", "sentinel": "void", "sunbreaker": "solar", "behemoth": "stasis", "berserker": "strand", "prismatic titan": "prismatic",
    "arcstrider": "arc", "nightstalker": "void", "gunslinger": "solar", "revenant": "stasis", "threadrunner": "strand", "prismatic hunter": "prismatic",
    "stormcaller": "arc", "voidwalker": "void", "dawnblade": "solar", "shadebinder": "stasis", "broodweaver": "strand", "prismatic warlock": "prismatic"
};
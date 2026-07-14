async function loadManifest(setStatus) {
    try {
        setStatus("Connecting to Bungie Manifest...");
        let itemDefUrl = "https://destiny.plumbing/en/raw/DestinyInventoryItemDefinition.json";
        let setDefUrl = "https://destiny.plumbing/en/raw/DestinyEquipableItemSetDefinition.json";
        let perkDefUrl = "https://destiny.plumbing/en/raw/DestinySandboxPerkDefinition.json";
        let plugSetDefUrl = "https://destiny.plumbing/en/raw/DestinyPlugSetDefinition.json";
        let seasonDefUrl = "https://destiny.plumbing/en/raw/DestinySeasonDefinition.json";
        
        try {
            const res = await fetch("https://www.bungie.net/Platform/Destiny2/Manifest/", { mode: 'cors' });
            if (res.ok) {
                const data = await res.json();
                itemDefUrl = "https://www.bungie.net" + data.Response.jsonWorldComponentContentPaths.en.DestinyInventoryItemDefinition;
                setDefUrl = "https://www.bungie.net" + data.Response.jsonWorldComponentContentPaths.en.DestinyEquipableItemSetDefinition;
                perkDefUrl = "https://www.bungie.net" + data.Response.jsonWorldComponentContentPaths.en.DestinySandboxPerkDefinition;
                plugSetDefUrl = "https://www.bungie.net" + data.Response.jsonWorldComponentContentPaths.en.DestinyPlugSetDefinition;
                seasonDefUrl = "https://www.bungie.net" + data.Response.jsonWorldComponentContentPaths.en.DestinySeasonDefinition;
            }
        } catch (e) {
            console.warn("Bungie manifest endpoint failed, falling back to community mirror...");
        }

        setStatus("Downloading Databases (this may take a moment)...");
        const [itemsRes, setsRes, perksRes, plugSetsRes, seasonsRes] = await Promise.all([
            fetch(itemDefUrl, { mode: 'cors' }),
            fetch(setDefUrl, { mode: 'cors' }),
            fetch(perkDefUrl, { mode: 'cors' }),
            fetch(plugSetDefUrl, { mode: 'cors' }),
            fetch(seasonDefUrl, { mode: 'cors' })
        ]);
        
        const itemsData = await itemsRes.json();
        const setsData = await setsRes.json();
        const perksData = await perksRes.json();
        const plugSetsData = await plugSetsRes.json();
        const seasonsData = await seasonsRes.json();

        setStatus("Processing Items & Sockets...");
        
        const weaponsMap = new Map();
        const armorMap = new Map();
        const subclassesMap = new Map();
        const abilitiesMaps = {
            super: new Map(), melee: new Map(), grenade: new Map(), 
            classAbility: new Map(), jump: new Map(), aspects: new Map(), fragments: new Map()
        };
        const legendaryArmor = [];
        const globalAbilityNames = new Set();
        const globalWeaponTypes = new Set();
        
        const exoticClassItems = ["stoicism", "relativism", "solipsism"];
        const parsedArtifacts = [];
        const perfectClassItemPools = { 0: [[],[]], 1: [[],[]], 2: [[],[]] };
        
        const TRAIT_MAP = {
            0: { 0: ["assassin", "inmost light", "ophidian", "severance", "hoarfrost", "bear", "abeyant"], 1: ["star-eater", "synthoceps", "verity", "contact", "scars", "horn", "armamentarium", "lupi"] },
            1: { 0: ["assassin", "inmost light", "ophidian", "galanor", "renewal", "foetracer", "caliban", "dragon"], 1: ["star-eater", "synthoceps", "verity", "cyrtarachne", "gyrfalcon", "liar", "coyote", "wormhusk"] },
            2: { 0: ["assassin", "inmost light", "ophidian", "apotheosis", "osmiomancy", "necrotic", "filaments"], 1: ["star-eater", "synthoceps", "verity", "swarm", "vesper", "harmony", "starfire", "claw"] }
        };

        for (const hash in itemsData) {
            const item = itemsData[hash];
            if (!item.displayProperties) continue;
            let name = item.displayProperties.name || "";
            let desc = item.displayProperties.description || "";
            let icon = item.displayProperties.icon || "";
            let isTrait = name.toLowerCase().includes("spirit of");

            if (item.perks && item.perks.length > 0) {
                const sbDef = perksData[item.perks[0].perkHash];
                if (sbDef && sbDef.displayProperties?.name?.toLowerCase().includes("spirit of")) {
                    isTrait = true;
                    name = sbDef.displayProperties.name;
                    desc = sbDef.displayProperties.description || desc;
                    icon = sbDef.displayProperties.icon || icon;
                }
            }

            if (isTrait && !name.toLowerCase().includes("empty") && !name.toLowerCase().includes("deprecated")) {
                const nameLower = name.toLowerCase();
                const perkObj = { hash, name, desc: desc || "No description available.", icon: icon ? `https://www.bungie.net${icon}` : "" };
                
                [0, 1, 2].forEach(cId => {
                    [0, 1].forEach(colIdx => {
                        if (TRAIT_MAP[cId][colIdx].some(t => nameLower.includes(t))) {
                            const existing = perfectClassItemPools[cId][colIdx].findIndex(p => p.name === name);
                            if (existing === -1) {
                                perfectClassItemPools[cId][colIdx].push(perkObj);
                            } else if (desc.length > perfectClassItemPools[cId][colIdx][existing].desc.length) {
                                perfectClassItemPools[cId][colIdx][existing] = perkObj;
                            }
                        }
                    });
                });
            }
        }

        for (const hash in perksData) {
            const perk = perksData[hash];
            let name = perk.displayProperties?.name || "";
            let desc = perk.displayProperties?.description || "";
            if (name.toLowerCase().includes("spirit of") && !name.toLowerCase().includes("empty") && !name.toLowerCase().includes("deprecated")) {
                const nameLower = name.toLowerCase();
                const perkObj = { hash, name, desc: desc || "No description available.", icon: perk.displayProperties?.icon ? `https://www.bungie.net${perk.displayProperties.icon}` : "" };
                
                [0, 1, 2].forEach(cId => {
                    [0, 1].forEach(colIdx => {
                        if (TRAIT_MAP[cId][colIdx].some(t => nameLower.includes(t))) {
                            const existing = perfectClassItemPools[cId][colIdx].findIndex(p => p.name === name);
                            if (existing === -1) {
                                perfectClassItemPools[cId][colIdx].push(perkObj);
                            }
                        }
                    });
                });
            }
        }

        for (const hash in itemsData) {
            const item = itemsData[hash];
            if (!item.displayProperties || !item.displayProperties.name) continue;
            
            const name = item.displayProperties.name;
            const desc = item.displayProperties.description || "";
            const dName = item.itemTypeDisplayName || "";
            
            const nameLower = name.toLowerCase();
            const dNameLower = dName.toLowerCase();
            const descLower = desc.toLowerCase();

            if (nameLower.includes("empty") || nameLower.includes("deprecated") || nameLower.includes("dummy")) continue;
            if (descLower.includes("deprecated")) continue;
            if (!item.displayProperties.icon) continue; 
            
            if (item.itemType === 2 && item.inventory?.tierType === 5) {
                legendaryArmor.push({
                    hash: hash,
                    nameLower: nameLower,
                    classType: item.classType,
                    bucket: item.inventory.bucketTypeHash
                });
            }

            let isArtifact = false;
            if (item.sockets && item.sockets.socketCategories) {
                const hasArtifactCategory = item.sockets.socketCategories.some(c => String(c.socketCategoryHash) === "2631166533");
                if (hasArtifactCategory) isArtifact = true;
            }

            if (isArtifact) {
                let sNum = 0;
                if (item.seasonHash && seasonsData[item.seasonHash]) {
                    sNum = seasonsData[item.seasonHash].seasonNumber;
                }

                const artifactData = {
                    hash: String(item.hash),
                    name: item.displayProperties.name,
                    icon: item.displayProperties.icon ? `https://www.bungie.net${item.displayProperties.icon}` : "",
                    desc: item.displayProperties.description || "",
                    seasonNumber: sNum,
                    intrinsics: [],
                    tier1: [],
                    tier2: [],
                    tier3: []
                };

                item.sockets.socketEntries.forEach((socketEntry, sIdx) => {
                    const plugSetHash = socketEntry.reusablePlugSetHash;
                    if (!plugSetHash || !plugSetsData[plugSetHash]) return;

                    const plugSet = plugSetsData[plugSetHash];
                    const pool = [];
                    let isTrueArtifactPerkSocket = false;

                    if (plugSet.reusablePlugItems) {
                        plugSet.reusablePlugItems.forEach(plugItem => {
                            const pHash = plugItem.plugItemHash;
                            const pItem = itemsData[pHash];
                            
                            if (pItem && pItem.displayProperties && pItem.displayProperties.name) {
                                const pNameLower = pItem.displayProperties.name.toLowerCase();
                                const pci = (pItem.plug?.plugCategoryIdentifier || "").toLowerCase();
                                if (pci.includes("artifact_perk") || pci.includes("artifact_tier") || pNameLower.includes("overload") || pNameLower.includes("barrier") || pNameLower.includes("unstoppable")) {
                                    isTrueArtifactPerkSocket = true;
                                }

                                if (pNameLower.includes("empty") || pNameLower.includes("deprecated") || pNameLower.includes("no mod currently selected") || pNameLower.includes("reset")) return;
                                if (pItem.plug && pItem.plug.equippable === false) return;
                                
                                let pDesc = pItem.displayProperties.description || "";
                                if (pItem.perks && pItem.perks.length > 0) {
                                    const sandboxHash = pItem.perks[0].perkHash;
                                    if (sandboxHash && perksData[sandboxHash] && perksData[sandboxHash].displayProperties) {
                                        pDesc = perksData[sandboxHash].displayProperties.description || pDesc;
                                    }
                                }

                                pool.push({
                                    hash: String(pHash),
                                    name: pItem.displayProperties.name,
                                    icon: pItem.displayProperties.icon ? `https://www.bungie.net${pItem.displayProperties.icon}` : "",
                                    desc: pDesc
                                });
                            }
                        });
                    }
                    
                    if (isTrueArtifactPerkSocket) {
                        if (pool.length === 1) {
                            artifactData.intrinsics.push(pool[0]);
                        } else {
                            // Assign to tiered pools based on socket entry index
                            const targetTier = (sIdx < 2) ? 'tier1' : (sIdx < 5) ? 'tier2' : (sIdx < 7) ? 'tier3' : null;
                            if (targetTier) {
                                pool.forEach(perk => {
                                    if (!artifactData[targetTier].some(p => p.hash === perk.hash)) {
                                        artifactData[targetTier].push(perk);
                                    }
                                });
                            }
                        }
                    }
                });

                if (artifactData.tier1.length > 0 && artifactData.tier2.length > 0 && artifactData.tier3.length > 0) {
                    parsedArtifacts.push(artifactData);
                }
            }

            const isExoticWeapon = item.itemType === 3 && item.inventory?.tierType === 6;
            const isExoticArmor = item.itemType === 2 && item.inventory?.tierType === 6;
            const isExoticClassItem = isExoticArmor && exoticClassItems.some(n => nameLower.includes(n));
            
            if (isExoticWeapon || isExoticArmor) {
                let actualPerkName = "";
                let actualPerkDesc = "";
                let perkColumns = [];
                
                if (isExoticClassItem) {
                    perkColumns = perfectClassItemPools[item.classType] || [[], []];
                    actualPerkName = "Exotic Class Item";
                    actualPerkDesc = "Rolls with two random Exotic perks.";
                } else {
                    if (item.sockets && item.sockets.socketEntries) {
                        for (let socket of item.sockets.socketEntries) {
                            let plugHash = socket.singleInitialItemHash;
                            if (plugHash && itemsData[plugHash]) {
                                let plug = itemsData[plugHash];
                                let pci = (plug.plug && plug.plug.plugCategoryIdentifier) || "";
                                let typeName = plug.itemTypeDisplayName || "";
                                
                                if (!actualPerkName && (pci.includes("intrinsic") || pci.includes("exotic") || typeName.toLowerCase().includes("trait") || typeName.toLowerCase().includes("armor perk"))) {
                                    if (plug.displayProperties && plug.displayProperties.description) {
                                        actualPerkName = plug.displayProperties.name;
                                        actualPerkDesc = plug.displayProperties.description;
                                    }
                                }
                            }
                        }
                    }
                }
        
                const finalDesc = actualPerkDesc || desc;
                const finalPerkName = actualPerkName || "";
                const itemIndex = item.index || 0;
                const hasPerk = !!actualPerkName || perkColumns.length > 0;

                let damageType = "kinetic";
                let ammoType = "";
                if (isExoticWeapon) {
                    if (item.defaultDamageType === 2) damageType = "arc";
                    else if (item.defaultDamageType === 3) damageType = "solar";
                    else if (item.defaultDamageType === 4) damageType = "void";
                    else if (item.defaultDamageType === 6) damageType = "stasis";
                    else if (item.defaultDamageType === 7) damageType = "strand";
                    
                    if (item.equippingBlock) {
                        if (item.equippingBlock.ammoType === 1) ammoType = "primary";
                        else if (item.equippingBlock.ammoType === 2) ammoType = "special";
                        else if (item.equippingBlock.ammoType === 3) ammoType = "heavy";
                    }
                }

                let weaponType = dNameLower.replace('combat ', '');
                if (isExoticWeapon && weaponType) globalWeaponTypes.add(weaponType);

                const itemData = { 
                    hash, name, icon: `https://www.bungie.net${item.displayProperties.icon}`, 
                    desc: finalDesc, perkName: finalPerkName, classType: item.classType, 
                    itemType: item.itemType, index: itemIndex, hasPerk,
                    bucket: item.inventory?.bucketTypeHash,
                    damageType, weaponType, ammoType, perkColumns
                };

                const targetMap = isExoticWeapon ? weaponsMap : armorMap;
                const existing = targetMap.get(name);
                
                const totalPerks = perkColumns.reduce((acc, col) => acc + col.length, 0);
                const existingTotalPerks = existing?.perkColumns?.reduce((acc, col) => acc + col.length, 0) || 0;
                
                let shouldSave = false;
                if (!existing) {
                    shouldSave = true;
                } else {
                    if (totalPerks > existingTotalPerks) {
                        shouldSave = true; 
                    } else if (totalPerks === existingTotalPerks) {
                        if (hasPerk && !existing.hasPerk) shouldSave = true;
                        else if (hasPerk === existing.hasPerk && itemIndex > existing.index) shouldSave = true;
                    }
                }

                if (shouldSave) {
                    targetMap.set(name, itemData);
                }
                continue;
            }

            if (item.itemType === 16 && item.classType !== 3 && dName.includes("Subclass")) {
                let subName = name.toLowerCase();
                let determinedElement = "neutral";
                for (const [key, el] of Object.entries(SUBCLASS_MAPPING)) {
                    if (subName.includes(key)) {
                        determinedElement = el;
                        break;
                    }
                }

                if (determinedElement !== "neutral" || subName.includes("prismatic")) {
                    const subKey = `${name}-${item.classType}`;
                    const itemIndex = item.index || 0;
                    const existing = subclassesMap.get(subKey);
                    
                    const validPlugs = new Set();
                    const socketCategoryMap = { super: [], classAbility: [], jump: [], melee: [], grenade: [], aspects: [], fragments: [] };

                    if (item.sockets && item.sockets.socketEntries) {
                        item.sockets.socketEntries.forEach((socket, idx) => {
                            let pci = "";
                            const testHashes = [];
                            if (socket.singleInitialItemHash) testHashes.push(socket.singleInitialItemHash);
                            if (socket.reusablePlugItems) socket.reusablePlugItems.forEach(p => testHashes.push(p.plugItemHash));
                            if (socket.reusablePlugSetHash && plugSetsData[socket.reusablePlugSetHash]) {
                                plugSetsData[socket.reusablePlugSetHash].reusablePlugItems?.forEach(p => testHashes.push(p.plugItemHash));
                            }
                            if (socket.randomizedPlugSetHash && plugSetsData[socket.randomizedPlugSetHash]) {
                                plugSetsData[socket.randomizedPlugSetHash].reusablePlugItems?.forEach(p => testHashes.push(p.plugItemHash));
                            }
                            
                            for (const testHash of testHashes) {
                                if (itemsData[testHash] && itemsData[testHash].plug) {
                                    const tempPci = itemsData[testHash].plug.plugCategoryIdentifier.toLowerCase();
                                    if (tempPci && !tempPci.includes('empty')) {
                                        pci = tempPci;
                                        break;
                                    }
                                }
                            }

                            if (pci) {
                                if (pci.includes('super')) socketCategoryMap.super.push(idx);
                                else if (pci.includes('class_ability') || pci.includes('dodge') || pci.includes('rift') || pci.includes('barricade') || pci.includes('thruster')) socketCategoryMap.classAbility.push(idx);
                                else if (pci.includes('jump') || pci.includes('movement')) socketCategoryMap.jump.push(idx);
                                else if (pci.includes('melee')) socketCategoryMap.melee.push(idx);
                                else if (pci.includes('grenade')) socketCategoryMap.grenade.push(idx);
                                else if (pci.includes('aspect')) socketCategoryMap.aspects.push(idx);
                                else if (pci.includes('fragment')) socketCategoryMap.fragments.push(idx);
                            }

                            testHashes.forEach(h => validPlugs.add(String(h)));
                        });
                    }

                    if (!existing || itemIndex > existing.index) {
                        subclassesMap.set(subKey, {
                            hash: hash, name: name, icon: `https://www.bungie.net${item.displayProperties.icon}`,
                            desc: desc, classType: item.classType, element: determinedElement, index: itemIndex,
                            validPlugs: validPlugs, socketCategoryMap: socketCategoryMap
                        });
                    } else if (existing && validPlugs.size > 0) {
                        validPlugs.forEach(p => existing.validPlugs.add(p));
                    }
                }
            }

            if (item.plug && item.plug.plugCategoryIdentifier) {
                const pci = item.plug.plugCategoryIdentifier.toLowerCase();

                const pciBans = ['armor', 'weapon', 'masterwork', 'mod', 'catalyst', 'upgrade', 'ghost', 'ornament', 'shader', 'emote', 'sparrow', 'ship', 'tracker', 'memento', 'crafting', 'hologram', 'glow', 'kill_tracker', 'test', 'events', 'finishers'];
                if (pciBans.some(term => pci.includes(term))) continue;

                const dNameBans = ['launcher', 'ornament', 'mod', 'catalyst', 'masterwork', 'upgrade', 'shader', 'emote', 'ghost', 'sparrow', 'ship', 'dummy', 'finisher', 'weapon', 'armor'];
                if (dNameBans.some(term => dNameLower.includes(term))) continue;

                const transcendentGrenades = ['freezing singularity', 'hailfire spike', 'electrified snare'];
                if (transcendentGrenades.some(term => nameLower.includes(term))) continue;

                const jumpNames = ["strafe jump", "high jump", "triple jump", "blink", "strafe glide", "burst glide", "balanced glide", "catapult lift", "strafe lift", "high lift"];
                const meleeNames = ["hammer strike", "throwing hammer", "shield bash", "shield throw", "seismic strike", "thunderclap", "shiver strike", "frenzied blade", "knife trick", "proximity explosive knife", "weighted heavy knife", "lightweight knife", "snare bomb", "combination blow", "disorienting blow", "withering blade", "threaded spike", "celestial fire", "incinerator snap", "pocket singularity", "ball lightning", "chain lightning", "penumbral blast", "arcane needle"];
                const classAbilNames = ["phoenix dive", "acrobat's dodge", "thruster", "healing rift", "empowering rift", "marksman's dodge", "gambler's dodge", "towering barricade", "rally barricade"];
                const superNames = ["well of radiance", "daybreak", "golden gun", "blade barrage", "hammer of sol", "burning maul", "nova bomb", "nova warp", "shadowshot", "spectral blades", "ward of dawn", "sentinel shield", "stormtrance", "chaos reach", "arc staff", "gathering storm", "fists of havoc", "thundercrash", "glacial quake", "silence and squall", "winter's wrath", "bladefury", "silkstrike", "needlestorm", "song of flame", "storm's edge", "twilight arsenal"];

                let category = null;
                if (pci.includes('super') || dNameLower.includes('super ability') || superNames.some(n => nameLower.includes(n))) category = 'super';
                else if (pci.includes('melee') || dNameLower.includes('melee') || meleeNames.includes(nameLower)) category = 'melee';
                else if (pci.includes('grenade') || dNameLower.includes('grenade')) category = 'grenade';
                else if (pci.includes('class_ability') || pci.includes('dodge') || pci.includes('rift') || pci.includes('barricade') || pci.includes('thruster') || dNameLower.includes('class ability') || classAbilNames.includes(nameLower)) category = 'classAbility';
                else if (pci.includes('movement') || pci.includes('jump') || dNameLower.includes('movement') || jumpNames.includes(nameLower)) category = 'jump';
                else if (pci.includes('aspect') || dNameLower.includes('aspect')) category = 'aspects';
                else if (pci.includes('fragment') || dNameLower.includes('fragment')) category = 'fragments';

                if (category && name.length > 1) {
                    globalAbilityNames.add(nameLower);
                    
                    let classConstraint = item.classType !== 3 ? item.classType : "shared";
                    if (classConstraint === "shared") {
                        if (pci.includes('titan') || dNameLower.includes('titan')) classConstraint = 0;
                        else if (pci.includes('hunter') || dNameLower.includes('hunter')) classConstraint = 1;
                        else if (pci.includes('warlock') || dNameLower.includes('warlock')) classConstraint = 2;
                    }

                    let elementConstraint = "neutral";
                    
                    if (pci.match(/\bsolar\b/)) elementConstraint = 'solar';
                    else if (pci.match(/\bvoid\b/)) elementConstraint = 'void';
                    else if (pci.match(/\barc\b/)) elementConstraint = 'arc';
                    else if (pci.match(/\bstasis\b/)) elementConstraint = 'stasis';
                    else if (pci.match(/\bstrand\b/)) elementConstraint = 'strand';
                    else if (pci.match(/\bprismatic\b/) || dNameLower.includes('prismatic') || nameLower.includes('facet of')) elementConstraint = 'prismatic';
                    else {
                        if (/\bsolar\b/.test(nameLower) && !/\bphoenix dive\b/.test(nameLower) && !/\bacrobat's dodge\b/.test(nameLower)) elementConstraint = 'solar';
                        else if (/\bvoid\b/.test(nameLower)) elementConstraint = 'void';
                        else if (/\barc\b/.test(nameLower) && !/\barcane\b/.test(nameLower)) elementConstraint = 'arc';
                        else if (/\bstasis\b/.test(nameLower)) elementConstraint = 'stasis';
                        else if (/\bstrand\b/.test(nameLower)) elementConstraint = 'strand';
                        else {
                            const knownElements = {
                                solar: ["hammer strike", "throwing hammer", "knife trick", "proximity explosive knife", "weighted heavy knife", "lightweight knife", "celestial fire", "incinerator snap", "phoenix dive", "acrobat's dodge", "well of radiance", "daybreak", "golden gun", "blade barrage", "hammer of sol", "burning maul", "consecration", "gunpowder gamble", "knock 'em down", "on your mark", "touch of flame", "heat rises", "icarus dash", "sol invictus", "roaring flames", "song of flame", "hellion"],
                                void: ["shield bash", "shield throw", "snare bomb", "pocket singularity", "nova bomb", "nova warp", "shadowshot", "spectral blades", "ward of dawn", "sentinel shield", "bastion", "controlled demolition", "offensive bulwark", "vanishing step", "stylish executioner", "trapper's ambush", "chaos accelerant", "feed the void", "child of the old gods", "twilight arsenal", "unbreakable"],
                                arc: ["seismic strike", "thunderclap", "combination blow", "disorienting blow", "ball lightning", "chain lightning", "thruster", "stormtrance", "chaos reach", "arc staff", "gathering storm", "fists of havoc", "thundercrash", "touch of thunder", "juggernaut", "knockout", "flow state", "lethal current", "tempest strike", "electrostatic mind", "lightning surge", "arc soul", "storm's edge", "ascension"],
                                stasis: ["shiver strike", "withering blade", "penumbral blast", "glacial quake", "silence and squall", "winter's wrath", "cryoclasm", "howl of the storm", "tectonic harvest", "grim harvest", "shatterdive", "touch of winter", "iceflare bolts", "bleak watcher", "frostpulse", "diamond lance", "winter's shroud", "glacial harvest"],
                                strand: ["frenzied blade", "threaded spike", "arcane needle", "bladefury", "silkstrike", "needlestorm", "into the fray", "drengr's lash", "banner of war", "ensnaring slam", "widow's silk", "threaded specter", "whirling maelstrom", "weaver's call", "mindspun invocation", "the wanderer", "weavewalk", "flechette storm"]
                            };
                            for (const [el, abilities] of Object.entries(knownElements)) {
                                if (abilities.some(a => nameLower.includes(a))) {
                                    elementConstraint = el;
                                    break;
                                }
                            }
                        }
                    }

                    if (nameLower === "blink") {
                        if (classConstraint === 2) elementConstraint = "void"; 
                        else if (classConstraint === 1) elementConstraint = "arc"; 
                    }

                    if (['super', 'melee', 'grenade', 'classAbility', 'jump'].includes(category)) {
                        if (KEYWORDS[elementConstraint] && !KEYWORDS[elementConstraint].includes(nameLower)) {
                            KEYWORDS[elementConstraint].push(nameLower);
                        }
                    }

                    let fragmentSlots = 0;
                    if (category === 'aspects') {
                        if (item.investmentStats) {
                            const stat = item.investmentStats.find(s => s.statTypeHash === 2586071856);
                            if (stat) fragmentSlots = stat.value;
                            else {
                                const fallback = item.investmentStats.find(s => s.value >= 1 && s.value <= 4);
                                if (fallback) fragmentSlots = fallback.value;
                            }
                        }
                        if (fragmentSlots === 0) fragmentSlots = 2; 
                    }

                    let abilDesc = desc;
                    if (item.perks && item.perks.length > 0) {
                        const perkHash = item.perks[0].perkHash;
                        if (perkHash && perksData[perkHash] && perksData[perkHash].displayProperties && perksData[perkHash].displayProperties.description) {
                            const perkDesc = perksData[perkHash].displayProperties.description;
                            if (perkDesc.length > abilDesc.length) {
                                abilDesc = perkDesc;
                            }
                        }
                    }

                    let statBonuses = [];
                    if (category === 'fragments' && item.investmentStats) {
                        item.investmentStats.forEach(stat => {
                            if (stat.value !== 0) {
                                let statName = "";
                                if (stat.statTypeHash === 2996146975) statName = "Class";
                                else if (stat.statTypeHash === 392767087) statName = "Health";
                                else if (stat.statTypeHash === 1943323491) statName = "Health";
                                else if (stat.statTypeHash === 1735777505) statName = "Grenade";
                                else if (stat.statTypeHash === 144602215) statName = "Super";
                                else if (stat.statTypeHash === 4244567218) statName = "Melee";
                                
                                if (statName) {
                                    statBonuses.push(`${stat.value > 0 ? '+' : ''}${stat.value} ${statName}`);
                                }
                            }
                        });
                    }

                    const itemIndex = item.index || 0;
                    const abilKey = `${name}-${classConstraint}`;
                    const targetMap = abilitiesMaps[category];
                    const existingAbil = targetMap.get(abilKey);

                    const abilData = { 
                        hash, name, desc: abilDesc, icon: `https://www.bungie.net${item.displayProperties.icon}`, 
                        pci, classConstraint, elementConstraint, fragmentSlots, index: itemIndex, stats: statBonuses,
                        hashes: new Set([String(hash)])
                    };

                    if (!existingAbil) {
                        targetMap.set(abilKey, abilData);
                    } else {
                        existingAbil.hashes.add(String(hash)); 
                        const isBetterDesc = abilDesc.length > (existingAbil.desc?.length || 0);
                        if (category === 'aspects') {
                            if (fragmentSlots > existingAbil.fragmentSlots || (fragmentSlots === existingAbil.fragmentSlots && isBetterDesc) || (fragmentSlots === existingAbil.fragmentSlots && !isBetterDesc && itemIndex > existingAbil.index)) {
                                existingAbil.desc = abilDesc;
                                existingAbil.fragmentSlots = fragmentSlots;
                                existingAbil.index = itemIndex;
                                existingAbil.hash = hash;
                                existingAbil.icon = `https://www.bungie.net${item.displayProperties.icon}`;
                            }
                        } else {
                            if (isBetterDesc || (abilDesc === existingAbil.desc && itemIndex > existingAbil.index)) {
                                existingAbil.desc = abilDesc;
                                existingAbil.index = itemIndex;
                                existingAbil.hash = hash;
                                existingAbil.icon = `https://www.bungie.net${item.displayProperties.icon}`;
                            }
                        }
                    }
                }
            }
        }

        const weapons = Array.from(weaponsMap.values());
        const armor = Array.from(armorMap.values());
        const subclasses = Array.from(subclassesMap.values());
        const allAbilities = {
            super: Array.from(abilitiesMaps.super.values()),
            melee: Array.from(abilitiesMaps.melee.values()),
            grenade: Array.from(abilitiesMaps.grenade.values()),
            classAbility: Array.from(abilitiesMaps.classAbility.values()),
            jump: Array.from(abilitiesMaps.jump.values()),
            aspects: Array.from(abilitiesMaps.aspects.values()),
            fragments: Array.from(abilitiesMaps.fragments.values())
        };

        const parsedSetsList = [];
        for (const hash in setsData) {
            const setDef = setsData[hash];
            const setPerksList = setDef.setPerks || setDef.setBlock?.setPerks || [];
            
            if (setPerksList.length > 0) {
                const parsedSetPerks = [];
                let has2 = false, has4 = false;

                setPerksList.forEach(sp => {
                    const count = sp.requiredSetCount || sp.requiredEquippedItemCount || sp.itemCount || sp.count || sp.equipCount;
                    if (count === 2 || count === 4) {
                        const perkHash = sp.sandboxPerkHash || sp.perkHash;
                        const perk = perksData[perkHash];
                        if (perk && perk.displayProperties && perk.displayProperties.description) {
                            parsedSetPerks.push({
                                count: count,
                                name: perk.displayProperties.name,
                                description: perk.displayProperties.description
                            });
                            if (count === 2) has2 = true;
                            if (count === 4) has4 = true;
                        }
                    }
                });

                const setArmor = { 0: [], 1: [], 2: [] };
                if (setDef.itemList) {
                    setDef.itemList.forEach(entry => {
                        const itemHash = entry.itemHash || entry; 
                        const item = itemsData[itemHash];
                        if (item && item.itemType === 2 && item.inventory) {
                            const cType = item.classType;
                            if (cType >= 0 && cType <= 2) {
                                setArmor[cType].push({
                                    hash: itemHash,
                                    bucket: item.inventory.bucketTypeHash
                                });
                            }
                        }
                    });
                }

                const setNamePrefix = (setDef.displayProperties?.name || "").toLowerCase()
                    .replace(/\b(set|armor|suit|gear|vestments|plate)\b/gi, "")
                    .trim();
                
                if (setNamePrefix.length > 3) {
                    for (let i = 0; i < 3; i++) {
                        if (setArmor[i].length < 5) {
                            const existingBuckets = new Set(setArmor[i].map(a => a.bucket));
                            const matchingLegendaries = legendaryArmor.filter(a => a.classType === i && a.nameLower.includes(setNamePrefix));
                            
                            for (const leg of matchingLegendaries) {
                                if (!existingBuckets.has(leg.bucket)) {
                                    setArmor[i].push({ hash: leg.hash, bucket: leg.bucket });
                                    existingBuckets.add(leg.bucket);
                                }
                            }
                        }
                    }
                }

                const totalArmorPieces = setArmor[0].length + setArmor[1].length + setArmor[2].length;

                if (parsedSetPerks.length > 0 && totalArmorPieces > 0) {
                    parsedSetsList.push({
                        hash: hash,
                        name: setDef.displayProperties?.name || "Unknown Set",
                        perks: parsedSetPerks,
                        has2,
                        has4,
                        synergyText: parsedSetPerks.map(p => p.description.toLowerCase()).join(" "),
                        setArmor: setArmor
                    });
                }
            }
        }

        return { weapons, armor, subclasses, abilities: allAbilities, sets: parsedSetsList, abilityNames: globalAbilityNames, weaponTypes: globalWeaponTypes, artifacts: parsedArtifacts };
    } catch (err) {
        throw new Error("Error loading manifest. " + err.message);
    }
}
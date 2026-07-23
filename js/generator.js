// Generate the build. Class, Armor, Weapon, Subclass, and Artifact
let generateBuild = (db, selClass, selArmor, selWeapon, selSubclass, selArtifact) => {
    // return array
    let filterAndSortIndex = (index, topN, indexKind, debug = false) => {
        if (debug) {
            console.log("DEBUG: Kind of index:", indexKind);
            // 1. Check if the object is actually populated AT THIS EXACT MOMENT
            console.log("DEBUG: Number of keys in index:", Object.keys(index).length);
            
            // 2. Check if the data is a string instead of an object
            console.log("DEBUG: Type of index:", typeof index);
            
            // 3. Verify topN is what you think it is
            console.log("DEBUG: Value of topN:", topN);
            
            // 4. Freeze a copy of the object to avoid the console "live reference" trap
            console.log("DEBUG: Frozen index state:", JSON.stringify(index));
        }
        // 1. Convert the object to an array of [key, value] pairs
        let returnObj = Object.entries(index)
            .filter(([, value]) => value !== 0)
            // 2. Sort descending (highest count first)
            .sort((a, b) => {
                // Tie-breaker: random order if counts are identical
                if (b[1] === a[1]) return Math.random() - 0.5;
                
                // Primary sort: descending by count
                return b[1] - a[1];
            })
            // 3. Keep only the top N results
            .slice(0, topN);
        if (debug) {
            console.log("DEBUG: Return Object:", JSON.stringify(returnObj));
        }
        return returnObj;
    };
    // return hashtable
    let getAllMatches = (text, regex, weight, keywordCountIndex = {}) => {
        let flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
        let globalRegex = new RegExp(regex.source, flags);

        let matches = text.matchAll(globalRegex); 

        for (let match of matches) {
            for (let i = 1; i < match.length; i++) {
                let capture = match[i];
                
                if (capture) {
                    keywordCountIndex[capture] = (keywordCountIndex[capture] || 0) + (1 * weight);
                }
            }
        }

        // FIX: Removed the Object.entries().sort() block entirely!
        return keywordCountIndex;
    };
    // return array
    let getMatchKeywords = (keywordData) => {
        // FIX: Handle both sorted arrays and raw objects
        if (Array.isArray(keywordData)) {
            return keywordData.map(item => item[0]);
        }
        return Object.keys(keywordData);
    }
    // return sum
    let totalMatches = (keywordCountIndex) => {
        return Object.values(keywordCountIndex).reduce((sum, count) => sum + count, 0);
    };
    // return regexp
    let buildRegexString = (keywords) => {
        let escapedKeywords = keywords.map(word => 
            // This replaces any special regex character with a backslash version of itself
            word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );

        let regexString = `(${escapedKeywords.join('?|')}?)`;
        let myRegex = new RegExp(regexString, "i");
        
        return myRegex;
    };
    let makeRandomChoice = (choices, debug=false) => {
        if (debug) {
            console.log("DEBUG: Choice Options", JSON.stringify(choices));
        }
        let choice = null;
        if (choices.length > 1) {
            choice = choices[Math.floor(Math.random() * choices.length)];
        }
        else {
            choice = choices[0];
        }
        if (debug) {
            console.log("DEBUG: Choice", JSON.stringify(choice));
        }
        return choice;
    };

    // extract the regex checks to a function call
    let updateKeywordMatches = (text, elementChoices, generalIndex, abilityKeywordIndex, mechanicKeywordIndex, statKeywordIndex) => {
        ['arc','solar','void','stasis','strand','prism'].forEach(i => {
            if (ABILITY_KEYWORD_REGEX[i].test(text.toLowerCase())) {
                elementChoices.push(i);
                generalIndex = getAllMatches(text.toLowerCase(), ABILITY_KEYWORD_REGEX[i], 10, generalIndex);
                abilityKeywordIndex = getAllMatches(text.toLowerCase(), ABILITY_KEYWORD_REGEX[i], 10, abilityKeywordIndex);
            }
            if (KEYWORD_REGEX[i].test(text.toLowerCase())) {
                elementChoices.push(i);
                generalIndex = getAllMatches(text.toLowerCase(), KEYWORD_REGEX[i], 10, generalIndex);
                mechanicKeywordIndex = getAllMatches(text.toLowerCase(), KEYWORD_REGEX[i], 10, mechanicKeywordIndex);
            }
        });
        if (KEYWORD_REGEX['mechanic'].test(text.toLowerCase())) {
            generalIndex = getAllMatches(text.toLowerCase(), KEYWORD_REGEX['mechanic'], 10, generalIndex);
        }
        ['health','melee','grenade','super','class','weapons'].forEach(i => {
            statKeywordIndex = getAllMatches(text.toLowerCase(), STAT_REGEX[i], 10, statKeywordIndex);
        });
    };

    // filter choices based on keywords
    let choiceFilterByKeywords = (choices, abilityKeywordIndex, mechanicKeywordIndex, generalIndex, properties) => {
        tmpChoices = choices;
        let safeProperties = properties == null ? [] : (Array.isArray(properties) ? properties : [properties]);
        let matchedChoices = [];
        for (const index in safeProperties) {
            let prop = safeProperties[index];
            if (Object.keys(abilityKeywordIndex).length > 0) {
                let abilityKeywords = getMatchKeywords(filterAndSortIndex(abilityKeywordIndex, 5, 'abilityKeywordIndex'));
                let abilityRegex = buildRegexString(abilityKeywords);
                let tmpMatchedChoices = tmpChoices.filter(m => {
                    return abilityRegex.test(m[prop].toLowerCase());
                });
                matchedChoices.push(...tmpMatchedChoices);
            }
            else if (Object.keys(mechanicKeywordIndex).length > 0) {
                let abilityKeywords = getMatchKeywords(filterAndSortIndex(mechanicKeywordIndex, 5, 'mechanicKeywordIndex'));
                let abilityRegex = buildRegexString(abilityKeywords);
                let tmpMatchedChoices = tmpChoices.filter(m => {
                    return abilityRegex.test(m[prop].toLowerCase());
                });
                matchedChoices.push(...tmpMatchedChoices);
            }
            else if (Object.keys(generalIndex).length > 0) {
                let abilityKeywords = getMatchKeywords(filterAndSortIndex(generalIndex, 5, 'generalIndex'));
                let abilityRegex = buildRegexString(abilityKeywords);
                let tmpMatchedChoices = tmpChoices.filter(m => {
                    return abilityRegex.test(m[prop].toLowerCase());
                });
                matchedChoices.push(...tmpMatchedChoices);
            }
        }
        if (matchedChoices.length > 0) {
            tmpChoices = matchedChoices;
        }
        
        return tmpChoices;
    };
    
    // set the class
    let chosenClass = selClass !== "" ? selClass : makeRandomChoice(['warlock','titan','hunter']);

    // setup choice array vars
    let armorChoices = [];
    let weaponChoices = [];
    let subclassChoices = [];
    let classAbilityChoices = [];
    let jumpAbilityChoices = [];
    let superAbilityChoices = [];
    let meleeAbilityChoices = [];
    let grenadeAbilityChoices = [];
    let aspectChoices = [];
    let fragmentChoices = [];
    let elementChoices = [];

    // setup choice vars
    let chosenArmor = {};
    let chosenWeapon = {};
    let chosenSubclass = {};
    let chosenClassAbility = {};
    let chosenJumpAbility = {};
    let chosenSuperAbility = {};
    let chosenMeleeAbility = {};
    let chosenGrenadeAbility = {};
    let chosenAspects = [];
    let chosenFragments = [];
    let chosenElement = "";

    // setup keyword vars
    let foundKeywords = [];
    let foundKeywordIndex = {};
    let keywordRegex = new RegExp();

    // testing a new keyword search vars
    let foundAbilityKeywordIndex = {};
    let foundMechanicKeywordIndex = {};
    let foundStatKeywordIndex = {};
    let abilityKeywordRegex = new RegExp();
    let mechanicKeywordRegex = new RegExp();
    

    // if there is a selected armor, weapon, or subclass, go ahead and grab keywords and set restrictions
    if (selArmor) {
        chosenArmor = db.armor.find(m => m.hash === selArmor);
        updateKeywordMatches(chosenArmor.perkDescription, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        if (selClass !== "") {
            chosenClass = chosenArmor.charClass.toLowerCase();
    
        }
    }
    if (selWeapon) {
        chosenWeapon = db.weapons.find(m => m.hash === selWeapon);
        updateKeywordMatches(chosenWeapon.perkDescription, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        updateKeywordMatches(chosenWeapon.catalystDescription, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    }
    if (selSubclass) {
        chosenSubclass = db.subclasses.find(m => m.hash === selSubclass);
        elementChoices = [chosenSubclass.element.toLowerCase()];
        if (selClass !== "") {
            chosenClass = chosenSubclass.charClass.toLowerCase();
        }
        chosenElement = chosenSubclass.element.toLowerCase();
    }

    if (!selArmor) {
        armorChoices = db.armor.filter(m => m.charClass.toLowerCase() === chosenClass);
        armorChoices = choiceFilterByKeywords(armorChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, 'perkDescription');
        
        if (armorChoices.length > 1) {
            chosenArmor = makeRandomChoice(armorChoices);
        }
        else if (armorChoices.length === 1) {
            chosenArmor = armorChoices[0];
        }
        updateKeywordMatches(chosenArmor.perkDescription, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    }
    if (!selWeapon) {
        weaponChoices = db.weapons;
        weaponChoices = choiceFilterByKeywords(weaponChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['perkDescription','catalystDescription']);
        if (weaponChoices.length > 1) {
            chosenWeapon = makeRandomChoice(weaponChoices);
        }
        else if (weaponChoices.length === 1) {
            chosenWeapon = weaponChoices[0];
        }
        updateKeywordMatches(chosenWeapon.perkDescription, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        updateKeywordMatches(chosenWeapon.catalystDescription, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    }
    if (!selSubclass) {
        let elementCountsIndex = elementChoices.reduce((index, word) => {
            // If the word exists in the index, add 1. Otherwise, start it at 1.
            index[word] = (index[word] || 0) + 1;
            
            // Return the updated index for the next loop iteration
            return index;
        }, {});

        let top2Elements = getMatchKeywords(filterAndSortIndex(elementCountsIndex, 2, 'elementCountsIndex'));
        if (top2Elements.includes('prism') && top2Elements.length > 1) {
            top2Elements = top2Elements.filter(m => m !== 'prism');
        }

        if (Object.keys(foundAbilityKeywordIndex).length > 0) {
            let topKeyword = new RegExp(`${getMatchKeywords(filterAndSortIndex(foundAbilityKeywordIndex, 1, 'foundAbilityAndKeywordIndex'))}?`);
            let matchedSubclasses = db.abilities.filter(m => topKeyword.test(m.name.toLowerCase()));
            top2Elements = matchedSubclasses.map(m => {
                return m.subclass.toLowerCase();
            });
        }

        subclassChoices = db.subclasses.filter(m => m.charClass.toLowerCase() === chosenClass && top2Elements.includes(m.element.toLowerCase()));
        if (top2Elements.length === 1) {
            chosenSubclass = subclassChoices.find(m => m.element.toLowerCase() === top2Elements[0]);
        }
        else {
            chosenSubclass =  makeRandomChoice(subclassChoices);
        }

        chosenElement = chosenSubclass.element.toLowerCase();
    }

    // Time to choose abilities
    classAbilityChoices = db.abilities.filter(m => {
        return (m.equipSlot === "class_abilities" && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
    });
    classAbilityChoices = choiceFilterByKeywords(classAbilityChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex ['name', 'description']);
    chosenClassAbility = makeRandomChoice(classAbilityChoices);
    updateKeywordMatches(chosenClassAbility.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    updateKeywordMatches(chosenClassAbility.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);

    jumpAbilityChoices = db.abilities.filter(m => {
        return (m.equipSlot === "movement" && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
    });
    jumpAbilityChoices = choiceFilterByKeywords(jumpAbilityChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['name','description']);
    chosenJumpAbility = makeRandomChoice(jumpAbilityChoices);
    updateKeywordMatches(chosenJumpAbility.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    updateKeywordMatches(chosenJumpAbility.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    
    superAbilityChoices = db.abilities.filter(m => {
        return (m.equipSlot === "supers" && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
    });
    superAbilityChoices = choiceFilterByKeywords(superAbilityChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['name','description']);
    chosenSuperAbility = makeRandomChoice(superAbilityChoices);
    updateKeywordMatches(chosenSuperAbility.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    updateKeywordMatches(chosenSuperAbility.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);

    meleeAbilityChoices = db.abilities.filter(m => {
        return (m.equipSlot === "melee" && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
    });
    meleeAbilityChoices = choiceFilterByKeywords(meleeAbilityChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['name','description']);
    chosenMeleeAbility = makeRandomChoice(meleeAbilityChoices);
    updateKeywordMatches(chosenMeleeAbility.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    updateKeywordMatches(chosenMeleeAbility.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);

    grenadeAbilityChoices = db.abilities.filter(m => {
        return (m.equipSlot === "grenades" && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
    });
    grenadeAbilityChoices = choiceFilterByKeywords(grenadeAbilityChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['name','description']);
    chosenGrenadeAbility = makeRandomChoice(grenadeAbilityChoices);
    updateKeywordMatches(chosenGrenadeAbility.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    updateKeywordMatches(chosenGrenadeAbility.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);

    // choose aspects
    for (i = 0; i < 2; i++) {
        if (chosenAspects.length > 0) {
            aspectChoices = db.abilities.filter(m => {
                return (["aspects","totems"].includes(m.equipSlot.toLowerCase()) && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase() && !chosenAspects.includes(m));
            });
        }
        else {
            aspectChoices = db.abilities.filter(m => {
                return (["aspects","totems"].includes(m.equipSlot.toLowerCase()) && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
            });
        }
        aspectChoices = choiceFilterByKeywords(aspectChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['name','description']);
        let chosenAspect = makeRandomChoice(aspectChoices);
        chosenAspects.push(chosenAspect);
        updateKeywordMatches(chosenAspect.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        updateKeywordMatches(chosenAspect.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    }
    
    let fragmentCapacity = chosenAspects.reduce((total, item) => total + item.energyCapacity, 0);

    for (i = 0; i < fragmentCapacity; i++) {
        if (chosenFragments.length > 0) {
            fragmentChoices = db.abilities.filter(m => {
                return (["fragments","trinkets"].includes(m.equipSlot) && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase() && !chosenFragments.includes(m));
            });
        }
        else {
            fragmentChoices = db.abilities.filter(m => {
                return (["fragments","trinkets"].includes(m.equipSlot) && ['shared',chosenClass].includes(m.charClass.toLowerCase()) && m.subclass.toLowerCase() === chosenSubclass.element.toLowerCase());
            });
        }
        fragmentChoices = choiceFilterByKeywords(fragmentChoices, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['name','description']);
        let chosenFragment = makeRandomChoice(fragmentChoices);
        chosenFragments.push(chosenFragment);
        updateKeywordMatches(chosenFragment.name, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        updateKeywordMatches(chosenFragment.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
    }

    // lets get that artifact configured
    if (Object.keys(foundKeywordIndex).length > 0) {
        let top5Keywords = getMatchKeywords(filterAndSortIndex(foundKeywordIndex, 10, 'foundKeywordIndex'));
        keywordRegex = buildRegexString(top5Keywords);
    }

    let weaponRegex = buildRegexString([chosenWeapon.itemType.toLowerCase()]);
    let artifactIndexes = {};
    db.artifacts.forEach(artifact => {
        let currentArtifactIndex = {};
        artifact.tier1Perks.forEach(perk => {
            currentArtifactIndex = getAllMatches(perk.description.toLowerCase(), keywordRegex, 1, currentArtifactIndex);
        });
        artifact.tier2Perks.forEach(perk => {
            currentArtifactIndex = getAllMatches(perk.description.toLowerCase(), keywordRegex, 1, currentArtifactIndex);
        });
        artifact.tier3Perks.forEach(perk => {
            currentArtifactIndex = getAllMatches(perk.description.toLowerCase(), keywordRegex, 1, currentArtifactIndex);
        });
        
        let score = totalMatches(currentArtifactIndex);
        
        // Assign the score directly to the hash key in the object
        artifactIndexes[artifact.hash] = score; 
    });
    
    let chosenArtifactHash = (getMatchKeywords(filterAndSortIndex(artifactIndexes, 1, 'artifactIndexes')))[0];
    let chosenArtifact = db.artifacts.find(m => m.hash === chosenArtifactHash);

    let chosenArtifactPerks = [];
    let availableArtifactPerks = [];
    let artifactPerkOptionsScore = {};
    let removePerkNames = [];
    let elementRegex = new RegExp("(void|solar|arc|stasis|strand|kinetic) weapon", "i");
    let weaponType = chosenWeapon.itemType;
    let weaponElement = chosenWeapon.element;
    
    // FIX: Spread operator so we don't nest arrays
    availableArtifactPerks.push(...chosenArtifact.tier1Perks);

    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (WEAPON_TYPE_REGEX.test(m.description)) {
            return weaponRegex.test(m.description);
        }
        return true;
    });
    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (PRECISION_REGEX.test(m.description) && NON_PRECISION_TYPE_REGEX.test(chosenWeapon.itemType.toLowerCase())) {
            return false;
        }
        return true;
    });
    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (elementRegex.test(m.description) ) {
            return false;
        }
        return true;
    });
    
    for (let i = 0; i < 2; i++) {
        let artifactPerkChoices = choiceFilterByKeywords(availableArtifactPerks, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['description']);
        let chosenArtifactPerk = makeRandomChoice(artifactPerkChoices);
        updateKeywordMatches(chosenArtifactPerk.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        chosenArtifactPerks.push(chosenArtifactPerk);
        removePerkNames.push(chosenArtifactPerk.name);
        
        availableArtifactPerks = availableArtifactPerks.filter(m => m.hash !== Number(chosenArtifactPerk.hash));
        delete artifactPerkOptionsScore[chosenArtifactPerk.hash];
    }
    
    // FIX: Fixed the typo '$'
    // 1. Create the Set of new names
    let tmpRemove = new Set(chosenArtifact.tier2Perks.map(obj => obj.name));
    let newArray = chosenArtifact.tier2Perks.filter(obj => !removePerkNames.includes(obj.name));

    // 2. Filter out the duplicates and combine in one step
    availableArtifactPerks = [
    ...availableArtifactPerks.filter(obj => !tmpRemove.has(obj.name)), 
    ...newArray
    ];
    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (WEAPON_TYPE_REGEX.test(m.description)) {
            return weaponRegex.test(m.description);
        }
        return true;
    });
    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (PRECISION_REGEX.test(m.description) && NON_PRECISION_TYPE_REGEX.test(chosenWeapon.itemType.toLowerCase())) {
            return false;
        }
        return true;
    });
    
    for (let i = 0; i < 3; i++) {
        let artifactPerkChoices = choiceFilterByKeywords(availableArtifactPerks, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['description']);
        let chosenArtifactPerk = makeRandomChoice(artifactPerkChoices);
        updateKeywordMatches(chosenArtifactPerk.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        chosenArtifactPerks.push(chosenArtifactPerk);
        removePerkNames.push(chosenArtifactPerk.name);
        
        availableArtifactPerks = availableArtifactPerks.filter(m => m.hash !== Number(chosenArtifactPerk.hash));
        delete artifactPerkOptionsScore[chosenArtifactPerk.hash];
    }
    
    // 1. Create the Set of new names
    tmpRemove = new Set(chosenArtifact.tier3Perks.map(obj => obj.name));
    newArray = chosenArtifact.tier3Perks.filter(obj => !removePerkNames.includes(obj.name));

    // 2. Filter out the duplicates and combine in one step
    availableArtifactPerks = [
    ...availableArtifactPerks.filter(obj => !tmpRemove.has(obj.name)), 
    ...newArray
    ];
    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (WEAPON_TYPE_REGEX.test(m.description)) {
            return weaponRegex.test(m.description);
        }
        return true;
    });
    availableArtifactPerks = availableArtifactPerks.filter(m => {
        if (PRECISION_REGEX.test(m.description) && NON_PRECISION_TYPE_REGEX.test(chosenWeapon.itemType.toLowerCase())) {
            return false;
        }
        return true;
    });
    
    for (let i = 0; i < 2; i++) {
        let artifactPerkChoices = choiceFilterByKeywords(availableArtifactPerks, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['description']);
        let chosenArtifactPerk = makeRandomChoice(artifactPerkChoices);
        updateKeywordMatches(chosenArtifactPerk.description, elementChoices, foundKeywordIndex, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundStatKeywordIndex);
        chosenArtifactPerks.push(chosenArtifactPerk);
        removePerkNames.push(chosenArtifactPerk.name);
        
        availableArtifactPerks = availableArtifactPerks.filter(m => m.hash !== Number(chosenArtifactPerk.hash));
        delete artifactPerkOptionsScore[chosenArtifactPerk.hash];
    }

    // TODO: might need to revisit this if the hashes aren't enough

    // armor sets next?
    let chosenArmorSetIndex = {};
    let armorSetOptionsScore = {};
    let chosenArmorSets = [];
    
    // FIX: Map arrays properly to avoid initial array nesting
    let availableArmorSets = db.sets.flatMap(set => set.setPerks).filter(m => m.requiredSetCount === 2);

    availableArmorSets = choiceFilterByKeywords(availableArmorSets, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['perkDescription']);
    let armorSetChoice = makeRandomChoice(availableArmorSets);
    chosenArmorSets.push(armorSetChoice);

    availableArmorSets = availableArmorSets.filter(m => m.sandboxPerkHash !== Number(armorSetChoice.sandboxPerkHash));

    let matchingSet = db.sets.find(set => set.setPerks.some(perk => perk.sandboxPerkHash === Number(armorSetChoice.sandboxPerkHash)));
    
    if (matchingSet) {
        let tier2Perks = matchingSet.setPerks.filter(m => m.requiredSetCount === 4);
        availableArmorSets.push(...tier2Perks);
    }

    availableArmorSets = choiceFilterByKeywords(availableArmorSets, foundAbilityKeywordIndex, foundMechanicKeywordIndex, foundKeywordIndex, ['perkDescription']);
    chosenArmorSets.push(makeRandomChoice(availableArmorSets));

    let chosenSetBonuses = Object.fromEntries(chosenArmorSets.map(obj => [db.sets.find(set => set.setPerks.some(perk => perk.sandboxPerkHash === Number(obj.sandboxPerkHash))).hash, obj.requiredSetCount]));


    let topStats = getMatchKeywords(filterAndSortIndex(foundStatKeywordIndex, 2, 'foundStatKeywordIndex'));
    const primaryStatKeyword = topStats[0].charAt(0).toUpperCase() + topStats[0].slice(1);
    const secondaryStatKeyword = topStats[1].charAt(0).toUpperCase() + topStats[1].slice(1);

    let primaryStat = "";
    let secondaryStat = "";
    ['health','melee','grenade','super','class','weapons'].forEach(i => {
        if (STAT_REGEX[i].test(primaryStatKeyword)) {
            primaryStat = i.charAt(0).toUpperCase() + i.slice(1);
        }
        if (STAT_REGEX[i].test(secondaryStatKeyword)) {
            secondaryStat = i.charAt(0).toUpperCase() + i.slice(1);
        }

    });

    console.log(chosenElement);

    return {
        class: CLASS_TYPES[chosenClass],
        element: chosenElement,
        armor: chosenArmor,
        armorPerks: chosenArmor,
        weapon: chosenWeapon,
        subclass: chosenSubclass,
        chosenSetBonuses: chosenSetBonuses,
        actualSetBonuses: chosenArmorSets,
        artifact: chosenArtifact,
        artifactPerks: chosenArtifactPerks,
        stats: { primary: primaryStat, secondary: secondaryStat },
        abilities: {
            chosenClassAbility: chosenClassAbility,
            chosenJumpAbility: chosenJumpAbility,
            chosenSuperAbility: chosenSuperAbility,
            chosenMeleeAbility: chosenMeleeAbility,
            chosenGrenadeAbility: chosenGrenadeAbility,
            chosenAspects: chosenAspects,
            chosenFragments: chosenFragments,
            fragmentCapacity: fragmentCapacity
        }
    };
};
async function loadManifest(setStatus) {
    try {
        setStatus("Connecting to Bungie Manifest...");
        let abilitiesDefUrl = "/manifests/abilities.json";
        let setDefUrl = "/manifests/armor_sets.json";
        let artifactsDefUrl = "/manifests/artifacts.json";
        let classItemPerkDefUrl = "/manifests/class_item_perks.json";
        let exoticArmorDefUrl = "/manifests/exotic_armor.json";
        let exoticWeaponDefUrl = "/manifests/exotic_weapons.json";
        let plugSetDefUrl = "/manifests/plug_sets.json";
        let subclassDefUrl = "/manifests/subclasses.json";

        setStatus("Downloading Databases (this may take a moment)...");
        const [abilitiesRes, setsRes, artifactsRes, classItemPerkRes, exoticArmorsRes, exoticWeaponsRes, plugSetsRes, subclassesRes] = await Promise.all([
            fetch(abilitiesDefUrl),
            fetch(setDefUrl),
            fetch(artifactsDefUrl),
            fetch(classItemPerkDefUrl),
            fetch(exoticArmorDefUrl),
            fetch(exoticWeaponDefUrl),
            fetch(plugSetDefUrl),
            fetch(subclassDefUrl)
        ]);
        
        const abilitiesData = await abilitiesRes.json();
        const setsData = await setsRes.json();
        const artifactsData = await artifactsRes.json();
        const classItemPerkData = await classItemPerkRes.json();
        const exoticArmorsData = await exoticArmorsRes.json();
        const exoticWeaponsData = await exoticWeaponsRes.json();
        const plugSetsData = await plugSetsRes.json();
        const subclassesData = await subclassesRes.json();

        setStatus("Processing Items & Sockets...");
        
        const parsedAbilities = [];
        const parsedArmorSets = [];
        const parsedArtifacts = [];
        const parsedArmors = [];
        const parsedWeapons = [];
        const parsedSubclasses = [];
        const parsedPlugSets = [];

        // LOAD EXOTIC ARMORS
        for (const hash in exoticArmorsData) {
            const item = exoticArmorsData[hash];

            const armorData = {
                hash: String(item.hash),
                name: item.name,
                icon: item.icon,
                equipSlot: item.equipSlot,
                charClass: item.charClass,
                perkDescription: item.perkDescription
            };

            parsedArmors.push(armorData);
        }

        // LOAD EXOTIC WEAPONS
        for (const hash in exoticWeaponsData) {
            const item = exoticWeaponsData[hash];

            const weaponData = {
                hash: String(item.hash),
                name: item.name,
                icon: item.icon,
                itemType: item.itemType,
                equipSlot: item.equipSlot,
                ammoType: item.ammoType,
                element: item.element,
                perkDescription: item.perkDescription,
                catalyst: item.catalyst,
                catalystDescription: item.catalystDescription
            };

            parsedWeapons.push(weaponData);
        }

        // LOAD SUBCLASSES
        for (const hash in subclassesData) {
            const item = subclassesData[hash];

            const subclassData = {
                hash: String(item.hash),
                name: item.name,
                icon: item.icon,
                charClass: item.charClass,
                element: item.element,
                traitIds: item.traitIds,
                sockets: item.sockets
            };

            parsedSubclasses.push(subclassData);
        }

        // LOAD ABILITIES
        for (const hash in abilitiesData) {
            const item = abilitiesData[hash];

            const abilityData = {
                hash: String(item.hash),
                name: item.name,
                description: item.description,
                icon: item.icon,
                itemType: item.itemType,
                charClass: item.charClass,
                subclass: item.subclass,
                equipSlot: item.equipSlot,
                energyCapacity: item.energyCapacity
            };

            parsedAbilities.push(abilityData);
        }

        // LOAD THE ARTIFACTS
        for (const hash in artifactsData) {
            const item = artifactsData[hash];

            const artifactData = {
                hash: String(item.hash),
                name: item.name,
                icon: item.icon ? item.icon : "",
                description: item.description || "",
                seasonNumber: item.seasonNumber,
                tier1Perks: item.tier1Perks,
                tier2Perks: item.tier2Perks,
                tier3Perks: item.tier3Perks
            };

            parsedArtifacts.push(artifactData);
        }

        // LOAD SET ARMOR
        for (const hash in setsData) {
            const item = setsData[hash];

            const armorSetData = {
                hash: String(item.hash),
                name: item.name,
                setPerks: item.setPerks
            };

            parsedArmorSets.push(armorSetData);
        }

        // LOAD PLUG SETS
        for (const hash in plugSetsData) {
            const item = plugSetsData[hash];

            const plugSetData = {
                hash: String(item.hash),
                reusablePlugItems: item.reusablePlugItems
            };
        }

        return { weapons: parsedWeapons, armor: parsedArmors, subclasses: parsedSubclasses, abilities: parsedAbilities, sets: parsedArmorSets, artifacts: parsedArtifacts, plugSets: parsedPlugSets };
    } catch (err) {
        throw new Error("Error loading manifest. " + err.message);
    }
}
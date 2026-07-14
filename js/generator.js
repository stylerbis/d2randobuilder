const generateBuild = (db, selClass, selArmor, selWeapon, selSubclass, selArtifact) => {
    const pickFromScoredList = (scoredList, topN = 3) => {
        if (!scoredList || scoredList.length === 0) return null;
        scoredList.forEach(i => i._rand = Math.random());
        scoredList.sort((a, b) => {
            if (b.score === a.score) return b._rand - a._rand;
            return b.score - a.score;
        });
        
        if (scoredList[0].score >= 1000) {
            const required = scoredList.filter(i => i.score >= 1000);
            return required[Math.floor(Math.random() * required.length)].item;
        }

        const topScore = scoredList[0].score;
        let validList = scoredList.filter(i => topScore > 0 ? i.score >= topScore * 0.4 : i.score === topScore); 
        if (!validList || validList.length === 0) validList = [scoredList[0]];
        
        let poolSize = Math.min(topN, validList.length);
        const topPool = validList.slice(0, poolSize);
        
        return topPool[Math.floor(Math.random() * topPool.length)].item;
    };

    const getKeywordWeight = (kw) => {
        if (db.abilityNames && db.abilityNames.has(kw)) return 10;
        if (db.weaponTypes && db.weaponTypes.has(kw)) return 5;
        if (['solar', 'void', 'arc', 'stasis', 'strand', 'prismatic', 'kinetic', 'neutral', 'primary', 'special', 'heavy'].includes(kw)) return 5;
        return 2;
    };

    const getPerkScore = (perk) => {
        let score = 0;
        const text = perk.desc.replace(/[-]/g, ' ').toLowerCase(); 
        
        let mentionsOtherWeapons = false;
        let mentionsChosenWeapon = false;
        let abilityElementMismatch = false;
        let precisionMismatch = false;

        if (chosenWeapon && chosenWeapon.weaponType && db.weaponTypes) {
            db.weaponTypes.forEach(wt => {
                if (!wt) return;
                const safeWt = wt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp('(?:\\b(\\w+)\\W+)?(?:\\b(\\w+)\\W+)?(?:\\b(\\w+)\\W+)?\\b' + safeWt + 's?\\b', 'gi');
                let match, foundWt = false, fitsOurWeapon = false;
                
                while ((match = regex.exec(text)) !== null) {
                    foundWt = true;
                    const words = [match[1], match[2], match[3]].map(w => w ? w.toLowerCase() : "");
                    const elements = ['solar', 'void', 'arc', 'stasis', 'strand', 'kinetic'];
                    const precedingElements = words.filter(w => elements.includes(w));
                    
                    if (wt === chosenWeapon.weaponType) {
                        if (precedingElements.length === 0 || precedingElements.includes(chosenWeapon.damageType)) fitsOurWeapon = true;
                    }
                }

                if (foundWt) {
                    if (wt === chosenWeapon.weaponType && fitsOurWeapon) mentionsChosenWeapon = true;
                    else mentionsOtherWeapons = true;
                }
            });
        }

        let demandedWeaponElements = [];
        ['kinetic', 'solar', 'void', 'arc', 'stasis', 'strand'].forEach(el => {
            if (new RegExp('\\b' + el + '\\b(?:\\s+or\\s+\\w+)?(?:\\s+and\\s+\\w+)?\\s+(?:damage\\s+)?(?:weapons?|final blows?|kills?|hits?)\\b', 'i').test(text)) demandedWeaponElements.push(el);
        });

        if (demandedWeaponElements.length > 0) {
            if (chosenWeapon && !demandedWeaponElements.includes(chosenWeapon.damageType)) mentionsOtherWeapons = true;
            else mentionsChosenWeapon = true;
        }

        let demandedAbilityElements = [];
        ['solar', 'void', 'arc', 'stasis', 'strand'].forEach(el => {
            if (new RegExp('\\b' + el + '\\b\\s+(?:damage\\s+)?(?:grenades?|melees?|super|abilities|ability)\\b', 'i').test(text)) demandedAbilityElements.push(el);
        });

        if (demandedAbilityElements.length > 0) {
            const activeElements = new Set([dominantElement]);
            if (superAbil && superAbil.elementConstraint && superAbil.elementConstraint !== 'neutral' && superAbil.elementConstraint !== 'prismatic') activeElements.add(superAbil.elementConstraint);
            if (grenade && grenade.elementConstraint && grenade.elementConstraint !== 'neutral' && grenade.elementConstraint !== 'prismatic') activeElements.add(grenade.elementConstraint);
            if (melee && melee.elementConstraint && melee.elementConstraint !== 'neutral' && melee.elementConstraint !== 'prismatic') activeElements.add(melee.elementConstraint);
            if (classAbil && classAbil.elementConstraint && classAbil.elementConstraint !== 'neutral' && classAbil.elementConstraint !== 'prismatic') activeElements.add(classAbil.elementConstraint);
            
            if (demandedAbilityElements.some(el => activeElements.has(el))) score += 50;
            else abilityElementMismatch = true;
        }

        if (precisionRegex.test(text)) {
            if (chosenWeapon && nonPrecisionTypes.includes(chosenWeapon.weaponType)) precisionMismatch = true;
        }

        activeKeywords.forEach(kw => {
            if (new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text)) score += getKeywordWeight(kw) * 1.5;
        });

        if (mentionsChosenWeapon) score += 25; 
        else if (mentionsOtherWeapons) score -= 1000; 
        
        if (abilityElementMismatch) score -= 1000;
        if (precisionMismatch) score -= 1000;

        return score;
    };

    const addKeywords = (text, activeKeywords, armorElements, isArmor = false) => {
        const lowerText = text.replace(/[-]/g, ' ').toLowerCase();
        Object.entries(KEYWORDS).forEach(([el, words]) => {
            words.forEach(word => {
                const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp('\\b' + safeWord + '\\b', 'i').test(lowerText)) {
                    activeKeywords.add(word);
                    if (['solar', 'void', 'arc', 'stasis', 'strand', 'prismatic'].includes(el)) {
                        activeKeywords.add(el);
                        if (isArmor) armorElements.add(el); 
                    }
                }
            });
        });

        if (db.weaponTypes) {
            db.weaponTypes.forEach(wt => {
                const safeWord = wt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp('\\b' + safeWord + 's?\\b', 'i').test(lowerText)) {
                    activeKeywords.add(wt);
                }
            });
        }
    };

    let finalClass = selClass !== "" ? parseInt(selClass) : Math.floor(Math.random() * 3);
    let chosenArmor;
    
    const exoticClassItems = ["stoicism", "relativism", "solipsism"];
    
    if (selArmor) {
        chosenArmor = db.armor.find(a => a.hash === selArmor);
        finalClass = chosenArmor.classType; 
    } else {
        let availableArmor = db.armor.filter(a => a.classType === finalClass);
        
        if (selWeapon || selSubclass) {
            const preSelWep = selWeapon ? db.weapons.find(w => w.hash === selWeapon) : null;
            const preSub = selSubclass ? db.subclasses.find(s => s.hash === selSubclass) : null;
            
            let scoredArmor = availableArmor.map(a => {
                let score = 0;
                const aText = (a.name + " " + a.desc + " " + (a.perkName || "")).replace(/[-]/g, ' ').toLowerCase();
                
                if (preSelWep && preSelWep.damageType) {
                    if (new RegExp('\\b' + preSelWep.damageType + '\\b(?:\\s+and\\s+\\w+)?\\s+(?:damage\\s+)?(?:weapons?|final blows?|kills?)', 'i').test(aText)) {
                        score += 100;
                    }
                }
                if (preSub && preSub.element !== 'neutral' && preSub.element !== 'prismatic') {
                    if (new RegExp('\\b' + preSub.element + '\\b', 'i').test(aText)) score += 100;
                }
                return { item: a, score };
            });
            
            if (preSub && preSub.element !== 'prismatic') {
                scoredArmor = scoredArmor.filter(sa => !exoticClassItems.some(n => sa.item.name.toLowerCase().includes(n)));
            }
            
            chosenArmor = pickFromScoredList(scoredArmor, 3) || availableArmor[Math.floor(Math.random() * availableArmor.length)];
        } else {
            chosenArmor = availableArmor[Math.floor(Math.random() * availableArmor.length)];
        }
    }
    
    let chosenArmorPerks = [];
    if (chosenArmor && exoticClassItems.some(n => chosenArmor.name.toLowerCase().includes(n)) && chosenArmor.perkColumns && chosenArmor.perkColumns.length >= 1) {
        const scoreCol = (col) => {
            if (!col || col.length === 0) return null;
            let scored = col.map(perk => {
                let score = 0;
                let text = (perk.name + " " + perk.desc).toLowerCase().replace(/[-]/g, ' ');
                if (selWeapon) {
                     const preSelWep = db.weapons.find(w => w.hash === selWeapon);
                     if (preSelWep && text.includes(preSelWep.damageType)) score += 50;
                }
                if (selSubclass) {
                     const preSub = db.subclasses.find(s => s.hash === selSubclass);
                     if (preSub && preSub.element !== 'neutral' && preSub.element !== 'prismatic' && text.includes(preSub.element)) score += 50;
                }
                return { item: perk, score };
            });
            return pickFromScoredList(scored, 3) || col[Math.floor(Math.random() * col.length)];
        };

        let p1 = scoreCol(chosenArmor.perkColumns[0]);
        let p2 = chosenArmor.perkColumns.length > 1 ? scoreCol(chosenArmor.perkColumns[1]) : null;
        
        if (p1 && p2 && p1.hash === p2.hash && chosenArmor.perkColumns[1].length > 1) {
            const filteredCol2 = chosenArmor.perkColumns[1].filter(p => p.hash !== p1.hash);
            p2 = scoreCol(filteredCol2);
        }

        chosenArmorPerks = [p1, p2].filter(Boolean); 
    }

    const armorText = (chosenArmor.name + " " + chosenArmor.desc + " " + (chosenArmor.perkName || "") + " " + chosenArmorPerks.map(p => p.name + " " + p.desc).join(" ")).toLowerCase();
    const armorFullText = armorText.replace(/[-]/g, ' ');

    const activeKeywords = new Set();
    const armorElements = new Set(); 

    addKeywords(armorFullText, activeKeywords, armorElements, true);

    let requiredWeaponElements = [];
    ['kinetic', 'solar', 'void', 'arc', 'stasis', 'strand'].forEach(el => {
        if (new RegExp('\\b' + el + '\\b(?:\\s+or\\s+\\w+)?(?:\\s+and\\s+\\w+)?\\s+(?:damage\\s+)?(?:weapons?|final blows?|kills?)', 'i').test(armorFullText)) {
            requiredWeaponElements.push(el);
        }
    });

    let targetElement = null;
    if (selSubclass) {
        const preSub = db.subclasses.find(s => s.hash === selSubclass);
        if (preSub && preSub.element !== 'neutral' && preSub.element !== 'prismatic') targetElement = preSub.element;
    }

    const precisionRegex = /\bprecision\b\s+(?:hits?|kills?|final blows?|damage)\b/i;
    const nonPrecisionTypes = ['grenade launcher', 'rocket launcher', 'sword', 'glaive', 'fusion rifle'];
    const armorNeedsPrecision = precisionRegex.test(armorFullText);

    let chosenWeapon;
    if (selWeapon) {
        chosenWeapon = db.weapons.find(w => w.hash === selWeapon);
    } else {
        let weaponPool = db.weapons;
        if (requiredWeaponElements.length > 0) {
            const filteredPool = weaponPool.filter(w => requiredWeaponElements.includes(w.damageType));
            if (filteredPool.length > 0) weaponPool = filteredPool;
        }

        let scoredWeapons = weaponPool.map(weapon => {
            const wText = (weapon.name + " " + (weapon.weaponType || "") + " " + weapon.desc + " " + (weapon.perkName || "")).replace(/[-]/g, ' ').toLowerCase();
            let score = 0;
            
            activeKeywords.forEach(kw => {
                const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp('\\b' + safeKw + '\\b', 'i').test(wText)) score += getKeywordWeight(kw);
            });
            
            if (requiredWeaponElements.includes(weapon.damageType)) {
                score += 1000; 
            } else if (targetElement && weapon.damageType === targetElement) {
                score += 20; 
            } else if (armorElements.has(weapon.damageType)) {
                score += 15; 
            }
            
            if (armorNeedsPrecision && nonPrecisionTypes.includes(weapon.weaponType)) {
                score -= 2000;
            }

            return { item: weapon, score };
        });
        
        chosenWeapon = pickFromScoredList(scoredWeapons, 4) || weaponPool[Math.floor(Math.random() * weaponPool.length)];
    }

    const weaponText = (chosenWeapon.name + " " + (chosenWeapon.weaponType || "") + " " + chosenWeapon.desc + " " + (chosenWeapon.perkName || "")).toLowerCase();
    addKeywords(weaponText, activeKeywords, armorElements, false);
    
    if (chosenWeapon.ammoType) {
        activeKeywords.add(chosenWeapon.ammoType);
    }
    
    let chosenSubclass;
    let dominantElement = "neutral";
    
    const isExoticClassItem = chosenArmor && exoticClassItems.some(n => chosenArmor.name.toLowerCase().includes(n));
    
    let forcedSubclasses = [];
    if (chosenArmor && !isExoticClassItem) {
        ['super', 'melee', 'grenade', 'classAbility', 'jump'].forEach(cat => {
            if (db.abilities[cat]) {
                db.abilities[cat].forEach(a => {
                    const aName = a.name.toLowerCase();
                    if (aName.length > 4 && new RegExp('\\b' + aName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s)?\\b', 'i').test(armorFullText)) {
                        let el = a.elementConstraint;
                        if (el !== 'neutral' && el !== 'prismatic') {
                            let subclassPool = db.subclasses.filter(s => s.classType === finalClass);
                            let nativeSub = subclassPool.find(s => s.element === el);
                            let prismSub = subclassPool.find(s => s.element === 'prismatic');
                            
                            if (nativeSub && !forcedSubclasses.includes(nativeSub)) forcedSubclasses.push(nativeSub);
                            if (prismSub && prismSub.validPlugs && prismSub.validPlugs.has(String(a.hash)) && !forcedSubclasses.includes(prismSub)) {
                                forcedSubclasses.push(prismSub);
                            }
                        }
                    }
                });
            }
        });

        ['solar', 'void', 'arc', 'stasis', 'strand'].forEach(el => {
            if (new RegExp('\\b' + el + '\\s+super\\b', 'i').test(armorFullText)) {
                let subclassPool = db.subclasses.filter(s => s.classType === finalClass);
                let nativeSub = subclassPool.find(s => s.element === el);
                let prismSub = subclassPool.find(s => s.element === 'prismatic');
                
                if (nativeSub && !forcedSubclasses.includes(nativeSub)) forcedSubclasses.push(nativeSub);
                
                if (prismSub && db.abilities.super) {
                    const hasMatchingPrismSuper = db.abilities.super.some(a => 
                        a.elementConstraint === el && 
                        prismSub.validPlugs && 
                        prismSub.validPlugs.has(String(a.hash))
                    );
                    if (hasMatchingPrismSuper && !forcedSubclasses.includes(prismSub)) {
                        forcedSubclasses.push(prismSub);
                    }
                }
            }
        });
        
        if (chosenArmor.name.toLowerCase().includes("getaway artist")) {
            let subclassPool = db.subclasses.filter(s => s.classType === finalClass);
            let arcSub = subclassPool.find(s => s.element === 'arc');
            let prismSub = subclassPool.find(s => s.element === 'prismatic');
            if (arcSub && !forcedSubclasses.includes(arcSub)) forcedSubclasses.push(arcSub);
            if (prismSub && !forcedSubclasses.includes(prismSub)) forcedSubclasses.push(prismSub);
        }
    }

    if (selSubclass) {
        chosenSubclass = db.subclasses.find(s => s.hash === selSubclass);
        if (isExoticClassItem && chosenSubclass && chosenSubclass.element !== 'prismatic') {
            chosenSubclass = null; 
        }
    } 
    
    if (!chosenSubclass) {
        let subclassPool = db.subclasses.filter(s => s.classType === finalClass);
        
        let scoredSubclasses = subclassPool.map(sub => {
            let score = 0;
            
            if (isExoticClassItem) {
                if (sub.element === 'prismatic') score += 5000;
                else score -= 5000;
            } else if (forcedSubclasses.includes(sub)) {
                score += 1000;
            }
            
            const evaluateElementSynergy = (el) => {
                let elScore = 0;
                    if (armorElements.has(el)) elScore += 200;
                    if (requiredWeaponElements.length > 0 && requiredWeaponElements.includes(el)) elScore += 50;
                    if (chosenWeapon && chosenWeapon.damageType !== 'kinetic' && chosenWeapon.damageType === el) elScore += 20;
                    if (activeKeywords.has(el)) elScore += 30;
                    
                    if (chosenWeapon && KEYWORDS[el]) {
                        let weaponKeywordHits = 0;
                        KEYWORDS[el].forEach(kw => {
                            const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            if (new RegExp('\\b' + safeKw + '\\b', 'i').test(weaponText)) {
                                weaponKeywordHits++;
                            }
                        });
                        if (weaponKeywordHits > 0) {
                            if (armorElements.has(el) || armorElements.has('prismatic')) {
                                elScore += weaponKeywordHits * 100;
                            } else {
                                elScore += weaponKeywordHits * 25;
                            }
                        }
                    }

                    activeKeywords.forEach(kw => {
                        const weight = getKeywordWeight(kw);
                        if (weight !== 10 && KEYWORDS[el] && KEYWORDS[el].includes(kw)) {
                            elScore += weight * 2;
                        }
                    });

                    return elScore;
                };

                if (sub.element === 'prismatic') {
                    let maxScore = evaluateElementSynergy('prismatic');
                    ['solar', 'void', 'arc', 'stasis', 'strand'].forEach(el => {
                        maxScore = Math.max(maxScore, evaluateElementSynergy(el));
                    });
                    score += maxScore;
                } else {
                    score += evaluateElementSynergy(sub.element);
                }
                
                return { item: sub, score };
            });
            
            chosenSubclass = pickFromScoredList(scoredSubclasses, 3) || subclassPool[Math.floor(Math.random() * subclassPool.length)];
        }

        if (chosenSubclass && chosenSubclass.element !== 'neutral') {
            dominantElement = chosenSubclass.element;
            activeKeywords.add(dominantElement);
        }

        const getValidAbilities = (category, sub) => {
            if (!sub || !db.abilities[category]) return [];
            return db.abilities[category].filter(a => {
                return Array.from(a.hashes).some(h => sub.validPlugs.has(h));
            });
        };

        const pickAbilityFromPool = (pool, kwsSet, category = null) => {
            if (!pool || pool.length === 0) return null;
            
            let scored = pool.map(abil => {
                let score = 0;
                const text = (abil.name + " " + abil.desc).replace(/[-]/g, ' ').toLowerCase();
                kwsSet.forEach(kw => { 
                    const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (new RegExp('\\b' + safeKw + '\\b', 'i').test(text)) score += getKeywordWeight(kw); 
                });
                
                if (new RegExp('\\b' + abil.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s)?\\b', 'i').test(armorFullText)) {
                    score += 1000;
                }

                if (category === 'super' && abil.elementConstraint && abil.elementConstraint !== 'neutral' && abil.elementConstraint !== 'prismatic') {
                    if (new RegExp('\\b' + abil.elementConstraint + '\\s+super\\b', 'i').test(armorFullText)) {
                        score += 1000;
                    }
                }
                
                return { item: abil, score };
            });
            
            const picked = pickFromScoredList(scored, 3);
            if (picked) {
                addKeywords((picked.name + " " + picked.desc), activeKeywords, armorElements);
            }
            return picked;
        };

        const superAbil = pickAbilityFromPool(getValidAbilities('super', chosenSubclass), activeKeywords, 'super');
        const classAbil = pickAbilityFromPool(getValidAbilities('classAbility', chosenSubclass), activeKeywords, 'classAbility');
        const jump = pickAbilityFromPool(getValidAbilities('jump', chosenSubclass), activeKeywords, 'jump');
        const melee = pickAbilityFromPool(getValidAbilities('melee', chosenSubclass), activeKeywords, 'melee');
        
        let grenadePool = getValidAbilities('grenade', chosenSubclass);
        
        const damageGrenadeRegexes = [
            /grenade final blow/i, 
            /grenade kill/i, 
            /grenade damage/i, 
            /damage .*? with .*? grenade/i, 
            /kills? .*? with .*? grenade/i, 
            /defeating .*? with .*? grenade/i,
            /final blows? .*? with .*? grenade/i
        ];

        const combinedText = (armorFullText + " " + weaponText).toLowerCase();
        const needsGrenadeDamage = damageGrenadeRegexes.some(regex => regex.test(combinedText));

        if (needsGrenadeDamage) {
            grenadePool = grenadePool.filter(g => g.name.toLowerCase() !== "healing grenade");
        }
        
        if (chosenArmor && chosenArmor.name.toLowerCase().includes("getaway artist")) {
            const arcGrenades = grenadePool.filter(g => g.elementConstraint === 'arc');
            if (arcGrenades.length > 0) {
                grenadePool = arcGrenades;
            }
        }

        const grenade = pickAbilityFromPool(grenadePool, activeKeywords, 'grenade');
        const isHealingGrenade = grenade && grenade.name.toLowerCase() === "healing grenade";

        let aspects = [];
        let fragmentCapacity = 0;
        const aspectPool = getValidAbilities('aspects', chosenSubclass);
        
        if (aspectPool.length > 0) {
            const scoredAspects = aspectPool.filter(abil => {
                if (!isHealingGrenade) return true;
                const text = (abil.name + " " + abil.desc).replace(/[-]/g, ' ').toLowerCase();
                return !damageGrenadeRegexes.some(r => r.test(text));
            }).map(abil => {
                let score = 0;
                const text = (abil.name + " " + abil.desc).replace(/[-]/g, ' ').toLowerCase();
                activeKeywords.forEach(kw => { 
                    const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (new RegExp('\\b' + safeKw + '\\b', 'i').test(text)) score += getKeywordWeight(kw) * 1.5; 
                });
                return { item: abil, score };
            });
            
            let aspect1 = pickFromScoredList(scoredAspects, 3);
            if (aspect1) {
                aspects.push(aspect1);
                fragmentCapacity += aspect1.fragmentSlots || 0;
                addKeywords((aspect1.name + " " + aspect1.desc), activeKeywords, armorElements);
                
                let remainingAspects = scoredAspects.filter(a => a.item.hash !== aspect1.hash);
                let aspect2 = pickFromScoredList(remainingAspects, 3);
                if (aspect2) {
                    aspects.push(aspect2);
                    fragmentCapacity += aspect2.fragmentSlots || 0;
                    addKeywords((aspect2.name + " " + aspect2.desc), activeKeywords, armorElements);
                }
            }
        }

        let fragments = [];
        const fragPool = getValidAbilities('fragments', chosenSubclass);
        if (fragPool.length > 0 && fragmentCapacity > 0) {
            const strictFrags = [];
            
            fragPool.forEach(abil => {
                const text = (abil.name + " " + abil.desc).replace(/[-]/g, ' ').toLowerCase();
                if (isHealingGrenade && damageGrenadeRegexes.some(r => r.test(text))) return;

                let score = 0;
                let hasKeywordMatch = false;

                activeKeywords.forEach(kw => {
                    const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (new RegExp('\\b' + safeKw + '\\b', 'i').test(text)) {
                        score += getKeywordWeight(kw);
                        hasKeywordMatch = true;
                    }
                });

                if (hasKeywordMatch) {
                    strictFrags.push({ item: abil, score });
                }
            });
            
            for (let i = 0; i < fragmentCapacity; i++) {
                let remainingFrags = strictFrags.filter(f => !fragments.some(sel => sel.hash === f.item.hash));
                let picked = pickFromScoredList(remainingFrags, 4); 
                if (picked) fragments.push(picked);
            }
        }

        let bestArtifact = null;
        let bestArtifactPerks = []; // Format: [{ socketIndex, perk }]

        if (db.artifacts && db.artifacts.length > 0) {
            let availableArtifacts = db.artifacts;
            if (selArtifact) {
                availableArtifacts = db.artifacts.filter(a => String(a.hash) === selArtifact);
            }

            const scoredArtifacts = availableArtifacts.map(artifact => {
                let currentArtifactScore = 0;
                let currentSelectedPerks = [];
                
                const t1Scored = artifact.tier1.map(p => ({ item: p, score: getPerkScore(p) }));
                const t2Scored = artifact.tier2.map(p => ({ item: p, score: getPerkScore(p) }));
                const t3Scored = artifact.tier3.map(p => ({ item: p, score: getPerkScore(p) }));

                let pool1 = [...t1Scored];
                let pool2 = [...t2Scored];
                let pool3 = [...t3Scored];
                let picked = [];

                const removePickedFromAll = (hash) => {
                    pool1 = pool1.filter(p => p.item.hash !== hash);
                    pool2 = pool2.filter(p => p.item.hash !== hash);
                    pool3 = pool3.filter(p => p.item.hash !== hash);
                };

                for (let i = 0; i < 2; i++) {
                    const selection = pickFromScoredList(pool1, 2);
                    if (selection) {
                        const scoredItem = pool1.find(p => p.item.hash === selection.hash);
                        picked.push({ item: selection, score: scoredItem?.score || 0 });
                        removePickedFromAll(selection.hash);
                    }
                }

                let combinedPool2 = [...pool1, ...pool2];
                for (let i = 0; i < 3; i++) {
                    const selection = pickFromScoredList(combinedPool2, 2);
                    if (selection) {
                        const scoredItem = combinedPool2.find(p => p.item.hash === selection.hash);
                        picked.push({ item: selection, score: scoredItem?.score || 0 });
                        removePickedFromAll(selection.hash);
                        combinedPool2 = combinedPool2.filter(p => p.item.hash !== selection.hash);
                    }
                }

                let combinedPool3 = [...pool1, ...pool2, ...pool3];
                for (let i = 0; i < 2; i++) {
                    const selection = pickFromScoredList(combinedPool3, 2);
                    if (selection) {
                        const scoredItem = combinedPool3.find(p => p.item.hash === selection.hash);
                        picked.push({ item: selection, score: scoredItem?.score || 0 });
                        removePickedFromAll(selection.hash);
                        combinedPool3 = combinedPool3.filter(p => p.item.hash !== selection.hash);
                    }
                }

                currentArtifactScore = picked.reduce((sum, p) => sum + p.score, 0);
                currentSelectedPerks = picked.map(p => p.item);

                return { 
                    item: { artifact, perks: currentSelectedPerks }, 
                    score: currentArtifactScore 
                };
            });

            if (scoredArtifacts.length > 0) {
                const chosenData = pickFromScoredList(scoredArtifacts, 2);
                if (chosenData) {
                    bestArtifact = chosenData.artifact;
                    bestArtifactPerks = chosenData.perks;
                }
            }
        }

        const statScores = {
            Health: finalClass === 0 ? 80 : 60,
            Class: finalClass === 1 ? 60 : 30,
            Melee: 20,
            Grenade: 20,
            Super: 10,
            Weapons: 20
        };

        const buildText = [
            armorFullText,
            superAbil?.desc, superAbil?.name,
            melee?.desc, melee?.name,
            grenade?.desc, grenade?.name,
            classAbil?.desc, classAbil?.name,
            ...aspects.map(a => a?.desc),
            ...fragments.map(f => f?.desc)
        ].filter(Boolean).join(" ").toLowerCase();

        const countOccurrences = (str, word) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            return (str.match(regex) || []).length;
        };

        const grenadeCount = countOccurrences(buildText, "grenade") + countOccurrences(buildText, "cure") + countOccurrences(buildText, "restoration");
        const meleeCount = countOccurrences(buildText, "melee") + countOccurrences(buildText, "glaive");
        const superCount = countOccurrences(buildText, "super");
        const classAbilCount = countOccurrences(buildText, "class ability") + countOccurrences(buildText, "dodge") + countOccurrences(buildText, "barricade") + countOccurrences(buildText, "rift") + countOccurrences(buildText, "overshield");
        const weaponCount = countOccurrences(buildText, "weapon") + countOccurrences(buildText, "precision") + countOccurrences(buildText, "ammo") + countOccurrences(buildText, "reload") + countOccurrences(buildText, "handling") + countOccurrences(buildText, "damage");
        const healthCount = countOccurrences(buildText, "orb of power") + countOccurrences(buildText, "orbs of power") + countOccurrences(buildText, "flinch") + countOccurrences(buildText, "shield");

        statScores.Grenade += (grenadeCount * 15);
        statScores.Melee += (meleeCount * 15);
        statScores.Super += (superCount * 10);
        statScores.Weapons += (weaponCount * 10);
        statScores.Class += (classAbilCount * 15);
        statScores.Health += (healthCount * 15);

        const sortedStats = Object.entries(statScores).sort((a, b) => b[1] - a[1]);
        const primaryStat = sortedStats[0][0];
        const secondaryStat = sortedStats[1][0];

        const scoredSets = db.sets.map(set => {
            let score = 0;
            activeKeywords.forEach(kw => {
                const safeKw = kw.replace(/[.*+?^${}]/g, '\$&');
                if (new RegExp('\\b' + safeKw + '\\b', 'i').test(set.synergyText.replace(/[-]/g, ' '))) {
                    score += getKeywordWeight(kw);
                }
            });
            return { item: set, score: score }; 
        });

        let finalSets = [];
        const prefers4Piece = Math.random() > 0.5;
        const setsWith4 = scoredSets.filter(s => s.item.has4);
        const setsWith2 = scoredSets.filter(s => s.item.has2);

        if (prefers4Piece && setsWith4.length > 0) {
            const chosen4Piece = pickFromScoredList(setsWith4, 4);
            if (chosen4Piece) {
                const perk2 = chosen4Piece.perks.find(p => p.count === 2);
                const perk4 = chosen4Piece.perks.find(p => p.count === 4);
                if (perk2) finalSets.push({ setName: chosen4Piece.name, perk: perk2, setDef: chosen4Piece });
                if (perk4) finalSets.push({ setName: chosen4Piece.name, perk: perk4, setDef: chosen4Piece });
            }
        } else if (setsWith2.length > 0) {
            const chosen1 = pickFromScoredList(setsWith2, 4);
            if (chosen1) {
                finalSets.push({ setName: chosen1.name, perk: chosen1.perks.find(p => p.count === 2), setDef: chosen1 });
                const remainingSets = setsWith2.filter(s => s.item.hash !== chosen1.hash);
                if (remainingSets.length > 0) {
                    const chosen2 = pickFromScoredList(remainingSets, 3);
                    if (chosen2) {
                        finalSets.push({ setName: chosen2.name, perk: chosen2.perks.find(p => p.count === 2), setDef: chosen2 });
                        }
                    }
                }
        }

        return {
            class: CLASS_TYPES[finalClass],
            element: dominantElement,
            armor: chosenArmor,
            armorPerks: chosenArmorPerks,
            weapon: chosenWeapon,
            subclass: chosenSubclass,
            actualSetBonuses: finalSets,
            artifact: bestArtifact,
            artifactPerks: bestArtifactPerks,
            stats: { primary: primaryStat, secondary: secondaryStat },
            abilities: {
                superAbil,
                grenade,
                melee,
                classAbil,
                jump,
                aspects,
                fragments,
                fragmentCapacity
            }
        };
    };
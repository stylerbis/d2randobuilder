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

const getKeywordWeight = (kw, db) => {
    if (db.abilityNames && db.abilityNames.has(kw)) return 10;
    if (db.weaponTypes && db.weaponTypes.has(kw)) return 5;
    if (['solar', 'void', 'arc', 'stasis', 'strand', 'prismatic', 'kinetic', 'neutral', 'primary', 'special', 'heavy'].includes(kw)) return 5;
    return 2;
};

const addKeywords = (text, activeKeywords, armorElements, db, isArmor = false) => {
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
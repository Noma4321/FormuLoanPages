const STATE_MAPPING = {
    'AK': 2, 'AL': 5, 'AR': 1, 'AZ': 5, 'CA': 6, 'CO': 6, 'CT': 2, 'DC': 2, 'DE': 2, 'FL': 2,
    'GA': 6, 'HI': 3, 'IA': 4, 'ID': 5, 'IL': 6, 'IN': 6, 'KS': 6, 'KY': 1, 'LA': 1, 'MA': 2,
    'MD': 6, 'ME': 4, 'MI': 5, 'MN': 6, 'MO': 5, 'MS': 1, 'MT': 6, 'NC': 6, 'ND': 4, 'NE': 6,
    'NH': 6, 'NJ': 2, 'NM': 5, 'NV': 1, 'NY': 2, 'OH': 6, 'OK': 6, 'OR': 5, 'PA': 1, 'RI': 1,
    'SC': 2, 'SD': 1, 'TN': 1, 'TX': 2, 'UT': 5, 'VA': 2, 'VT': 6, 'WA': 6, 'WI': 6, 'WV': 2, 'WY': 2
};

function engineerFeatures(userData) {
    let features = { ...userData };
    
    // Convert boolean/string checkboxes to numbers if not already
    features.IsBorrowerHomeowner = features.is_homeowner ? 1 : 0;
    features.CurrentlyInGroup = features.in_group ? 1 : 0;

    // Capitalize some names as they might be mapped in the python side
    features.Term = Number(features.term);
    features.LenderYield = Number(features.lender_yield);
    
    // Credit score mean
    features.CreditScoreMean = (Number(features.credit_score_lower) + Number(features.credit_score_upper)) / 2;
    
    // Avoid division by zero
    let monthlyIncome = Number(features.monthly_income) || 0.01;
    
    // Ratios
    features.LoanToIncome = Number(features.loan_amount) / monthlyIncome;
    features.PaymentToIncome = Number(features.monthly_payment) / monthlyIncome;
    
    // One-hot encode employment status
    let empStatus = features.employment_status || 'Other';
    const empStatuses = ['Full-time', 'Not employed', 'Other', 'Part-time', 'Retired', 'Self-employed'];
    for (let status of empStatuses) {
        features[`EmploymentStatus_${status}`] = (status === empStatus) ? 1 : 0;
    }
    
    // State clusters
    let state = features.state || 'CA';
    let stateCluster = STATE_MAPPING[state] || 6;
    for (let i = 1; i <= 6; i++) {
        features[`StateCluster_${i}`] = (i === stateCluster) ? 1 : 0;
    }
    
    // Group features (simplified for v1)
    features.LenderYield_mean_by_ListingCategory = 0.15;
    features.LenderYield_mean_by_Term = 0.15;
    
    return features;
}

function preprocessInput(userData) {
    // Engineer features
    let features = engineerFeatures(userData);
    return features;
}

function findAlternatives(userData) {
    let alternatives = [];
    
    let baseAmount = parseInt(userData.loan_amount);
    let baseTerm = parseInt(userData.term);
    let baseYield = parseFloat(userData.lender_yield);
    
    let amounts = [];
    for (let amt = baseAmount; amt > 900; amt -= 500) {
        amounts.push(amt);
    }
    let otherTerm = (baseTerm === 36) ? 60 : 36;
    let searchTerms = [otherTerm, baseTerm];
    
    let rawYields = [
        baseYield, baseYield + 0.01, baseYield + 0.02,
        baseYield + 0.03, baseYield - 0.01, baseYield - 0.02
    ];
    
    let yields = [];
    let seen = new Set();
    for (let y of rawYields) {
        let yRounded = Math.round(y * 10000) / 10000;
        if (0.001 <= yRounded && yRounded <= 0.36 && !seen.has(yRounded)) {
            yields.push(yRounded);
            seen.add(yRounded);
        }
    }
    
    let iterations = 0;
    for (let term of searchTerms) {
        for (let amount of amounts) {
            let sameComboCount = 0;
            for (let yld of yields) {
                iterations += 1;
                if (iterations > 600) {
                    break;
                }
                
                if (term === baseTerm && amount === baseAmount && Math.abs(yld - baseYield) < 0.001) {
                    continue;
                }
                
                let scenario = { ...userData };
                scenario.loan_amount = amount;
                scenario.term = term;
                scenario.lender_yield = yld;
                
                let ratio = (baseAmount > 0) ? amount / baseAmount : 1;
                let termFactor = (term > 0) ? baseTerm / term : 1;
                let rateFactor = (baseYield > 0) ? yld / baseYield : 1;
                scenario.monthly_payment = userData.monthly_payment * ratio * termFactor * rateFactor;
                
                try {
                    let dfHyp = preprocessInput(scenario);
                    let result = predictEnsemble(dfHyp);
                    
                    if (result.approved) {
                        alternatives.push({
                            amount: amount,
                            term: term,
                            yield: yld,
                            probability: result.probability
                        });
                        sameComboCount += 1;
                        
                        if (sameComboCount >= 2) break;
                        if (alternatives.length >= 3) return alternatives;
                    }
                } catch (e) {
                    continue;
                }
            }
        }
    }
    
    return alternatives;
}

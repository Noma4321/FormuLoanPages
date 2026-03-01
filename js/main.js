/**
 * FormuLoan v1 - Main JavaScript (Serverless Edge Edition)
 */

const EXAMPLE_STATUS_META = {
    0: { text: 'Completed', className: 'good' },
    1: { text: 'Current', className: 'current' },
    2: { text: 'Defaulted', className: 'bad' },
    default: { text: 'Chargedoff', className: 'charged' }
};

const EXAMPLE_CATEGORY_CLASS = {
    good: 'good',
    'near-approval': 'borderline',
    bad: 'bad'
};

const FORM_VALUE_FIELDS = [
    'employment_status',
    'employment_duration',
    'income_range',
    'monthly_income',
    'state',
    'credit_score_lower',
    'credit_score_upper',
    'debt_to_income',
    'current_credit_lines',
    'revolving_balance',
    'bankcard_utilization',
    'delinquencies_7y',
    'amount_delinquent',
    'public_records',
    'loan_amount',
    'term',
    'listing_category',
    'lender_yield',
    'monthly_payment',
    'total_inquiries',
    'inquiries_6m',
    'total_trades',
    'trades_never_delinquent',
    'available_credit',
    'investors',
    'investment_friends_amount',
    'recommendations'
];

const FORM_CHECKBOX_FIELDS = ['is_homeowner', 'in_group', 'income_verifiable'];

function getExampleStatusMeta(loanStatus) {
    return EXAMPLE_STATUS_META[loanStatus] || EXAMPLE_STATUS_META.default;
}

function getExampleCategoryClass(category) {
    return EXAMPLE_CATEGORY_CLASS[category] || EXAMPLE_CATEGORY_CLASS.bad;
}

function setFormData(data) {
    FORM_VALUE_FIELDS.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field] !== undefined) {
            element.value = data[field];
        }
    });

    FORM_CHECKBOX_FIELDS.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field] !== undefined) {
            element.checked = Boolean(data[field]);
        }
    });
}

function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    FORM_CHECKBOX_FIELDS.forEach(field => {
        data[field] = form.querySelector(`#${field}`).checked;
    });

    return data;
}

function getDiffMeta(diff, positiveClass = 'diff-pos', negativeClass = 'diff-neg') {
    return {
        className: diff > 0 ? positiveClass : (diff < 0 ? negativeClass : 'diff-neutral'),
        sign: diff > 0 ? '+' : ''
    };
}

function buildDecisionResultHtml(result) {
    const decision = result.approved
        ? {
            cardClass: 'result-approved',
            barClass: 'approved',
            title: '✅ LOAN APPROVED',
            message: 'This application meets our lending criteria.'
        }
        : {
            cardClass: 'result-rejected',
            barClass: 'rejected',
            title: '❌ LOAN REJECTED',
            message: 'This application does not meet our current lending criteria.'
        };

    return `
        <div class="result-card ${decision.cardClass}">
            <h3>${decision.title}</h3>
            <p>${decision.message}</p>
            <p><strong>Confidence in loan completion:${result.confidence_pct < 10 ? ' ' + result.confidence_pct + '%' : ''}</strong></p>
            <div class="probability-container">
                <div class="probability-bar-bg">
                    <div class="probability-bar ${decision.barClass}" style="width: ${result.confidence_pct}%">
                        ${result.confidence_pct >= 10 ? result.confidence_pct + '%' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildAlternativesHtml(alternatives) {
    if (!alternatives || alternatives.length === 0) {
        return `
            <div class="alternatives-section">
                <div class="result-card" style="background: #FFF3CD; border-left-color: #FFC107;">
                    <p><strong>⚠️ No alternatives found.</strong> Consider improving credit score or reducing debt-to-income ratio.</p>
                </div>
            </div>
        `;
    }

    const currentAmount = Number(document.getElementById('loan_amount').value);
    const currentTerm = Number(document.getElementById('term').value);
    const currentYield = Number(document.getElementById('lender_yield').value);

    let html = `
        <div class="alternatives-section">
            <h3 class="alternatives-title">💡 This loan could be approved with:</h3>
            <div class="alternatives-grid">
    `;

    alternatives.forEach((alt, index) => {
        const diffAmount = alt.amount - currentAmount;
        const diffTerm = alt.term - currentTerm;
        const diffYield = alt.yield - currentYield;

        const amountMeta = getDiffMeta(diffAmount);
        const termMeta = getDiffMeta(diffTerm);
        const yieldMeta = getDiffMeta(diffYield, 'diff-neg', 'diff-pos');

        let monthly_payment = alt.monthly_payment || 300;

        html += `
            <div class="alternative-card" onclick="loadAlternative(${alt.amount}, ${alt.term}, ${alt.yield}, ${monthly_payment})" style="cursor: pointer;">
                <h4>Alternative ${index + 1}</h4>
                <div class="alt-row">
                    <span class="alt-label">Amount:</span>
                    <span class="alt-value">
                        $${alt.amount.toLocaleString()} 
                        <span class="diff ${amountMeta.className}">(${amountMeta.sign}$${diffAmount.toLocaleString()})</span>
                    </span>
                </div>
                <div class="alt-row">
                    <span class="alt-label">Term:</span>
                    <span class="alt-value">
                        ${alt.term} months 
                        <span class="diff ${termMeta.className}">(${termMeta.sign}${diffTerm} mo)</span>
                    </span>
                </div>
                <div class="alt-row">
                    <span class="alt-label">Rate:</span>
                    <span class="alt-value">
                        ${(alt.yield * 100).toFixed(1)}% 
                        <span class="diff ${yieldMeta.className}">(${yieldMeta.sign}${(diffYield * 100).toFixed(1)}%)</span>
                    </span>
                </div>
                <div class="alt-confidence approved">
                    ✅ ${(alt.probability * 100).toFixed(1)}% confidence
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}

function getActiveExampleResult(data) {
    const activeCard = document.querySelector('.example-card.active');
    if (!activeCard) {
        return null;
    }

    const exampleId = parseInt(activeCard.getAttribute('data-id'), 10);
    const example = EXAMPLES.find(e => e.id === exampleId);

    if (!example || Number(data.loan_amount) !== example.data.loan_amount || Number(data.term) !== example.data.term) {
        return null;
    }

    return {
        approved: example.prediction ? example.prediction.approved : (example.category === 'good'),
        probability: example.prediction ? example.prediction.probability : (example.category === 'good' ? 0.95 : 0.05),
        confidence_pct: Math.round((example.prediction ? example.prediction.probability : 0.5) * 1000) / 10,
        alternatives: example.alternatives || []
    };
}

// Load examples into sidebar
function renderExamples() {
    const goodList = document.getElementById('good-examples-list');
    const nearList = document.getElementById('near-approval-examples-list');
    const badList = document.getElementById('bad-examples-list');

    const htmlByCategory = {
        good: '',
        'near-approval': '',
        bad: ''
    };

    EXAMPLES.forEach(example => {
        const tagsHtml = example.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        const statusMeta = getExampleStatusMeta(example.loan_status);
        const cardClass = getExampleCategoryClass(example.category);
        const categoryKey = htmlByCategory[example.category] !== undefined ? example.category : 'bad';

        let cardHtml = `
            <div class="example-card ${cardClass}" onclick="loadExample(${example.id})" data-id="${example.id}">
                <div class="card-header">
                    <h3>${example.name}</h3>
                    <span class="status-badge ${statusMeta.className}">${statusMeta.text}</span>
                </div>
                <p class="example-description">${example.description}</p>
                <div class="tags">${tagsHtml}</div>
            </div>
        `;

        htmlByCategory[categoryKey] += cardHtml;
    });

    goodList.innerHTML = htmlByCategory.good;
    nearList.innerHTML = htmlByCategory['near-approval'];
    badList.innerHTML = htmlByCategory.bad;
}

// Load example data into form
function loadExample(exampleId) {
    const example = EXAMPLES.find(e => e.id === exampleId);
    if (!example) return;

    setFormData(example.data);

    // Highlight active card
    document.querySelectorAll('.example-card').forEach(card => {
        card.classList.remove('active');
    });
    const card = document.querySelector(`[data-id="${exampleId}"]`);
    if(card) card.classList.add('active');
    
    // Show toast
    showToast(`✅ Loaded: ${example.name}`);
    
    // Scroll to top of form
    document.querySelector('.loan-form').scrollIntoView({ behavior: 'smooth' });
}

// Show toast notification
function showToast(message, isError = false) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (isError) {
        toast.style.background = '#DC3545';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Load alternative data into form
function loadAlternative(amount, term, rate, payment) {
    setFormData({
        loan_amount: amount,
        term: term,
        lender_yield: rate,
        monthly_payment: payment.toFixed(2)
    });
    
    showToast(`✅ Loaded Alternative: $${amount.toLocaleString()}`);
    document.querySelector('.loan-form').scrollIntoView({ behavior: 'smooth' });
}

// Display results
function displayResults(result) {
    const resultsSection = document.getElementById('resultsSection');
    let html = buildDecisionResultHtml(result);

    if (!result.approved) {
        html += buildAlternativesHtml(result.alternatives);
    }

    resultsSection.innerHTML = html;
    resultsSection.style.display = 'block';

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    renderExamples();

    const form = document.getElementById('loanForm');
    const submitBtn = form.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';

        const data = collectFormData(form);
        
        // Simulate a small network delay for UX
        setTimeout(() => {
            try {
                // Check if this matches a pre-calculated example to preserve quality
                let result = getActiveExampleResult(data);

                // If not an example or data changed, compute locally
                if (!result) {
                    let dfHyp = preprocessInput(data);
                    let prediction = predictEnsemble(dfHyp);
                    
                    result = {
                        approved: prediction.approved,
                        probability: prediction.probability,
                        confidence_pct: Math.round(prediction.probability * 1000) / 10
                    };
                    
                    if (!result.approved) {
                        result.alternatives = findAlternatives(data);
                    }
                }
                
                displayResults(result);
            } catch(err) {
                console.error('Prediction error:', err);
                showToast('❌ Error computing prediction locally', true);
            } finally {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        }, 500);
    });
});

/**
 * FormuLoan v1 - Main JavaScript (Serverless Edge Edition)
 */

// Load examples into sidebar
function renderExamples() {
    const goodList = document.getElementById('good-examples-list');
    const nearList = document.getElementById('near-approval-examples-list');
    const badList = document.getElementById('bad-examples-list');
    
    let goodHtml = '';
    let nearHtml = '';
    let badHtml = '';
    
    EXAMPLES.forEach(example => {
        let tagsHtml = example.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        let statusText = example.loan_status === 0 ? 'Completed' : (example.loan_status === 1 ? 'Current' : (example.loan_status === 2 ? 'Defaulted' : 'Chargedoff'));
        let statusClass = example.loan_status === 0 ? 'good' : (example.loan_status === 2 ? 'bad' : (example.loan_status === 3 ? 'charged' : 'current'));
        
        let cardHtml = `
            <div class="example-card ${example.category === 'good' ? 'good' : (example.category === 'near-approval' ? 'borderline' : 'bad')}" onclick="loadExample(${example.id})" data-id="${example.id}">
                <div class="card-header">
                    <h3>${example.name}</h3>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <p class="example-description">${example.description}</p>
                <div class="tags">${tagsHtml}</div>
            </div>
        `;

        if (example.category === 'good') {
            goodHtml += cardHtml;
        } else if (example.category === 'near-approval') {
            nearHtml += cardHtml;
        } else {
            badHtml += cardHtml;
        }
    });
    
    goodList.innerHTML = goodHtml;
    nearList.innerHTML = nearHtml;
    badList.innerHTML = badHtml;
}

// Load example data into form
function loadExample(exampleId) {
    const example = EXAMPLES.find(e => e.id === exampleId);
    if (!example) return;
    
    const data = example.data;
    
    // Borrower Information
    document.getElementById('employment_status').value = data.employment_status;
    document.getElementById('employment_duration').value = data.employment_duration;
    document.getElementById('income_range').value = data.income_range;
    document.getElementById('monthly_income').value = data.monthly_income;
    document.getElementById('is_homeowner').checked = data.is_homeowner;
    document.getElementById('state').value = data.state;
    document.getElementById('in_group').checked = data.in_group;
    
    // Credit Profile
    document.getElementById('credit_score_lower').value = data.credit_score_lower;
    document.getElementById('credit_score_upper').value = data.credit_score_upper;
    document.getElementById('debt_to_income').value = data.debt_to_income;
    document.getElementById('current_credit_lines').value = data.current_credit_lines;
    document.getElementById('revolving_balance').value = data.revolving_balance;
    document.getElementById('bankcard_utilization').value = data.bankcard_utilization;
    document.getElementById('delinquencies_7y').value = data.delinquencies_7y;
    document.getElementById('amount_delinquent').value = data.amount_delinquent;
    document.getElementById('public_records').value = data.public_records;
    
    // Loan Details
    document.getElementById('loan_amount').value = data.loan_amount;
    document.getElementById('term').value = data.term;
    document.getElementById('listing_category').value = data.listing_category;
    document.getElementById('lender_yield').value = data.lender_yield;
    document.getElementById('monthly_payment').value = data.monthly_payment;
    
    // Financial History
    document.getElementById('total_inquiries').value = data.total_inquiries;
    document.getElementById('inquiries_6m').value = data.inquiries_6m;
    document.getElementById('total_trades').value = data.total_trades;
    document.getElementById('trades_never_delinquent').value = data.trades_never_delinquent;
    document.getElementById('available_credit').value = data.available_credit;
    document.getElementById('investors').value = data.investors;
    document.getElementById('investment_friends_amount').value = data.investment_friends_amount;
    document.getElementById('recommendations').value = data.recommendations;
    document.getElementById('income_verifiable').checked = data.income_verifiable;
    
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
    document.getElementById('loan_amount').value = amount;
    document.getElementById('term').value = term;
    document.getElementById('lender_yield').value = rate;
    document.getElementById('monthly_payment').value = payment.toFixed(2);
    
    showToast(`✅ Loaded Alternative: $${amount.toLocaleString()}`);
    document.querySelector('.loan-form').scrollIntoView({ behavior: 'smooth' });
}

// Display results
function displayResults(result) {
    const resultsSection = document.getElementById('resultsSection');
    
    let html = '';
    
    if (result.approved) {
        html = `
            <div class="result-card result-approved">
                <h3>✅ LOAN APPROVED</h3>
                <p>This application meets our lending criteria.</p>
                <p><strong>Confidence in loan completion:${result.confidence_pct < 10 ? ' ' + result.confidence_pct + '%' : ''}</strong></p>
                <div class="probability-container">
                    <div class="probability-bar-bg">
                        <div class="probability-bar approved" style="width: ${result.confidence_pct}%">
                            ${result.confidence_pct >= 10 ? result.confidence_pct + '%' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="result-card result-rejected">
                <h3>❌ LOAN REJECTED</h3>
                <p>This application does not meet our current lending criteria.</p>
                <p><strong>Confidence in loan completion:${result.confidence_pct < 10 ? ' ' + result.confidence_pct + '%' : ''}</strong></p>
                <div class="probability-container">
                    <div class="probability-bar-bg">
                        <div class="probability-bar rejected" style="width: ${result.confidence_pct}%">
                            ${result.confidence_pct >= 10 ? result.confidence_pct + '%' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        if (result.alternatives && result.alternatives.length > 0) {
            html += `
                <div class="alternatives-section">
                    <h3 class="alternatives-title">💡 This loan could be approved with:</h3>
                    <div class="alternatives-grid">
            `;
            
            result.alternatives.forEach((alt, index) => {
                let currentAmount = Number(document.getElementById('loan_amount').value);
                let currentTerm = Number(document.getElementById('term').value);
                let currentYield = Number(document.getElementById('lender_yield').value);
                
                const diffAmount = alt.amount - currentAmount;
                const diffTerm = alt.term - currentTerm;
                const diffYield = alt.yield - currentYield;

                const amountClass = diffAmount > 0 ? 'diff-pos' : (diffAmount < 0 ? 'diff-neg' : 'diff-neutral');
                const amountSign = diffAmount > 0 ? '+' : '';
                
                const termClass = diffTerm > 0 ? 'diff-pos' : (diffTerm < 0 ? 'diff-neg' : 'diff-neutral');
                const termSign = diffTerm > 0 ? '+' : '';

                const yieldClass = diffYield > 0 ? 'diff-neg' : (diffYield < 0 ? 'diff-pos' : 'diff-neutral'); 
                const yieldSign = diffYield > 0 ? '+' : '';

                let monthly_payment = alt.monthly_payment || 300; // rough fallback if missing

                html += `
                    <div class="alternative-card" onclick="loadAlternative(${alt.amount}, ${alt.term}, ${alt.yield}, ${monthly_payment})" style="cursor: pointer;">
                        <h4>Alternative ${index + 1}</h4>
                        <div class="alt-row">
                            <span class="alt-label">Amount:</span>
                            <span class="alt-value">
                                $${alt.amount.toLocaleString()} 
                                <span class="diff ${amountClass}">(${amountSign}$${diffAmount.toLocaleString()})</span>
                            </span>
                        </div>
                        <div class="alt-row">
                            <span class="alt-label">Term:</span>
                            <span class="alt-value">
                                ${alt.term} months 
                                <span class="diff ${termClass}">(${termSign}${diffTerm} mo)</span>
                            </span>
                        </div>
                        <div class="alt-row">
                            <span class="alt-label">Rate:</span>
                            <span class="alt-value">
                                ${(alt.yield * 100).toFixed(1)}% 
                                <span class="diff ${yieldClass}">(${yieldSign}${(diffYield * 100).toFixed(1)}%)</span>
                            </span>
                        </div>
                        <div class="alt-confidence approved">
                            ✅ ${(alt.probability * 100).toFixed(1)}% confidence
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        } else {
            html += `
                <div class="alternatives-section">
                    <div class="result-card" style="background: #FFF3CD; border-left-color: #FFC107;">
                        <p><strong>⚠️ No alternatives found.</strong> Consider improving credit score or reducing debt-to-income ratio.</p>
                    </div>
                </div>
            `;
        }
    }
    
    resultsSection.innerHTML = html;
    resultsSection.style.display = 'block';
    
    setTimeout(() => {
        const bar = resultsSection.querySelector('.probability-bar');
        if (bar) {
            bar.style.width = bar.style.width;
        }
    }, 100);
    
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
        
        // Extract form data into JS object
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Checkboxes might be missing if unchecked
        data.is_homeowner = form.querySelector('#is_homeowner').checked;
        data.in_group = form.querySelector('#in_group').checked;
        data.income_verifiable = form.querySelector('#income_verifiable').checked;
        
        // Simulate a small network delay for UX
        setTimeout(() => {
            try {
                // Check if this matches a pre-calculated example to preserve quality
                const activeCard = document.querySelector('.example-card.active');
                let result = null;
                
                if (activeCard) {
                    const exampleId = parseInt(activeCard.getAttribute('data-id'));
                    const example = EXAMPLES.find(e => e.id === exampleId);
                    
                    // Simple check: if form values haven't changed much (we'll just use the ID check for simplicity)
                    // If the user just loaded an example and clicked analyze, give them the high-quality pre-calculated result
                    if (example && Number(data.loan_amount) === example.data.loan_amount && Number(data.term) === example.data.term) {
                        result = {
                            approved: example.prediction ? example.prediction.approved : (example.category === 'good'),
                            probability: example.prediction ? example.prediction.probability : (example.category === 'good' ? 0.95 : 0.05),
                            confidence_pct: Math.round((example.prediction ? example.prediction.probability : 0.5) * 1000) / 10,
                            alternatives: example.alternatives || []
                        };
                    }
                }

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

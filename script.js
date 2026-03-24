async function checkAnswer(answer) {
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const yesBtn = document.getElementById('yesBtn');
    const noBtn = document.getElementById('noBtn');
    
    // Show loading
    loadingDiv.classList.remove('hidden');
    yesBtn.disabled = true;
    noBtn.disabled = true;
    
    try {
        // Send answer to backend
        const response = await fetch('/api/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answer }),
        });

        if (!response.ok) {
            throw new Error('Failed to save answer');
        }

        // Show result message
        resultDiv.classList.remove('hidden', 'pity', 'good');
        
        if (answer === 'yes') {
            resultDiv.textContent = 'חבל מאוד';
            resultDiv.classList.add('pity');
        } else {
            resultDiv.textContent = 'טוב שכך';
            resultDiv.classList.add('good');
        }

        // Update statistics
        await updateStats();
    } catch (error) {
        console.error('Error:', error);
        resultDiv.classList.remove('hidden', 'pity', 'good');
        resultDiv.textContent = 'שגיאה בשמירה. נסה שוב.';
        resultDiv.classList.add('pity');
    } finally {
        loadingDiv.classList.add('hidden');
        yesBtn.disabled = false;
        noBtn.disabled = false;
    }
}

async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();
        
        document.getElementById('totalStats').textContent = stats.total || 0;
        document.getElementById('yesStats').textContent = stats.yes || 0;
        document.getElementById('noStats').textContent = stats.no || 0;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Load stats on page load
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    loadResponses();
    // Refresh stats every 5 seconds
    setInterval(updateStats, 5000);
    // Refresh responses every 10 seconds
    setInterval(loadResponses, 10000);
});

// Load all responses and display in table
async function loadResponses() {
    try {
        console.log('📡 Fetching responses...');
        const response = await fetch('/api/responses?limit=50');
        console.log('📝 Response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Response not OK:', response.statusText);
            throw new Error('Failed to fetch responses');
        }
        
        const result = await response.json();
        console.log('✅ Got data:', result);
        
        const tbody = document.getElementById('responsesTableBody');
        
        if (!result.data || result.data.length === 0) {
            console.log('ℹ️ No data found');
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">אין תשובות עדיין</td></tr>';
            return;
        }
        
        console.log('📊 Rendering', result.data.length, 'rows');
        tbody.innerHTML = result.data.map(row => `
            <tr>
                <td>${row.id}</td>
                <td>
                    <span class="answer-${row.answer}">
                        ${row.answer === 'yes' ? 'כן' : 'לא'}
                    </span>
                </td>
                <td>${new Date(row.created_at).toLocaleString('he-IL')}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-update" onclick="toggleUpdateMode(${row.id}, '${row.answer}')">
                            ${row.answer === 'yes' ? 'שנה ללא' : 'שנה לכן'}
                        </button>
                        <button class="btn-delete" onclick="deleteResponse(${row.id})">
                            מחק
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        console.log('✨ Table rendered!');
    } catch (error) {
        console.error('🔴 Error loading responses:', error);
        const tbody = document.getElementById('responsesTableBody');
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">שגיאה בטעינה: ${error.message}</td></tr>`;
    }
}

// Delete a response
async function deleteResponse(id) {
    if (!confirm('האם אתה בטוח שאתה רוצה למחוק את התשובה הזאת?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/answer/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete response');
        
        // Refresh table and stats
        loadResponses();
        updateStats();
    } catch (error) {
        console.error('Error deleting response:', error);
        alert('שגיאה במחיקה. נסה שוב.');
    }
}

// Update a response
async function toggleUpdateMode(id, currentAnswer) {
    const newAnswer = currentAnswer === 'yes' ? 'no' : 'yes';
    
    try {
        const response = await fetch(`/api/answer/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answer: newAnswer }),
        });
        
        if (!response.ok) throw new Error('Failed to update response');
        
        // Refresh table and stats
        loadResponses();
        updateStats();
    } catch (error) {
        console.error('Error updating response:', error);
        alert('שגיאה בעדכון. נסה שוב.');
    }
}
});

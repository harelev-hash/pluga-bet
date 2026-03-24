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
    // Refresh stats every 5 seconds
    setInterval(updateStats, 5000);
});

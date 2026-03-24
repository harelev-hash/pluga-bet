function checkAnswer() {
    const input = document.getElementById('nameInput').value.trim().toLowerCase();
    const resultDiv = document.getElementById('result');
    
    // Remove previous classes and hidden state
    resultDiv.classList.remove('hidden', 'pity', 'good');
    
    if (input === 'כן' || input === 'yes' || input === 'כן' || input === '') {
        // Answer is "yes"
        resultDiv.textContent = 'חבל מאוד';
        resultDiv.classList.add('pity');
    } else {
        // Answer is a different name or something else
        resultDiv.textContent = 'טוב שכך';
        resultDiv.classList.add('good');
    }
    
    // Clear input
    document.getElementById('nameInput').value = '';
    document.getElementById('nameInput').focus();
}

// Allow checking answer by pressing Enter
document.getElementById('nameInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        checkAnswer();
    }
});

function checkAnswer(answer) {
    const resultDiv = document.getElementById('result');
    
    // Remove previous classes and hidden state
    resultDiv.classList.remove('hidden', 'pity', 'good');
    
    if (answer === 'yes') {
        // Answer is "yes"
        resultDiv.textContent = 'חבל מאוד';
        resultDiv.classList.add('pity');
    } else {
        // Answer is "no"
        resultDiv.textContent = 'טוב שכך';
        resultDiv.classList.add('good');
    }
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

let scores = [];
const submissionInterval = 30 * 1000; // 30 seconds in milliseconds

// Endpoint to submit score
app.post('/submit-score', (req, res) => {
    const { account, score } = req.body;
    const currentTime = Date.now();

    console.log('Received score submission:', { account, score, currentTime });

    // Check if the account has submitted a score within the interval
    const lastSubmission = scores.find(entry => entry.account === account);
    if (lastSubmission && (currentTime - lastSubmission.timestamp) < submissionInterval) {
        console.log(`Submission rejected: last submission was ${currentTime - lastSubmission.timestamp} ms ago`);
        return res.status(429).json({ message: 'You can only submit one score every 30 seconds.' });
    }

    // Update or add the new score
    if (lastSubmission) {
        lastSubmission.score = score;
        lastSubmission.timestamp = currentTime;
    } else {
        scores.push({ account, score, timestamp: currentTime });
    }

    scores = scores.sort((a, b) => b.score - a.score).slice(0, 10); // Keep top 10 scores

    console.log('Score submitted successfully:', { account, score });
    res.status(200).json({ message: 'Score submitted successfully' });
});

// Endpoint to fetch leaderboard
app.get('/leaderboard', (req, res) => {
    res.status(200).json(scores);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

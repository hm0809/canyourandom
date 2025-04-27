document.getElementById('analyze-btn').addEventListener('click', function () {
    const input = document.getElementById('number-input').value.replace(/[^0-9]/g, '');
    if (input.length !== 125) {
      alert('Please enter exactly 125 digits.');
      return;
    }
  
    //this.style.display = 'none';
    document.getElementById('results').style.display = 'flex';
  
    const metrics = analyzeRandomness(input);
    renderMetrics(metrics);
  });
  
  // Delegated event for dynamically created metric keys
  document.addEventListener('click', function (e) {
    const popup = document.getElementById('metric-popup');
    const overlay = document.getElementById('overlay');
  
    if (e.target.classList.contains('metric-key')) {
      const desc = e.target.getAttribute('data-description');
      showPopup(desc);
    } else if (!popup.contains(e.target) && popup.style.display === 'flex') {
      popup.style.display = 'none';
      overlay.style.display = 'none';
    }
  });
  
  function renderMetrics(metrics) {
    const simple = document.getElementById('simple-metrics');
    const complex = document.getElementById('complex-metrics');
    simple.innerHTML = '';
    complex.innerHTML = '';
  
    const showMetric = (key, value, section, description) => {
      const div = document.createElement('div');
      div.className = 'metric';
      div.innerHTML = `<span class="metric-key" data-description="${description}">${key}:</span> <span class="metric-value">${value}</span>`;
      section.appendChild(div);
    };
    if(metrics.randomnessScore >= 89) {
        showMetric('Randomness Score', metrics.randomnessScore + '% : Probably Computer Generated', simple, 'Final score combining all pattern detection metrics.');
    } else {
        showMetric('Randomness Score', metrics.randomnessScore + '% : Probably Human Generated', simple, 'Final score combining all pattern detection metrics.');
    }
    showMetric('Favoured Numbers', metrics.favouredNumbers.join(', '), simple, 'Digits that appeared more frequently than expected.');
    showMetric('Favoured Keyboard Side', metrics.keyboardBias, simple, 'Bias toward left or right side of QWERTY keyboard.');
    showMetric('Repeated Sequences', metrics.repeatedSequences.join(', '), simple, '3+ digit patterns repeated 3 or more times.');
  
    showMetric('Entropy', `${metrics.entropy.toFixed(2)} / 3.32`, complex, 'Shannon entropy measures digit unpredictability.');
    showMetric('Lempel-Ziv Complexity', metrics.lzc, complex, 'Estimate of string complexity via Lempel-Ziv.');
    showMetric('Chi-Square Score', metrics.chiSquare.toFixed(2), complex, 'Deviation from expected frequency.');
    showMetric('Periodicity', metrics.periodicityPenalty.toFixed(2), complex, 'When rolling both hands on opposite ends of the keyboard from 1 and from 0, into the middle of the keyboard.');
    showMetric('Alternation Rate', `${metrics.alternationRate.toFixed(2)}%`, simple, 'Rate of digit change.');
    showMetric('Run Count', metrics.runCount, complex, 'Number of ascending or descending sequences of 4+ digits.');
  }
  
  function showPopup(text) {
    const popup = document.getElementById('metric-popup');
    const overlay = document.getElementById('overlay');
    const textDis = document.getElementById('metric-text');
    textDis.textContent = text;
    popup.style.display = 'flex';
    overlay.style.display = 'block';
  }
  
  function analyzeRandomness(input) {
    const freq = Array(10).fill(0);
    const transitions = Array.from({ length: 10 }, () => Array(10).fill(0));
    const repeatedSequences = new Map();
    let alternation = 0;
    let last = '';
    let runCount = 0;
    let prevDigit = null;
    let favSide = { left: 0, right: 0 };
    const sideMap = { 0: 'right', 1: 'left', 2: 'left', 3: 'left', 4: 'left', 5: 'left', 6: 'right', 7: 'right', 8: 'right', 9: 'right' };
  
    const total = input.length;
  
    // Track runs of length >= 4
    for (let i = 0; i <= input.length - 4; i++) {
      const seq = input.slice(i, i + 4).split('').map(Number);
      const isAsc = seq.every((d, j, a) => j === 0 || d === a[j - 1] + 1);
      const isDesc = seq.every((d, j, a) => j === 0 || d === a[j - 1] - 1);
      if (isAsc || isDesc) runCount++;
    }
  
    for (let i = 0; i < input.length; i++) {
      const d = +input[i];
      freq[d]++;
      if (prevDigit !== null) {
        if (d !== prevDigit) alternation++;
        transitions[prevDigit][d]++;
      }
      prevDigit = d;
      favSide[sideMap[d]]++;
    }
  
    for (let len = 3; len <= 5; len++) {
      for (let i = 0; i <= input.length - len; i++) {
        const sub = input.substring(i, i + len);
        if (!repeatedSequences.has(sub)) {
          let count = 0;
          for (let j = 0; j <= input.length - len; j++) {
            if (input.substring(j, j + len) === sub) count++;
          }
          if (count >= 3) repeatedSequences.set(sub, count);
        }
      }
    }
  
    let entropy = 0;
    freq.forEach(f => {
      if (f) entropy -= (f / total) * Math.log2(f / total);
    });
  
    let chiSquare = 0;
    const expected = total / 10;
    const stdDev = Math.sqrt(expected);
    let chiPenalty = 0;
    freq.forEach(f => {
      chiSquare += Math.pow(f - expected, 2) / expected;
      if (Math.abs(f - expected) > stdDev) chiPenalty++;
    });
  
    let periodicityPenalty = 0;

    for (let d = 0; d <= 9; d++) {
        const indices = [];
        for (let i = 0; i < input.length; i++) {
            if (+input[i] === d) indices.push(i);
        }
        if (indices.length < 4) continue;

        let consistentSkips = 0;
        for (let j = 1; j < indices.length; j++) {
            const diff = indices[j] - indices[j - 1];
            if (diff >= 6 && diff <= 9){
                consistentSkips++;
            }
        }

        const ratio = consistentSkips / (indices.length - 1);
        if (ratio >= 0.70){
            periodicityPenalty += 1;
        }
    }
  
    const lzc = (() => {
      const seen = new Set();
      let c = '', count = 0;
      for (let i = 0; i < input.length; i++) {
        c += input[i];
        if (c.length >= 3 && !seen.has(c)) {
          seen.add(c);
          count++;
          c = '';
        }
      }
      return count;
    })();
  
    const alternationRate = (alternation / (total - 1)) * 100;
  
    // Scoring
    let score = 0;
  
    // Entropy: 10% (Probably useless)
    score += Math.min(1, entropy / 3.32) * 10;
  
    // Repeated substrings: 20%, lose 2.5% for each repeated sequence of len >=3 appearing 3+ times
    const repeatPenalty = Math.min(8, repeatedSequences.size) * 2.5;
    score += 20 - repeatPenalty;
  
    // LZC: 15%, gain 0.5% per unique chunk (min len 3), up to 15%
    score += Math.min(15, lzc * 0.5);
  
    // Periodicity (Tracks whether for 66% of a numbers appearance if it has an interval between 6-9): 15%
    score += 15 - (periodicityPenalty * 1.5);
  
    // Runs: 20%, lose 2.5% for each run of 4+ digits
    const runPenalty = Math.min(8, runCount) * 2.5;
    score += 20 - runPenalty;
  
    // Alternation: 5%
    score += Math.min(1, alternationRate / 100) * 5;
  
    // Chi-square: 10%, lose 1% for each digit out of 1 std dev
    score += Math.max(0, 10 - chiPenalty);
  
    // QWERTY Bias: 5%
    score += 5;
  
    const randomnessScore = Math.round(Math.max(0, Math.min(100, score)));
  
    const favouredNumbers = freq
      .map((val, idx) => ({ val, idx }))
      .filter(obj => obj.val > (total * 0.15))
      .map(obj => obj.idx);
  
    const keyboardBias = favSide.left > favSide.right ? `Left (${Math.round(favSide.left / total * 100)}%)` : `Right (${Math.round(favSide.right / total * 100)}%)`;
  
    return {
      randomnessScore,
      entropy,
      lzc,
      chiSquare,
      periodicityPenalty,
      alternationRate,
      runCount,
      favouredNumbers,
      repeatedSequences: Array.from(repeatedSequences.entries()).map(([seq, count]) => `${seq} (*${count})`),
      keyboardBias,
    };
  }

  function testBulk(randNumbers) {
    // Test all 125 digit numbers in the array and log the results in a table, one column should show "computer generated" or "human generated" if the score is above or below 90% respectively.
    const results = randNumbers.map(num => {
      const metrics = analyzeRandomness(num);
      return {
        number: num,
        randomnessScore: metrics.randomnessScore,
        generatedBy: metrics.randomnessScore > 90 ? 'Computer Generated' : 'Human Generated',
      };
    });
    console.table(results);
  }

  // Call the bulk random number test function with a randomly generated array of 125 digit numbers
  const randNumbers = Array.from({ length: 100 }, () => {
    return Array.from({ length: 125 }, () => Math.floor(Math.random() * 10)).join('');
  });
  testBulk(randNumbers);
  
  document.getElementById('number-input').addEventListener('input', () => {
    const cleanInput = document.getElementById('number-input').value.replace(/[^0-9]/g, '');
    document.getElementById('char-counter').textContent = `${cleanInput.length} / 125`;
  });
  

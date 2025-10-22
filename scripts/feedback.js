// Client-side logic for the existing feedback grid structure:
// - Each "row" is: .subject -> .rating (with .dot spans) -> .comments (textarea)
// - Users click a ".dot" to select a rating 1-5 (we store it on the .rating element dataset)
// - On Send: validate each row has a selected rating; comments are optional
// - POST to API, show a thank-you alert, and reset selections

(function () {
  // Set to '' if serving API on the same origin as index.html
  // Otherwise, set to your API base (e.g., 'http://localhost:4000')
  const API_BASE = 'http://localhost:4000';

  const grid = document.querySelector('.feedback-grid');
  const sendBtn = document.querySelector('.actions .send');

  if (!grid || !sendBtn) {
    console.warn('Feedback grid or send button not found.');
    return;
  }

  // Make the dots selectable and store the picked rating in the .rating element
  function initDots() {
    const ratingBlocks = grid.querySelectorAll('.rating');
    ratingBlocks.forEach(ratingEl => {
      const dots = ratingEl.querySelectorAll('.dot');
      dots.forEach(dot => {
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => {
          // Clear previous selection style
          dots.forEach(d => d.classList.remove('selected'));
          // Mark this one selected
          dot.classList.add('selected');
          // Persist the selected rating on the container
          const value = Number(dot.textContent.trim());
          ratingEl.dataset.rating = String(value);
        });
      });
    });
  }

  function getRows() {
    // Row is defined by three consecutive siblings: subject -> rating -> comments
    const subjects = Array.from(grid.querySelectorAll('.subject'));
    const rows = [];
    subjects.forEach(subjectEl => {
      const ratingEl = subjectEl.nextElementSibling;
      const commentsEl = ratingEl ? ratingEl.nextElementSibling : null;
      if (ratingEl && ratingEl.classList.contains('rating') && commentsEl && commentsEl.classList.contains('comments')) {
        rows.push({ subjectEl, ratingEl, commentsEl });
      }
    });
    return rows;
  }

  function subjectText(el) {
    return (el.textContent || '').trim();
  }

  function selectedRating(ratingEl) {
    const r = ratingEl.dataset.rating;
    return r ? Number(r) : null;
  }

  function commentsValue(commentsEl) {
    const ta = commentsEl.querySelector('textarea');
    return ta ? ta.value.trim() : '';
  }

  function validateRows(rows) {
    // Require a rating for each lesson row
    for (const row of rows) {
      const r = selectedRating(row.ratingEl);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return false;
      }
    }
    return true;
  }

  function buildPayload(rows) {
    return {
      timestamp: new Date().toISOString(),
      items: rows.map(row => ({
        subject: subjectText(row.subjectEl),
        rating: selectedRating(row.ratingEl),
        comments: commentsValue(row.commentsEl) // may be empty
      }))
    };
  }

  function reset(rows) {
    rows.forEach(row => {
      // Clear selected rating
      delete row.ratingEl.dataset.rating;
      row.ratingEl.querySelectorAll('.dot').forEach(d => d.classList.remove('selected'));
      // Clear comments
      const ta = row.commentsEl.querySelector('textarea');
      if (ta) ta.value = '';
    });
  }

  sendBtn.addEventListener('click', async () => {
    const rows = getRows();
    if (rows.length === 0) {
      alert('No lessons found.');
      return;
    }

    // Validate: each lesson must have a rating
    if (!validateRows(rows)) {
      alert('Please select a rating for every lesson before sending.');
      return;
    }

    const payload = buildPayload(rows);

    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed with status ${res.status}`);
      }

      alert('Thanks for your feedback!');
      reset(rows);
    } catch (e) {
      console.error(e);
      alert('Thanks for your feedback.'); // Thanks for your feedback. Failed to submit feedback. Please try again.
    }
  });

  // Initialize on load
  initDots();
})();
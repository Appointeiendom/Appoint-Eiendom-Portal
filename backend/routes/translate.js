const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// POST /api/translate — translate an array of texts to target language
router.post('/', protect, async (req, res) => {
  const { texts, target } = req.body; // target: 'en' or 'no'
  if (!texts || !Array.isArray(texts) || !target) {
    return res.status(400).json({ message: 'texts[] and target are required' });
  }

  try {
    const { translate } = await import('@vitalets/google-translate-api');
    const results = await Promise.all(
      texts.map(async (text) => {
        if (!text || !text.trim()) return text;
        try {
          const result = await translate(text, { to: target });
          return result.text;
        } catch {
          return text; // fall back to original if translation fails
        }
      })
    );
    res.json({ translations: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

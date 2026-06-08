import { Router } from 'express';
import { getAllDestinations, getDestinationById } from '../dal/destinations.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { isInternational, maxPrice, season } = req.query;
    const filters = {};
    if (isInternational !== undefined) filters.isInternational = isInternational;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (season) filters.season = season;
    const destinations = await getAllDestinations(filters);
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch destinations.', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const destination = await getDestinationById(req.params.id);
    if (!destination) return res.status(404).json({ error: 'Destination not found.' });
    res.json(destination);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch destination.', details: err.message });
  }
});

export default router;

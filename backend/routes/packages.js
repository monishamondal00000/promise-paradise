import { Router } from 'express';
import { getAllPackages, getPackageById } from '../dal/packages.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { destinationId, maxPrice, minGuests } = req.query;
    const filters = {};
    if (destinationId) filters.destinationId = destinationId;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (minGuests) filters.minGuests = minGuests;
    const packages = await getAllPackages(filters);
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch packages.', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pkg = await getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found.' });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch package.', details: err.message });
  }
});

export default router;

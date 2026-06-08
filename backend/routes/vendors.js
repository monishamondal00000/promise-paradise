import { Router } from 'express';
import { getAllVendors, getVendorById } from '../dal/vendors.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category, destinationId } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (destinationId) filters.destinationId = destinationId;
    const vendors = await getAllVendors(filters);
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendors.', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vendor = await getVendorById(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendor.', details: err.message });
  }
});

export default router;

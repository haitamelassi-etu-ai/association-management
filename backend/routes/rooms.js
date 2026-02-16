const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/auth');

// Get all rooms
router.get('/', protect, async (req, res) => {
  try {
    const { status, etage, type } = req.query;
    let query = {};

    if (status) query.status = status;
    if (etage !== undefined) query.etage = Number(etage);
    if (type) query.type = type;

    const rooms = await Room.find(query)
      .populate('occupants.beneficiaire', 'nom prenom')
      .sort({ numero: 1 });

    res.json({ success: true, data: rooms, count: rooms.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get room stats
router.get('/stats', protect, async (req, res) => {
  try {
    const rooms = await Room.find().populate('occupants.beneficiaire', 'nom prenom');

    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacite, 0);
    const currentOccupants = rooms.reduce((sum, r) => {
      return sum + r.occupants.filter(o => !o.dateSortie).length;
    }, 0);

    const statusCounts = {
      disponible: rooms.filter(r => r.status === 'disponible').length,
      occupee: rooms.filter(r => r.status === 'occupee').length,
      partielle: rooms.filter(r => r.status === 'partielle').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length,
      hors_service: rooms.filter(r => r.status === 'hors_service').length
    };

    const typeCounts = {};
    rooms.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupants / totalCapacity) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalRooms,
        totalCapacity,
        currentOccupants,
        availableBeds: totalCapacity - currentOccupants,
        occupancyRate,
        statusCounts,
        typeCounts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a room
router.post('/', protect, authorize('admin', 'responsable'), async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update a room
router.put('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('occupants.beneficiaire', 'nom prenom');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Assign a beneficiary to a room
router.post('/:id/assign', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }

    const currentOccupants = room.occupants.filter(o => !o.dateSortie).length;
    if (currentOccupants >= room.capacite) {
      return res.status(400).json({ success: false, message: 'Chambre pleine' });
    }

    room.occupants.push({
      beneficiaire: req.body.beneficiaire,
      dateEntree: req.body.dateEntree || new Date()
    });

    // Update status based on occupancy
    const newCount = currentOccupants + 1;
    if (newCount >= room.capacite) {
      room.status = 'occupee';
    } else if (newCount > 0) {
      room.status = 'partielle';
    }

    await room.save();
    const populated = await Room.findById(room._id).populate('occupants.beneficiaire', 'nom prenom');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Remove a beneficiary from a room
router.post('/:id/remove', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }

    const occupant = room.occupants.find(
      o => o.beneficiaire.toString() === req.body.beneficiaire && !o.dateSortie
    );

    if (!occupant) {
      return res.status(404).json({ success: false, message: 'Occupant non trouvé' });
    }

    occupant.dateSortie = new Date();

    const currentOccupants = room.occupants.filter(o => !o.dateSortie).length;
    if (currentOccupants === 0) {
      room.status = 'disponible';
    } else if (currentOccupants < room.capacite) {
      room.status = 'partielle';
    }

    await room.save();
    const populated = await Room.findById(room._id).populate('occupants.beneficiaire', 'nom prenom');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete a room
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Chambre non trouvée' });
    }
    res.json({ success: true, message: 'Chambre supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
